import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BarChart3, Boxes, Loader2, Trophy, type LucideIcon } from 'lucide-react'
import { useProducts } from '../../hooks/use-products'
import type { StockMovement } from '../../lib/estoque'
import { describeEstoqueError, subscribeMovements } from '../../lib/estoque-db'
import {
  buildSalesReport,
  buildStockMovementReport,
  buildTopSellingReport,
  REPORT_PERIOD_OPTIONS,
  type TopSellingSort,
} from '../../lib/relatorios'
import type { PeriodFilter, Sale } from '../../lib/sales'
import { describeSalesError, subscribeSales } from '../../lib/sales-db'
import { cn } from '../../lib/utils'
import { SalesReportView } from './sales-report'
import { StockMovementReportView } from './stock-movement-report'
import { TopSellingReportView } from './top-selling-report'

export type ReportTab = 'vendas' | 'estoque' | 'mais-vendidos'

const TABS: { value: ReportTab; label: string; short: string; icon: LucideIcon }[] = [
  { value: 'vendas', label: 'Vendas', short: 'Vendas', icon: BarChart3 },
  { value: 'estoque', label: 'Movimentação de estoque', short: 'Estoque', icon: Boxes },
  { value: 'mais-vendidos', label: 'Mais vendidos', short: 'Mais vendidos', icon: Trophy },
]

/**
 * Tela de Relatórios (A8): lê vendas, movimentações e produtos em tempo real
 * e delega a agregação às funções puras de src/lib/relatorios.ts.
 */
export function ReportsView() {
  const { products, loading: productsLoading, error: productsError } = useProducts()
  const [sales, setSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [movementsError, setMovementsError] = useState<string | null>(null)

  const [tab, setTab] = useState<ReportTab>('vendas')
  const [period, setPeriod] = useState<PeriodFilter>('30days')
  const [sortBy, setSortBy] = useState<TopSellingSort>('quantidade')

  useEffect(() => {
    return subscribeSales(
      (data) => {
        setSales(data)
        setSalesLoading(false)
        setSalesError(null)
      },
      (err) => {
        console.error('Erro ao carregar vendas para relatórios:', err)
        setSalesError(describeSalesError(err))
        setSalesLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    return subscribeMovements(
      (data) => {
        setMovements(data)
        setMovementsLoading(false)
        setMovementsError(null)
      },
      (err) => {
        console.error('Erro ao carregar movimentações para relatórios:', err)
        setMovementsError(describeEstoqueError(err))
        setMovementsLoading(false)
      },
    )
  }, [])

  // A data de referência é recalculada quando os dados ou o período mudam.
  const salesReport = useMemo(
    () => buildSalesReport(sales, { period, referenceDate: new Date() }),
    [sales, period],
  )
  const stockReport = useMemo(
    () => buildStockMovementReport(movements, products, { period, referenceDate: new Date() }),
    [movements, products, period],
  )
  const topReport = useMemo(
    () => buildTopSellingReport(sales, products, { period, sortBy, referenceDate: new Date() }),
    [sales, products, period, sortBy],
  )

  const loading =
    productsLoading || (tab === 'estoque' ? movementsLoading : salesLoading)
  const error = productsError || (tab === 'estoque' ? movementsError : salesError)
  const periodLabel = REPORT_PERIOD_OPTIONS.find((o) => o.value === period)?.label

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Vendas, movimentação de estoque e produtos mais vendidos · {periodLabel}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Período
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="h-10 cursor-pointer rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          >
            {REPORT_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="border-b border-border">
        <nav aria-label="Tipos de relatório" className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(({ value, label, short, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-current={tab === value ? 'page' : undefined}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors sm:px-4',
                tab === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Carregando dados do relatório...</p>
        </div>
      ) : error ? null : tab === 'vendas' ? (
        <SalesReportView report={salesReport} />
      ) : tab === 'estoque' ? (
        <StockMovementReportView report={stockReport} />
      ) : (
        <TopSellingReportView report={topReport} sortBy={sortBy} onSortChange={setSortBy} />
      )}
    </div>
  )
}
