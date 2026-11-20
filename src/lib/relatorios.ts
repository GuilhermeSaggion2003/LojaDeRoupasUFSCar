/**
 * relatorios.ts — Lógica de negócio do módulo de Relatórios (A8 / EAP 2.6).
 *
 * Três relatórios previstos no PGP (seção 2.1 e EAP 2.6):
 *   1. Relatório de vendas (consolidado por tipo de operação e por dia);
 *   2. Relatório de movimentação de estoque (por produto e por categoria,
 *      separando movimentações avulsas das geradas por vendas);
 *   3. Relatório dos produtos mais vendidos (ranking por quantidade ou receita).
 *
 * Funções puras, sem acesso ao Firestore: recebem os dados já lidos e retornam
 * agregados. Todos os valores monetários são inteiros em centavos (RNF03); a
 * conversão para reais acontece apenas na exibição (formatCents).
 */

import { CATEGORIES, type Category, type Product } from './products'
import type { MovementType, StockMovement } from './estoque'
import {
  calculateSalesMetrics,
  parseSaleDate,
  type PeriodFilter,
  type Sale,
  type SaleItem,
  type SalesMetrics,
  type TransactionType,
} from './sales'

// ---------------------------------------------------------------------------
// Período e datas
// ---------------------------------------------------------------------------

export type ReportOptions = {
  period?: PeriodFilter
  referenceDate?: Date
}

export const REPORT_PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'all', label: 'Todo o período' },
]

const DAY_MS = 24 * 60 * 60 * 1000

/** Chave do dia (AAAA-MM-DD) no fuso de São Paulo. */
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export function dayKey(date: Date): string {
  return dayKeyFormatter.format(date)
}

/** Converte a chave AAAA-MM-DD em DD/MM/AAAA para exibição. */
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Indica se a data pertence ao período do relatório.
 * - today: mesmo dia civil em São Paulo;
 * - 7days / 30days: até 7 ou 30 dias antes da data de referência (sem datas futuras);
 * - all: qualquer data.
 */
export function isWithinPeriod(date: Date, period: PeriodFilter, referenceDate: Date): boolean {
  const time = date.getTime()
  if (Number.isNaN(time)) return false
  if (period === 'all') return true
  if (period === 'today') return dayKey(date) === dayKey(referenceDate)

  const diff = referenceDate.getTime() - time
  const max = (period === '7days' ? 7 : 30) * DAY_MS
  return diff >= 0 && diff <= max
}

// ---------------------------------------------------------------------------
// Saneamento de documentos (documentos malformados são ignorados)
// ---------------------------------------------------------------------------

const TRANSACTION_TYPES: TransactionType[] = ['venda', 'troca', 'devolucao']

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isPositiveInt(value: unknown): value is number {
  return isNonNegativeInt(value) && value > 0
}

function isValidItem(item: unknown): item is SaleItem {
  if (!item || typeof item !== 'object') return false
  const i = item as Partial<SaleItem>
  return (
    typeof i.produtoId === 'string' &&
    i.produtoId.length > 0 &&
    isPositiveInt(i.quantidade) &&
    isNonNegativeInt(i.precoUnitario)
  )
}

/** Uma transação é considerada no relatório quando tipo e valores são coerentes. */
export function isValidSaleForReport(sale: Sale): boolean {
  return (
    TRANSACTION_TYPES.includes(sale.tipo) &&
    isNonNegativeInt(sale.subtotal) &&
    isNonNegativeInt(sale.desconto) &&
    isNonNegativeInt(sale.total) &&
    Array.isArray(sale.itens)
  )
}

function validItems(items: unknown): SaleItem[] {
  return Array.isArray(items) ? items.filter(isValidItem) : []
}

/** Vendas válidas dentro do período. */
function salesInPeriod(sales: Sale[], options: ReportOptions): { sales: Sale[]; ignored: number } {
  const { period = 'all', referenceDate = new Date() } = options
  let ignored = 0
  const result = sales.filter((sale) => {
    if (!isValidSaleForReport(sale)) {
      ignored += 1
      return false
    }
    return isWithinPeriod(parseSaleDate(sale.data), period, referenceDate)
  })
  return { sales: result, ignored }
}

// ---------------------------------------------------------------------------
// 1. Relatório de vendas
// ---------------------------------------------------------------------------

export type TypeSummary = {
  transacoes: number
  pecas: number
  valor: number // centavos (total das transações)
}

export type DailySalesRow = {
  dia: string // AAAA-MM-DD (São Paulo)
  transacoes: number
  faturamento: number // vendas + trocas, em centavos
  devolucoes: number // em centavos
  liquido: number // faturamento - devoluções, em centavos (pode ser negativo no dia)
}

export type SalesReport = {
  metricas: SalesMetrics
  faturamentoBruto: number // subtotal das vendas + total das trocas (antes dos descontos)
  porTipo: Record<TransactionType, TypeSummary>
  porDia: DailySalesRow[] // do dia mais recente para o mais antigo
  ignorados: number // documentos malformados descartados
}

function emptyTypeSummary(): TypeSummary {
  return { transacoes: 0, pecas: 0, valor: 0 }
}

/**
 * Consolida as transações do período: indicadores (reaproveitando
 * calculateSalesMetrics do módulo de vendas), totais por tipo e totais por dia.
 */
export function buildSalesReport(sales: Sale[], options: ReportOptions = {}): SalesReport {
  const { sales: filtered, ignored } = salesInPeriod(sales, options)

  const porTipo: Record<TransactionType, TypeSummary> = {
    venda: emptyTypeSummary(),
    troca: emptyTypeSummary(),
    devolucao: emptyTypeSummary(),
  }
  const dias = new Map<string, DailySalesRow>()
  let faturamentoBruto = 0

  for (const sale of filtered) {
    const pecas = validItems(sale.itens).reduce((sum, item) => sum + item.quantidade, 0)
    const resumo = porTipo[sale.tipo]
    resumo.transacoes += 1
    resumo.pecas += pecas
    resumo.valor += sale.total

    if (sale.tipo === 'venda') faturamentoBruto += sale.subtotal
    if (sale.tipo === 'troca') faturamentoBruto += sale.total

    const key = dayKey(parseSaleDate(sale.data))
    let row = dias.get(key)
    if (!row) {
      row = { dia: key, transacoes: 0, faturamento: 0, devolucoes: 0, liquido: 0 }
      dias.set(key, row)
    }
    row.transacoes += 1
    if (sale.tipo === 'devolucao') row.devolucoes += sale.total
    else row.faturamento += sale.total
    row.liquido = row.faturamento - row.devolucoes
  }

  const porDia = [...dias.values()].sort((a, b) => b.dia.localeCompare(a.dia))

  return {
    metricas: calculateSalesMetrics(filtered),
    faturamentoBruto,
    porTipo,
    porDia,
    ignorados: ignored,
  }
}

// ---------------------------------------------------------------------------
// 2. Relatório de movimentação de estoque
// ---------------------------------------------------------------------------

/** Movimentação de estoque (com `vendaId` quando gerada pelo PDV). */
export type ReportMovement = StockMovement

export type MovementTotals = {
  movimentacoes: number
  entradas: number // unidades
  saidas: number // unidades
  saldo: number // entradas - saídas
}

export type ProductMovementRow = MovementTotals & {
  produtoId: string
  nome: string
  categoria: Category | null
  estoqueAtual: number | null
}

export type CategoryMovementRow = MovementTotals & {
  categoria: Category | null // null = produto removido do catálogo
}

export type StockMovementReport = {
  totais: MovementTotals
  avulsas: MovementTotals // registradas manualmente na tela de Estoque
  porVendas: MovementTotals // geradas por vendas, trocas e devoluções (com vendaId)
  porProduto: ProductMovementRow[]
  porCategoria: CategoryMovementRow[]
  ignorados: number
}

export const REMOVED_PRODUCT_LABEL = 'Produto removido do catálogo'

function emptyTotals(): MovementTotals {
  return { movimentacoes: 0, entradas: 0, saidas: 0, saldo: 0 }
}

function addMovement(totals: MovementTotals, tipo: MovementType, quantidade: number) {
  totals.movimentacoes += 1
  if (tipo === 'entrada') totals.entradas += quantidade
  else totals.saidas += quantidade
  totals.saldo = totals.entradas - totals.saidas
}

function isValidMovement(mov: ReportMovement): boolean {
  return (
    typeof mov.produtoId === 'string' &&
    mov.produtoId.length > 0 &&
    (mov.tipo === 'entrada' || mov.tipo === 'saida') &&
    isPositiveInt(mov.quantidade) &&
    mov.data instanceof Date
  )
}

/**
 * Consolida as movimentações do período por produto e por categoria,
 * distinguindo as avulsas (tela de Estoque) das geradas pelo PDV (vendaId).
 */
export function buildStockMovementReport(
  movements: ReportMovement[],
  products: Product[],
  options: ReportOptions = {},
): StockMovementReport {
  const { period = 'all', referenceDate = new Date() } = options
  const productMap = new Map(products.map((p) => [p.id, p]))

  const totais = emptyTotals()
  const avulsas = emptyTotals()
  const porVendas = emptyTotals()
  const produtos = new Map<string, ProductMovementRow>()
  const categorias = new Map<Category | null, CategoryMovementRow>()
  let ignorados = 0

  for (const mov of movements) {
    if (!isValidMovement(mov)) {
      ignorados += 1
      continue
    }
    if (!isWithinPeriod(mov.data, period, referenceDate)) continue

    addMovement(totais, mov.tipo, mov.quantidade)
    addMovement(mov.vendaId ? porVendas : avulsas, mov.tipo, mov.quantidade)

    const product = productMap.get(mov.produtoId)
    let row = produtos.get(mov.produtoId)
    if (!row) {
      row = {
        ...emptyTotals(),
        produtoId: mov.produtoId,
        nome: product ? `${product.name} (${product.size})` : REMOVED_PRODUCT_LABEL,
        categoria: product?.category ?? null,
        estoqueAtual: product?.stock ?? null,
      }
      produtos.set(mov.produtoId, row)
    }
    addMovement(row, mov.tipo, mov.quantidade)

    const categoria = product?.category ?? null
    let catRow = categorias.get(categoria)
    if (!catRow) {
      catRow = { ...emptyTotals(), categoria }
      categorias.set(categoria, catRow)
    }
    addMovement(catRow, mov.tipo, mov.quantidade)
  }

  const porProduto = [...produtos.values()].sort(
    (a, b) =>
      b.entradas + b.saidas - (a.entradas + a.saidas) || a.nome.localeCompare(b.nome, 'pt-BR'),
  )

  // Categorias na ordem do catálogo; produtos removidos ao final.
  const categoryOrder = (c: Category | null) => (c === null ? CATEGORIES.length : CATEGORIES.indexOf(c))
  const porCategoria = [...categorias.values()].sort(
    (a, b) => categoryOrder(a.categoria) - categoryOrder(b.categoria),
  )

  return { totais, avulsas, porVendas, porProduto, porCategoria, ignorados }
}

// ---------------------------------------------------------------------------
// 3. Relatório dos produtos mais vendidos
// ---------------------------------------------------------------------------

export type TopSellingSort = 'quantidade' | 'receita'

export type TopSellingRow = {
  posicao: number
  produtoId: string
  nome: string
  tamanho: string
  cor: { nome: string; hex: string }
  categoria: Category | null
  quantidade: number // unidades líquidas vendidas
  receita: number // centavos
}

export type TopSellingOptions = ReportOptions & {
  sortBy?: TopSellingSort
  limit?: number
}

export type TopSellingReport = {
  ranking: TopSellingRow[]
  totalProdutos: number // produtos com venda líquida positiva no período
  totalUnidades: number // soma das unidades líquidas de todos esses produtos
  totalReceita: number // soma da receita de todos esses produtos (centavos)
}

export const DEFAULT_TOP_LIMIT = 10

/**
 * Ranking dos produtos mais vendidos no período.
 *
 * Regras (coerentes com calculateSaleStockDeltas e calculateSalesMetrics):
 * - Venda: cada item soma unidades e receita (preço unitário × quantidade).
 * - Troca: as peças levadas (`itens`) somam unidades e receita, pois o total da
 *   troca entra no faturamento; as peças devolvidas (`itensDevolvidos`) apenas
 *   abatem unidades, já que a troca não estorna valor ao cliente.
 * - Devolução: os itens abatem unidades e receita (o total é estornado).
 * - A receita é calculada antes dos descontos da transação (o desconto é
 *   concedido sobre a venda inteira, não por item).
 * - Produtos com saldo líquido de unidades ≤ 0 não entram no ranking.
 * - Desempate: quantidade/receita (conforme o critério), depois o outro
 *   critério e, por fim, o nome em ordem alfabética.
 */
export function buildTopSellingReport(
  sales: Sale[],
  products: Product[],
  options: TopSellingOptions = {},
): TopSellingReport {
  const { sortBy = 'quantidade', limit = DEFAULT_TOP_LIMIT } = options
  const { sales: filtered } = salesInPeriod(sales, options)
  const productMap = new Map(products.map((p) => [p.id, p]))
  const acc = new Map<string, Omit<TopSellingRow, 'posicao' | 'categoria'>>()

  function apply(item: SaleItem, unidades: number, receita: number) {
    let row = acc.get(item.produtoId)
    if (!row) {
      row = {
        produtoId: item.produtoId,
        nome: item.nome || REMOVED_PRODUCT_LABEL,
        tamanho: item.tamanho || '',
        cor: item.cor && typeof item.cor.nome === 'string' ? item.cor : { nome: '', hex: '#cccccc' },
        quantidade: 0,
        receita: 0,
      }
      acc.set(item.produtoId, row)
    }
    row.quantidade += unidades
    row.receita += receita
  }

  for (const sale of filtered) {
    for (const item of validItems(sale.itens)) {
      const valor = item.precoUnitario * item.quantidade
      if (sale.tipo === 'devolucao') apply(item, -item.quantidade, -valor)
      else apply(item, item.quantidade, valor)
    }
    if (sale.tipo === 'troca') {
      for (const item of validItems(sale.itensDevolvidos)) {
        apply(item, -item.quantidade, 0)
      }
    }
  }

  const positivos = [...acc.values()].filter((row) => row.quantidade > 0)
  const primary = (r: { quantidade: number; receita: number }) =>
    sortBy === 'receita' ? r.receita : r.quantidade
  const secondary = (r: { quantidade: number; receita: number }) =>
    sortBy === 'receita' ? r.quantidade : r.receita

  positivos.sort(
    (a, b) =>
      primary(b) - primary(a) ||
      secondary(b) - secondary(a) ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  )

  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_TOP_LIMIT

  return {
    ranking: positivos.slice(0, safeLimit).map((row, index) => ({
      ...row,
      posicao: index + 1,
      categoria: productMap.get(row.produtoId)?.category ?? null,
    })),
    totalProdutos: positivos.length,
    totalUnidades: positivos.reduce((sum, r) => sum + r.quantidade, 0),
    totalReceita: positivos.reduce((sum, r) => sum + r.receita, 0),
  }
}

/**
 * Participação de um valor no total, em percentual com uma casa decimal
 * (ex.: 3, 8 → 37.5). Retorna 0 quando o total é zero.
 */
export function sharePercent(value: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.round((value / total) * 1000) / 10
}
