/**
 * estoque-db.ts — Acesso ao Firestore para o módulo de Estoque.
 *
 * Padrão seguido: mesmo de products-db.ts (batch atômico, serverTimestamp,
 * onSnapshot, describeFirestoreError).
 *
 * Estratégia de atomicidade com as regras de segurança:
 *   O batch cria o documento de movimentação com ID determinístico
 *   `{produtoId}_{tipo}` e simultaneamente atualiza o campo `estoque` do
 *   produto. As regras usam getAfter() para verificar que a movimentação
 *   existe e é coerente no mesmo batch.
 *
 *   Limitação conhecida: apenas uma movimentação de cada tipo por produto
 *   por batch. Para lotes com múltiplos movimentos do mesmo tipo no mesmo
 *   produto, o chamador deve sequencializar as chamadas.
 */

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { db } from '../firebase'
import { type MovementType, type StockMovement } from './estoque'

// ---------------------------------------------------------------------------
// Referências de coleção
// ---------------------------------------------------------------------------

const estoqueRef = collection(db, 'estoque')
const produtosRef = collection(db, 'produtos')

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
  const q = query(estoqueRef, orderBy('data', 'desc'))

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
 * Registra uma movimentação de estoque e atualiza o campo `estoque` do
 * produto em um batch atômico.
 *
 * @param produtoId   ID do produto no Firestore
 * @param tipo        'entrada' | 'saida'
 * @param quantidade  Inteiro positivo
 * @param novoEstoque Saldo calculado pelo cliente (validate + calculateNewBalance)
 * @param usuarioId   UID do utilizador autenticado (request.auth.uid)
 *
 * O ID do documento de movimentação segue o padrão `{produtoId}_{tipo}`
 * exigido pelas regras de segurança para o uso de getAfter().
 */
export async function registrarMovimentacao(
  produtoId: string,
  tipo: MovementType,
  quantidade: number,
  novoEstoque: number,
  usuarioId: string,
): Promise<void> {
  const movId = `${produtoId}_${tipo}`
  const batch = writeBatch(db)

  // 1. Cria o documento de movimentação com ID determinístico
  batch.set(doc(estoqueRef, movId), {
    produtoId,
    tipo,
    quantidade,
    data: serverTimestamp(),
    usuarioId,
  })

  // 2. Atualiza o estoque do produto (validado pela regra via getAfter)
  batch.update(doc(produtosRef, produtoId), {
    estoque: novoEstoque,
    atualizadoEm: serverTimestamp(),
  })

  await batch.commit()
}

// ---------------------------------------------------------------------------
// Mensagens de erro amigáveis
// ---------------------------------------------------------------------------

/** Converte erros do Firestore em mensagens legíveis pelo utilizador. */
export function describeEstoqueError(error: unknown): string {
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
