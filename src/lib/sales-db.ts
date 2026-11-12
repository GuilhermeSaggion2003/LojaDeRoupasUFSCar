/**
 * sales-db.ts — Acesso ao Cloud Firestore para o módulo de Vendas (RF05/RF06).
 *
 * Implementa a gravação atômica via runTransaction:
 * 1. Gravação do documento na coleção `vendas`;
 * 2. Atualização atômica do estoque de cada produto em `produtos`;
 * 3. Criação de registros de movimentação de auditoria na coleção `estoque`;
 * 4. Tratamento de concorrência com verificação prévia de saldo disponível.
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
  type Unsubscribe,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { db } from '../firebase'
import {
  calculateSaleStockDeltas,
  validateStockAvailability,
  type Sale,
  type SaleItem,
  type TransactionType,
} from './sales'

const vendasRef = collection(db, 'vendas')
const produtosRef = collection(db, 'produtos')
const estoqueRef = collection(db, 'estoque')

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
      ref: ReturnType<typeof doc>
      novoEstoque: number
    }> = []

    for (const [prodId, delta] of stockDeltas.entries()) {
      const prodRef = doc(produtosRef, prodId)
      const prodSnap = await transaction.get(prodRef)

      if (!prodSnap.exists()) {
        throw new Error(`Produto "${delta.nome}" (ID: ${prodId}) não encontrado.`)
      }

      const currentStock = (prodSnap.data().estoque as number) ?? 0
      const validation = validateStockAvailability(currentStock, delta)

      if (!validation.ok) {
        throw new InsufficientStockError(validation.error)
      }

      productDocsToUpdate.push({
        ref: prodRef,
        novoEstoque: validation.novoEstoque,
      })
    }

    // -------------------------------------------------------------------------
    // 2. ESCRITAS ATÔMICAS INDIVISÍVEIS
    // -------------------------------------------------------------------------
    // 2.1 Criação do documento da venda em `vendas`
    const novaVendaRef = doc(vendasRef)
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

    // 2.2 Atualização do estoque dos produtos em `produtos`
    for (const { ref, novoEstoque } of productDocsToUpdate) {
      transaction.update(ref, {
        estoque: novoEstoque,
        atualizadoEm: serverTimestamp(),
      })
    }

    // 2.3 Criação dos registros de auditoria na coleção `estoque`
    // Para saídas (itens vendidos ou saídos na troca)
    if (sale.tipo === 'venda' || sale.tipo === 'troca') {
      for (const item of sale.itens) {
        const movDocRef = doc(estoqueRef, `${novaVendaRef.id}_${item.produtoId}_saida`)
        transaction.set(movDocRef, {
          produtoId: item.produtoId,
          tipo: 'saida',
          quantidade: item.quantidade,
          data: serverTimestamp(),
          usuarioId,
          vendaId: novaVendaRef.id,
        })
      }
    }

    // Para entradas (itens devolvidos em devolução ou na troca)
    if (sale.tipo === 'devolucao') {
      for (const item of sale.itens) {
        const movDocRef = doc(estoqueRef, `${novaVendaRef.id}_${item.produtoId}_entrada`)
        transaction.set(movDocRef, {
          produtoId: item.produtoId,
          tipo: 'entrada',
          quantidade: item.quantidade,
          data: serverTimestamp(),
          usuarioId,
          vendaId: novaVendaRef.id,
        })
      }
    } else if (sale.tipo === 'troca' && sale.itensDevolvidos) {
      for (const item of sale.itensDevolvidos) {
        const movDocRef = doc(estoqueRef, `${novaVendaRef.id}_${item.produtoId}_entrada`)
        transaction.set(movDocRef, {
          produtoId: item.produtoId,
          tipo: 'entrada',
          quantidade: item.quantidade,
          data: serverTimestamp(),
          usuarioId,
          vendaId: novaVendaRef.id,
        })
      }
    }

    return novaVendaRef.id
  })
}

/**
 * Converte erros do Firestore ou da transação em mensagens legíveis pelo operador de caixa.
 */
export function describeSalesError(error: unknown): string {
  if (error instanceof InsufficientStockError) {
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
  const q = query(vendasRef, orderBy('data', 'desc'))

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

