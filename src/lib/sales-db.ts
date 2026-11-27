/**
 * sales-db.ts — Acesso ao Cloud Firestore para o módulo de Vendas (RF05/RF06).
 *
 * Implementa a gravação atômica via runTransaction:
 * 1. Gravação do documento na coleção `vendas`;
 * 2. Atualização atômica do estoque de cada produto em `produtos`;
 * 3. Criação de registros de movimentação de auditoria na coleção `estoque`;
 * 4. Tratamento de concorrência com verificação prévia de saldo disponível.
 *
 * A9: cada produto envolvido gera UMA movimentação com a sua variação
 * líquida (entrada ou saída) e ID versionado `{produtoId}_{tipo}_{versão}`,
 * o mesmo formato das movimentações avulsas. Assim a regra de alteração de
 * saldo é única para Gerente e Funcionário — o que corrige a venda pelo
 * Gerente no PDV, antes bloqueada porque as regras procuravam
 * `{produtoId}_saida` e o PDV gravava `{vendaId}_{produtoId}_saida`.
 */

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { db } from '../firebase'
import { buildMovementId, movementFromDelta } from './estoque'
import { MovementValidationError, productVersionMillis } from './estoque-db'
import {
  calculateSaleStockDeltas,
  validateStockAvailability,
  type Sale,
  type SaleItem,
  type TransactionType,
} from './sales'

/**
 * Erro específico lançado quando o estoque em banco não atende à quantidade
 * solicitada no momento do fechamento da transação (concorrência entre operadores).
 */
export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InsufficientStockError'
  }
}

/**
 * Registra uma nova venda, troca ou devolução na coleção `vendas` do Cloud Firestore,
 * orquestrando o abatimento ou reposição de estoque em uma única transação atômica.
 *
 * @param sale Dados da venda (itens, subtotal, desconto, total, tipo, itensDevolvidos?)
 * @param usuarioId UID do operador autenticado no Firebase Auth
 * @returns ID do documento de venda criado no Firestore
 */
export async function registrarVenda(
  sale: Omit<Sale, 'id' | 'data' | 'usuarioId'>,
  usuarioId: string,
): Promise<string> {
  const stockDeltas = calculateSaleStockDeltas(sale)

  return await runTransaction(db, async (transaction) => {
    // -------------------------------------------------------------------------
    // 1. LEITURAS PREVENTIVAS (Firestore exige que todas as leituras precedam as escritas)
    // -------------------------------------------------------------------------
    const productDocsToUpdate: Array<{
      ref: DocumentReference
      produtoId: string
      novoEstoque: number
      versao: number
      netDelta: number
    }> = []

    for (const [prodId, delta] of stockDeltas.entries()) {
      const prodRef = doc(db, 'produtos', prodId)
      const prodSnap = await transaction.get(prodRef)

      if (!prodSnap.exists()) {
        throw new Error(`Produto "${delta.nome}" (ID: ${prodId}) não encontrado.`)
      }

      const data = prodSnap.data()
      const currentStock = (data.estoque as number) ?? 0
      const validation = validateStockAvailability(currentStock, delta)

      if (!validation.ok) {
        throw new InsufficientStockError(validation.error)
      }

      productDocsToUpdate.push({
        ref: prodRef,
        produtoId: prodId,
        novoEstoque: validation.novoEstoque,
        versao: productVersionMillis(data),
        netDelta: delta.netDelta,
      })
    }

    // -------------------------------------------------------------------------
    // 2. ESCRITAS ATÔMICAS INDIVISÍVEIS
    // -------------------------------------------------------------------------
    // 2.1 Criação do documento da venda em `vendas`
    const novaVendaRef = doc(collection(db, 'vendas'))
    const salePayload: Record<string, unknown> = {
      itens: sale.itens,
      subtotal: sale.subtotal,
      desconto: sale.desconto,
      total: sale.total,
      tipo: sale.tipo,
      data: serverTimestamp(),
      usuarioId,
    }
    if (sale.operadorNome) {
      salePayload.operadorNome = sale.operadorNome
    }
    if (sale.itensDevolvidos && sale.itensDevolvidos.length > 0) {
      salePayload.itensDevolvidos = sale.itensDevolvidos
    }

    transaction.set(novaVendaRef, salePayload)

    // 2.2 Para cada produto: movimentação líquida versionada + novo saldo.
    // Variação líquida zero (troca de uma peça por outra idêntica) não altera
    // o saldo e não gera movimentação.
    for (const { ref, produtoId, novoEstoque, versao, netDelta } of productDocsToUpdate) {
      const movimento = movementFromDelta(netDelta)
      if (!movimento) continue

      transaction.set(doc(db, 'estoque', buildMovementId(produtoId, movimento.tipo, versao)), {
        produtoId,
        tipo: movimento.tipo,
        quantidade: movimento.quantidade,
        data: serverTimestamp(),
        usuarioId,
        vendaId: novaVendaRef.id,
      })

      transaction.update(ref, {
        estoque: novoEstoque,
        atualizadoEm: serverTimestamp(),
      })
    }

    return novaVendaRef.id
  })
}

/**
 * Converte erros do Firestore ou da transação em mensagens legíveis pelo operador de caixa.
 */
export function describeSalesError(error: unknown): string {
  if (error instanceof InsufficientStockError || error instanceof MovementValidationError) {
    return error.message
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'Você não tem permissão para registrar vendas.'
      case 'unavailable':
        return 'Servidor indisponível. Verifique sua conexão com a internet.'
      case 'not-found':
        return 'Registro de venda ou produto não encontrado.'
      case 'aborted':
        return 'A transação foi interrompida devido a concorrência. Tente novamente.'
    }
  }

  return 'Não foi possível concluir a transação de venda. Tente novamente.'
}

// ---------------------------------------------------------------------------
// Leitura em tempo real do Histórico de Vendas (Restrito ao Gerente)
// ---------------------------------------------------------------------------

/**
 * Escuta a coleção `vendas` em tempo real, ordenada por data decrescente.
 * Restrita ao perfil gerente pelas regras de segurança do Firestore (RF01/RF06).
 */
export function subscribeSales(
  onData: (sales: Sale[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'vendas'), orderBy('data', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const sales: Sale[] = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          itens: (data.itens || []) as SaleItem[],
          itensDevolvidos: data.itensDevolvidos as SaleItem[] | undefined,
          subtotal: data.subtotal as number,
          desconto: data.desconto as number,
          total: data.total as number,
          tipo: data.tipo as TransactionType,
          data: data.data instanceof Timestamp ? data.data.toDate() : new Date(),
          usuarioId: data.usuarioId as string,
          operadorNome: data.operadorNome as string | undefined,
        }
      })
      onData(sales)
    },
    onError,
  )
}

