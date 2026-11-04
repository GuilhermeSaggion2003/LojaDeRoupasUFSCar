/**
 * sales-db.ts — Acesso ao Cloud Firestore para o módulo de Vendas (RF05/RF06).
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { db } from '../firebase'
import type { Sale } from './sales'

const vendasRef = collection(db, 'vendas')

/**
 * Registra uma nova venda na coleção `vendas` do Cloud Firestore.
 *
 * @param sale Dados da venda (itens, subtotal, desconto, total, tipo)
 * @param usuarioId UID do operador autenticado no Firebase Auth
 * @returns ID do documento criado no Firestore
 */
export async function registrarVenda(
  sale: Omit<Sale, 'id' | 'data' | 'usuarioId'>,
  usuarioId: string,
): Promise<string> {
  const docRef = await addDoc(vendasRef, {
    itens: sale.itens,
    subtotal: sale.subtotal,
    desconto: sale.desconto,
    total: sale.total,
    tipo: sale.tipo,
    data: serverTimestamp(),
    usuarioId,
  })

  return docRef.id
}

/**
 * Converte erros do Firestore em mensagens legíveis pelo operador de caixa.
 */
export function describeSalesError(error: unknown): string {
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
