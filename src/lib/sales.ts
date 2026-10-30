import type { Product } from './products'

export type TransactionType = 'venda' | 'troca' | 'devolucao'

export const TRANSACTION_TYPES: { value: TransactionType; label: string; action: string }[] = [
  { value: 'venda', label: 'Venda', action: 'Finalizar Venda' },
  { value: 'troca', label: 'Troca', action: 'Finalizar Troca' },
  { value: 'devolucao', label: 'Devolução', action: 'Finalizar Devolução' },
]

export type CartItem = { product: Product; quantity: number }

export function barcodeFor(product: Product) {
  const n = product.id.replace(/\D/g, '').padStart(4, '0')
  return `78912345${n}`
}
