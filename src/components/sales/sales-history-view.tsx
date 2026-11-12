import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  FileText,
  Loader2,
  Receipt,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import {
  calculateSalesMetrics,
  filterSales,
  formatCents,
  formatReceiptDate,
  parseSaleDate,
  type PeriodFilter,
  type Sale,
  type SaleReceiptData,
  type TransactionType,
  type TransactionTypeFilter,
} from '../../lib/sales'
import { describeSalesError, subscribeSales } from '../../lib/sales-db'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { SaleReceiptDialog } from './sale-receipt-dialog'
import { SalesMetricsCards } from './sales-metrics-cards'

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Todo o Período' },
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
]

const TYPE_OPTIONS: { value: TransactionTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todas as Operações' },
  { value: 'venda', label: 'Vendas' },
  { value: 'troca', label: 'Trocas' },
  { value: 'devolucao', label: 'Devoluções' },
]

export function SalesHistoryView() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [type, setType] = useState<TransactionTypeFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<SaleReceiptData | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeSales(
      (data) => {
        setSales(data)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Erro ao escutar histórico de vendas:', err)
        setError(describeSalesError(err))
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const filteredSales = useMemo(() => {
    return filterSales(sales, {
      period,
      type,
      search,
    })
  }, [sales, period, type, search])

  const metrics = useMemo(() => {
    return calculateSalesMetrics(filteredSales)
  }, [filteredSales])

  function handleOpenReceipt(sale: Sale) {
    setSelectedReceipt({
      id: sale.id || 'sem-id',
      itens: sale.itens,
      itensDevolvidos: sale.itensDevolvidos,
      subtotal: sale.subtotal,
      desconto: sale.desconto,
      total: sale.total,
      tipo: sale.tipo,
      data: parseSaleDate(sale.data),
      operadorNome: sale.operadorNome || sale.usuarioId || 'Operador Caixa',
    })
  }

  function getBadgeClass(tipo: TransactionType) {
    switch (tipo) {
      case 'venda':
        return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
      case 'troca':
        return 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20'
      case 'devolucao':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Modal de Comprovante de Transação */}
      <SaleReceiptDialog
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* Alerta de erro de permissão ou conexão */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Cartões com Métricas e Indicadores da Consulta */}
      <SalesMetricsCards metrics={metrics} />

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Campo de Busca Textual */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar por ID, operador ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* Filtro por Período */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground hidden sm:block" aria-hidden="true" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 cursor-pointer"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros em Pills para Tipo de Transação */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                'h-8 rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer',
                type === opt.value
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Tabela de Vendas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Carregando histórico de vendas...</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Receipt className="size-10 text-muted-foreground" aria-hidden="true" />
          <h3 className="font-semibold text-foreground">Nenhuma transação encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Não foram encontradas vendas correspondentes aos filtros selecionados. Tente ajustar o período ou o termo de busca.
          </p>
        </div>
      ) : (
        <>
          {/* Visualização Desktop (Tabela) */}
          <div className="hidden rounded-2xl border border-border bg-card shadow-xs md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Transação</th>
                    <th className="px-5 py-3.5">Data / Hora</th>
                    <th className="px-5 py-3.5">Tipo</th>
                    <th className="px-5 py-3.5">Operador</th>
                    <th className="px-5 py-3.5">Peças</th>
                    <th className="px-5 py-3.5">Desconto</th>
                    <th className="px-5 py-3.5 text-right">Total</th>
                    <th className="px-5 py-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSales.map((sale) => {
                    const { full: dataFormatada } = formatReceiptDate(sale.data)
                    const totalPecas = (sale.itens || []).reduce((sum, i) => sum + i.quantidade, 0)

                    return (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4 font-mono font-medium text-foreground text-xs">
                          #{sale.id ? sale.id.slice(0, 8).toUpperCase() : 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {dataFormatada}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
                              getBadgeClass(sale.tipo),
                            )}
                          >
                            {sale.tipo}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-foreground">
                          {sale.operadorNome || sale.usuarioId?.slice(0, 8) || 'Caixa'}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          {totalPecas} {totalPecas === 1 ? 'item' : 'itens'}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground tabular-nums">
                          {sale.desconto > 0 ? `− ${formatCents(sale.desconto)}` : 'R$ 0,00'}
                        </td>
                        <td className="px-5 py-4 text-right font-bold tabular-nums text-foreground">
                          {formatCents(sale.total)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReceipt(sale)}
                            className="h-8 gap-1.5 text-xs cursor-pointer"
                          >
                            <FileText className="size-3.5" aria-hidden="true" />
                            Comprovante
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visualização Mobile (Cards Responsivos - RNF01) */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredSales.map((sale) => {
              const { full: dataFormatada } = formatReceiptDate(sale.data)
              const totalPecas = (sale.itens || []).reduce((sum, i) => sum + i.quantidade, 0)

              return (
                <div
                  key={sale.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        #{sale.id ? sale.id.slice(0, 10).toUpperCase() : 'N/A'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{dataFormatada}</p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize',
                        getBadgeClass(sale.tipo),
                      )}
                    >
                      {sale.tipo}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Operador:</span>
                      <p className="font-medium text-foreground truncate">
                        {sale.operadorNome || sale.usuarioId?.slice(0, 8) || 'Caixa'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Volume:</span>
                      <p className="font-medium text-foreground">
                        {totalPecas} {totalPecas === 1 ? 'peça' : 'peças'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Total:</span>
                      <p className="text-base font-bold tabular-nums text-foreground">
                        {formatCents(sale.total)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReceipt(sale)}
                      className="h-8 gap-1.5 text-xs cursor-pointer"
                    >
                      <FileText className="size-3.5" aria-hidden="true" />
                      Comprovante
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

