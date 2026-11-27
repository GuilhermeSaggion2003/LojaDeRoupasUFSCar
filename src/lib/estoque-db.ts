/**
 * estoque-db.ts — Acesso ao Firestore para o módulo de Estoque.
 *
 * Padrão seguido: mesmo de products-db.ts (serverTimestamp, onSnapshot,
 * mensagens de erro amigáveis).
 *
 * Estratégia de atomicidade com as regras de segurança (revisada na A9):
 *   Uma transação lê o produto, recalcula o saldo a partir do valor atual
 *   do banco e grava, juntas, a movimentação e o novo saldo. O ID da
 *   movimentação é versionado — `{produtoId}_{tipo}_{atualizadoEm em ms}`
 *   (ver buildMovementId) — e as regras usam getAfter() para conferir que a
 *   alteração de saldo tem a movimentação correspondente. Como a versão
 *   muda a cada escrita, movimentações seguidas do mesmo tipo não colidem
 *   (o ID fixo `{produtoId}_{tipo}` usado até a S8 fazia a segunda virar
 *   update, negado pelas regras).
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
  buildMovementId,
  calculateNewBalance,
  validateMovement,
  type MovementType,
  type StockMovement,
} from './estoque'

/** Erro de validação de negócio detectado ao ler o saldo atual no banco. */
export class MovementValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MovementValidationError'
  }
}

/**
 * Extrai a versão (atualizadoEm em ms) de um documento de produto.
 * Lança erro se o campo estiver ausente: sem ele não é possível montar o ID
 * versionado que as regras exigem.
 */
export function productVersionMillis(data: Record<string, unknown>): number {
  const ts = data.atualizadoEm as { seconds?: unknown; nanoseconds?: unknown } | null | undefined
  if (ts && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
    // Timestamp.toMillis() do SDK web NÃO arredonda (o timestamp do servidor
    // tem microssegundos e o resultado sairia fracionário). As regras usam
    // toMillis() inteiro, então truncamos os nanossegundos aqui também.
    return ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1_000_000)
  }
  throw new MovementValidationError('Produto sem data de atualização válida. Recarregue a página e tente novamente.')
}

// ---------------------------------------------------------------------------
// Leitura em tempo real
// ---------------------------------------------------------------------------

/**
 * Escuta a coleção `estoque` em tempo real, ordenada por data decrescente.
 * Retorna a função para cancelar o listener (useEffect cleanup).
 */
export function subscribeMovements(
  onData: (movements: StockMovement[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'estoque'), orderBy('data', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const movements: StockMovement[] = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          produtoId: data.produtoId as string,
          tipo: data.tipo as MovementType,
          quantidade: data.quantidade as number,
          // Firestore retorna Timestamp; convertemos para Date.
          data: data.data instanceof Timestamp ? data.data.toDate() : new Date(),
          usuarioId: data.usuarioId as string,
          // Vínculo com a transação do PDV (usado no relatório de movimentação, A8)
          ...(typeof data.vendaId === 'string' ? { vendaId: data.vendaId } : {}),
        }
      })
      onData(movements)
    },
    onError,
  )
}

// ---------------------------------------------------------------------------
// Escrita — movimentação atômica
// ---------------------------------------------------------------------------

/**
 * Registra uma movimentação avulsa de estoque (RF04) e atualiza o saldo do
 * produto numa transação atômica.
 *
 * O saldo é recalculado a partir do valor ATUAL do banco (não do que a tela
 * exibia), evitando sobrescrever movimentações concorrentes.
 *
 * @param produtoId   ID do produto no Firestore
 * @param tipo        'entrada' | 'saida'
 * @param quantidade  Inteiro positivo
 * @param usuarioId   UID do utilizador autenticado (request.auth.uid)
 * @returns O novo saldo gravado
 */
export async function registrarMovimentacao(
  produtoId: string,
  tipo: MovementType,
  quantidade: number,
  usuarioId: string,
): Promise<number> {
  const produtoRef = doc(db, 'produtos', produtoId)

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(produtoRef)
    if (!snap.exists()) {
      throw new MovementValidationError('Produto não encontrado. Pode ter sido excluído.')
    }

    const data = snap.data()
    const estoqueAtual = typeof data.estoque === 'number' ? data.estoque : 0
    const validation = validateMovement(produtoId, tipo, quantidade, estoqueAtual)
    if (!validation.ok) throw new MovementValidationError(validation.error)

    const novoEstoque = calculateNewBalance(estoqueAtual, tipo, quantidade)
    const movId = buildMovementId(produtoId, tipo, productVersionMillis(data))

    // 1. Cria a movimentação com ID versionado (nunca colide com uma anterior)
    transaction.set(doc(db, 'estoque', movId), {
      produtoId,
      tipo,
      quantidade,
      data: serverTimestamp(),
      usuarioId,
    })

    // 2. Atualiza o saldo do produto (validado pela regra via getAfter)
    transaction.update(produtoRef, {
      estoque: novoEstoque,
      atualizadoEm: serverTimestamp(),
    })

    return novoEstoque
  })
}

// ---------------------------------------------------------------------------
// Mensagens de erro amigáveis
// ---------------------------------------------------------------------------

/** Converte erros do Firestore em mensagens legíveis pelo utilizador. */
export function describeEstoqueError(error: unknown): string {
  if (error instanceof MovementValidationError) {
    return error.message
  }
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'Você não tem permissão para registrar movimentações.'
      case 'unavailable':
        return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
      case 'not-found':
        return 'Produto não encontrado. Pode ter sido excluído.'
      case 'aborted':
        return 'A operação foi cancelada por conflito. Tente novamente.'
    }
  }
  return 'Não foi possível registrar a movimentação. Tente novamente.'
}
