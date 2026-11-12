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

export type SaleDate = Date | { toDate?: () => Date } | string | number | null | undefined

/** Modelo completo do documento na coleção `vendas` no Cloud Firestore. */
export type Sale = {
  id?: string
  itens: SaleItem[]
  itensDevolvidos?: SaleItem[]
  subtotal: number // em centavos (inteiro >= 0)
  desconto: number // em centavos (inteiro >= 0, <= subtotal)
  total: number // em centavos (inteiro >= 0, igual a subtotal - desconto)
  tipo: TransactionType
  data: SaleDate
  usuarioId: string
  operadorNome?: string
}

/** Item no carrinho da interface de Frente de Caixa. */
export type CartItem = {
  product: Product
  quantity: number
}

/** Dados estruturados do comprovante de venda para emissão/impressão (RF05/RF06). */
export type SaleReceiptData = {
  id: string
  itens: SaleItem[]
  itensDevolvidos?: SaleItem[]
  subtotal: number
  desconto: number
  total: number
  tipo: TransactionType
  data: Date
  operadorNome: string
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

  const discountCents =
    mode === 'percent'
      ? Math.round((subtotal * Math.min(parsed, 100)) / 100)
      : toCents(parsed)

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
  itensDevolvidos?: SaleItem[]
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

  if (sale.tipo === 'troca' && sale.itensDevolvidos) {
    for (const item of sale.itensDevolvidos) {
      if (!item.produtoId) {
        return { ok: false, error: 'Item devolvido com produto não identificado.' }
      }
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
        return { ok: false, error: `Quantidade inválida para o item devolvido "${item.nome}".` }
      }
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

// ---------------------------------------------------------------------------
// Abatimento Atômico de Estoque (Subtarefa 1 - RF06)
// ---------------------------------------------------------------------------

export type StockDelta = {
  produtoId: string
  nome: string
  quantidadeSaida: number
  quantidadeEntrada: number
  netDelta: number // negativo diminui estoque, positivo aumenta
}

/**
 * Agrupa e calcula as variações de estoque líquidas para cada produto envolvido na transação.
 * - Venda: todos os itens geram saída (netDelta < 0).
 * - Devolução: todos os itens retornam ao estoque gerando entrada (netDelta > 0).
 * - Troca: itens em `itens` geram saída (peças retiradas da loja); itens em `itensDevolvidos`
 *   geram entrada (peças que retornam à loja).
 */
export function calculateSaleStockDeltas(sale: {
  tipo: TransactionType
  itens: SaleItem[]
  itensDevolvidos?: SaleItem[]
}): Map<string, StockDelta> {
  const map = new Map<string, StockDelta>()

  function getOrCreate(produtoId: string, nome: string): StockDelta {
    let delta = map.get(produtoId)
    if (!delta) {
      delta = {
        produtoId,
        nome,
        quantidadeSaida: 0,
        quantidadeEntrada: 0,
        netDelta: 0,
      }
      map.set(produtoId, delta)
    }
    return delta
  }

  for (const item of sale.itens || []) {
    const delta = getOrCreate(item.produtoId, item.nome)
    if (sale.tipo === 'devolucao') {
      delta.quantidadeEntrada += item.quantidade
    } else {
      // 'venda' ou 'troca'
      delta.quantidadeSaida += item.quantidade
    }
  }

  if (sale.tipo === 'troca' && sale.itensDevolvidos) {
    for (const item of sale.itensDevolvidos) {
      const delta = getOrCreate(item.produtoId, item.nome)
      delta.quantidadeEntrada += item.quantidade
    }
  }

  for (const delta of map.values()) {
    delta.netDelta = delta.quantidadeEntrada - delta.quantidadeSaida
  }

  return map
}

/**
 * Valida se há saldo em estoque suficiente para aplicar o delta da transação.
 */
export function validateStockAvailability(
  currentStock: number,
  delta: StockDelta,
): { ok: true; novoEstoque: number } | { ok: false; error: string } {
  const safeStock = Math.max(0, Math.floor(currentStock || 0))
  const novoEstoque = safeStock + delta.netDelta

  if (novoEstoque < 0) {
    return {
      ok: false,
      error: `Estoque insuficiente para "${delta.nome}". Saldo disponível: ${safeStock}, solicitado: ${delta.quantidadeSaida}.`,
    }
  }

  return { ok: true, novoEstoque }
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

// ---------------------------------------------------------------------------
// Formatação de Comprovante de Venda (Subtarefa 3)
// ---------------------------------------------------------------------------

const receiptDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

const receiptTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

/** Converte qualquer representação de data aceita em instância Date nativa. */
export function parseSaleDate(date: SaleDate): Date {
  if (date instanceof Date) return date
  if (date && typeof date === 'object' && 'toDate' in date && typeof (date as { toDate: unknown }).toDate === 'function') {
    return (date as { toDate: () => Date }).toDate()
  }
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date)
  }
  return new Date(0)
}

/** Formata data e hora do comprovante de venda no fuso de São Paulo. */
export function formatReceiptDate(date: SaleDate = new Date()): {
  date: string
  time: string
  full: string
} {
  const d = parseSaleDate(date)
  const dStr = receiptDateFormatter.format(d)
  const tStr = receiptTimeFormatter.format(d)
  return {
    date: dStr,
    time: tStr,
    full: `${dStr} às ${tStr}`,
  }
}

// ---------------------------------------------------------------------------
// Filtros e Métricas para Consulta Gerencial de Vendas (Subtarefa 4 - RF06)
// ---------------------------------------------------------------------------

export type PeriodFilter = 'all' | 'today' | '7days' | '30days'
export type TransactionTypeFilter = 'all' | TransactionType

export type SalesFilterOptions = {
  period?: PeriodFilter
  type?: TransactionTypeFilter
  search?: string
  referenceDate?: Date
}

/**
 * Filtra vendas por período, tipo de operação e termo de busca (ID, operador, item).
 */
export function filterSales(
  sales: Sale[],
  options: SalesFilterOptions = {},
): Sale[] {
  const { period = 'all', type = 'all', search = '', referenceDate = new Date() } = options
  const term = search.trim().toLowerCase()

  return sales.filter((sale) => {
    // 1. Filtro por tipo de transação
    if (type !== 'all' && sale.tipo !== type) {
      return false
    }

    // 2. Filtro por período
    if (period !== 'all') {
      const saleDate = parseSaleDate(sale.data)
      const diffMs = referenceDate.getTime() - saleDate.getTime()

      if (period === 'today') {
        const isSameDay =
          saleDate.getFullYear() === referenceDate.getFullYear() &&
          saleDate.getMonth() === referenceDate.getMonth() &&
          saleDate.getDate() === referenceDate.getDate()
        if (!isSameDay) return false
      } else if (period === '7days') {
        const maxMs = 7 * 24 * 60 * 60 * 1000
        if (diffMs > maxMs || diffMs < 0) return false
      } else if (period === '30days') {
        const maxMs = 30 * 24 * 60 * 60 * 1000
        if (diffMs > maxMs || diffMs < 0) return false
      }
    }

    // 3. Busca textual
    if (term) {
      const idMatch = (sale.id || '').toLowerCase().includes(term)
      const opMatch =
        (sale.operadorNome || '').toLowerCase().includes(term) ||
        (sale.usuarioId || '').toLowerCase().includes(term)
      const itemMatch = (sale.itens || []).some(
        (item) =>
          item.nome.toLowerCase().includes(term) ||
          item.tamanho.toLowerCase().includes(term) ||
          item.cor.nome.toLowerCase().includes(term),
      )
      if (!idMatch && !opMatch && !itemMatch) {
        return false
      }
    }

    return true
  })
}

export type SalesMetrics = {
  totalTransacoes: number
  totalFaturadoVendas: number // em centavos
  totalDevolvido: number // em centavos
  saldoLiquido: number // em centavos
  totalPecas: number
  totalDescontos: number // em centavos
  ticketMedio: number // em centavos
}

/**
 * Calcula indicadores gerenciais (KPIs) sobre a lista de vendas.
 */
export function calculateSalesMetrics(sales: Sale[]): SalesMetrics {
  let totalFaturadoVendas = 0
  let totalDevolvido = 0
  let totalDescontos = 0
  let totalPecas = 0
  let countVendas = 0

  for (const sale of sales) {
    if (sale.tipo === 'venda') {
      totalFaturadoVendas += sale.total || 0
      totalDescontos += sale.desconto || 0
      countVendas += 1
    } else if (sale.tipo === 'devolucao') {
      totalDevolvido += sale.total || 0
    } else if (sale.tipo === 'troca') {
      totalFaturadoVendas += sale.total || 0
      countVendas += 1
    }

    for (const item of sale.itens || []) {
      totalPecas += item.quantidade || 0
    }
  }

  const saldoLiquido = Math.max(0, totalFaturadoVendas - totalDevolvido)
  const ticketMedio = countVendas > 0 ? Math.round(totalFaturadoVendas / countVendas) : 0

  return {
    totalTransacoes: sales.length,
    totalFaturadoVendas,
    totalDevolvido,
    saldoLiquido,
    totalPecas,
    totalDescontos,
    ticketMedio,
  }
}


