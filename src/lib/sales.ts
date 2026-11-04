/**
 * sales.ts — Lógica de negócio do Ponto de Venda (PDV) e Frente de Caixa.
 *
 * Todas as funções de cálculo trabalham com valores monetários estritamente
 * em centavos (números inteiros) para eliminar imprecisões de ponto flutuante.
 */

import { toCents, fromCents, formatPrice, type Product } from './products'

// ---------------------------------------------------------------------------
// Tipos e Estrutura do Documento de Vendas (RF05 e RF06)
// ---------------------------------------------------------------------------

export type TransactionType = 'venda' | 'troca' | 'devolucao'

export const TRANSACTION_TYPES: { value: TransactionType; label: string; action: string }[] = [
  { value: 'venda', label: 'Venda', action: 'Finalizar Venda' },
  { value: 'troca', label: 'Troca', action: 'Finalizar Troca' },
  { value: 'devolucao', label: 'Devolução', action: 'Finalizar Devolução' },
]

/** Item que compõe o documento da venda gravado no Firestore. */
export type SaleItem = {
  produtoId: string
  nome: string
  tamanho: string
  cor: { nome: string; hex: string }
  quantidade: number
  precoUnitario: number // em centavos (inteiro positivo)
}

/** Modelo completo do documento na coleção `vendas` no Cloud Firestore. */
export type Sale = {
  id?: string
  itens: SaleItem[]
  subtotal: number // em centavos (inteiro >= 0)
  desconto: number // em centavos (inteiro >= 0, <= subtotal)
  total: number // em centavos (inteiro >= 0, igual a subtotal - desconto)
  tipo: TransactionType
  data: any // Timestamp no Firestore / Date no cliente
  usuarioId: string
}

/** Item no carrinho da interface de Frente de Caixa. */
export type CartItem = {
  product: Product
  quantity: number
}

export type DiscountMode = 'percent' | 'value'

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Funções Puras de Cálculo
// ---------------------------------------------------------------------------

/**
 * Converte um item do carrinho da UI em um SaleItem com preço em centavos.
 */
export function cartItemToSaleItem(item: CartItem): SaleItem {
  const precoUnitario = toCents(item.product.price)
  return {
    produtoId: item.product.id,
    nome: item.product.name,
    tamanho: item.product.size,
    cor: { nome: item.product.color.name, hex: item.product.color.hex },
    quantidade: item.quantity,
    precoUnitario,
  }
}

/**
 * Calcula o subtotal em centavos somando o valor de cada item multiplicado pela sua quantidade.
 */
export function calculateSubtotal(items: Array<{ precoUnitario: number; quantidade: number }>): number {
  return items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(item.quantidade || 0))
    const unitPrice = Math.max(0, Math.floor(item.precoUnitario || 0))
    return sum + (unitPrice * qty)
  }, 0)
}

/**
 * Converte a entrada de desconto do usuário para centavos ou percentual numérico.
 */
export function parseDiscountInput(input: string | number): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.max(0, input) : 0
  }
  if (!input || !input.trim()) return 0
  // Remove R$, %, espaços e substitui vírgula por ponto
  const cleaned = input
    .replace(/[R$\s%]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const num = Number.parseFloat(cleaned)
  return Number.isFinite(num) ? Math.max(0, num) : 0
}

/**
 * Calcula o valor do desconto em centavos.
 * Regras:
 * - Em transações de troca ou devolução, o desconto é sempre 0.
 * - Modo percentual: percentual entre 0 e 100%, arredondado para o centavo mais próximo.
 * - Modo valor: valor monetário convertido para centavos.
 * - O desconto NUNCA pode ser maior que o subtotal.
 *
 * @param subtotal Valor do subtotal em centavos
 * @param mode 'percent' | 'value'
 * @param input Valor digitado pelo usuário (ex: '10' para 10% ou '15,50' para R$ 15,50)
 * @param tipo 'venda' | 'troca' | 'devolucao'
 */
export function calculateDiscount(
  subtotal: number,
  mode: DiscountMode,
  input: string | number,
  tipo: TransactionType = 'venda',
): number {
  if (tipo !== 'venda' || subtotal <= 0) {
    return 0
  }

  const parsed = parseDiscountInput(input)
  if (parsed <= 0) {
    return 0
  }

  let discountCents = 0
  if (mode === 'percent') {
    const percent = Math.min(parsed, 100)
    discountCents = Math.round((subtotal * percent) / 100)
  } else {
    // Modo valor em reais: converte para centavos
    discountCents = toCents(parsed)
  }

  // O desconto nunca pode exceder o subtotal
  return Math.min(subtotal, Math.max(0, discountCents))
}

/**
 * Calcula o total final da transação em centavos.
 */
export function calculateTotal(subtotal: number, discount: number): number {
  const safeSubtotal = Math.max(0, Math.floor(subtotal || 0))
  const safeDiscount = Math.max(0, Math.floor(discount || 0))
  return Math.max(0, safeSubtotal - safeDiscount)
}

/**
 * Valida a integridade dos dados da venda antes da finalização.
 */
export function validateSale(sale: {
  itens: SaleItem[]
  subtotal: number
  desconto: number
  total: number
  tipo: TransactionType
}): ValidationResult {
  if (!sale.itens || sale.itens.length === 0) {
    return { ok: false, error: 'O carrinho está vazio. Adicione itens antes de finalizar.' }
  }

  if (!['venda', 'troca', 'devolucao'].includes(sale.tipo)) {
    return { ok: false, error: 'Tipo de transação inválido.' }
  }

  for (const item of sale.itens) {
    if (!item.produtoId) {
      return { ok: false, error: 'Item com produto não identificado.' }
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
      return { ok: false, error: `Quantidade inválida para o produto "${item.nome}".` }
    }
    if (!Number.isInteger(item.precoUnitario) || item.precoUnitario <= 0) {
      return { ok: false, error: `Preço unitário inválido para o produto "${item.nome}".` }
    }
  }

  const expectedSubtotal = calculateSubtotal(sale.itens)
  if (sale.subtotal !== expectedSubtotal) {
    return {
      ok: false,
      error: `Incoerência no subtotal: calculado ${expectedSubtotal}, recebido ${sale.subtotal}.`,
    }
  }

  if (sale.tipo !== 'venda' && sale.desconto !== 0) {
    return { ok: false, error: 'Desconto permitido apenas em operações de venda.' }
  }

  if (sale.desconto < 0 || sale.desconto > sale.subtotal) {
    return { ok: false, error: 'O desconto não pode ser negativo nem maior que o subtotal.' }
  }

  const expectedTotal = calculateTotal(sale.subtotal, sale.desconto)
  if (sale.total !== expectedTotal) {
    return {
      ok: false,
      error: `Incoerência no total: calculado ${expectedTotal}, recebido ${sale.total}.`,
    }
  }

  return { ok: true }
}

/**
 * Formata um valor em centavos diretamente para reais (ex: 5990 -> 'R$ 59,90').
 */
export function formatCents(cents: number): string {
  return formatPrice(fromCents(cents))
}

/** Gera um código de barras de demonstração a partir do ID do produto. */
export function barcodeFor(product: Product): string {
  const n = product.id.replace(/\D/g, '').padStart(4, '0')
  return `78912345${n}`
}
