import { DollarSign, Package, Trophy } from 'lucide-react'
import { sharePercent, type TopSellingReport, type TopSellingSort } from '../../lib/relatorios'
import { formatCents } from '../../lib/sales'
import { cn } from '../../lib/utils'
import { ReportEmpty, ReportStatCard } from './report-stat-card'

type Props = {
  report: TopSellingReport
  sortBy: TopSellingSort
  onSortChange: (sort: TopSellingSort) => void
}

const SORT_OPTIONS: { value: TopSellingSort; label: string }[] = [
  { value: 'quantidade', label: 'Por quantidade' },
  { value: 'receita', label: 'Por receita' },
]

/** Relatório dos produtos mais vendidos (EAP 2.6). */
export function TopSellingReportView({ report, sortBy, onSortChange }: Props) {
  const { ranking, totalProdutos, totalUnidades, totalReceita } = report
  const share = (row: { quantidade: number; receita: number }) =>
    sortBy === 'receita' ? sharePercent(row.receita, totalReceita) : sharePercent(row.quantidade, totalUnidades)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ReportStatCard label="Produtos vendidos" value={String(totalProdutos)} icon={Trophy} tone="amber" />
        <ReportStatCard label="Unidades líquidas" value={String(totalUnidades)} icon={Package} tone="blue" />
        <div className="col-span-2 lg:col-span-1">
          <ReportStatCard
            label="Receita dos itens"
            value={formatCents(totalReceita)}
            hint="Antes dos descontos da transação"
            icon={DollarSign}
            tone="emerald"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground md:text-lg">Ranking (top 10)</h2>
          <p className="text-sm text-muted-foreground">Devoluções e peças devolvidas em trocas são descontadas.</p>
        </div>
        <div role="group" aria-label="Critério do ranking" className="flex gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSortChange(opt.value)}
              aria-pressed={sortBy === opt.value}
              className={cn(
                'h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold transition-colors',
                sortBy === opt.value
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {ranking.length === 0 ? (
        <ReportEmpty
          icon={Trophy}
          title="Nenhum produto vendido no período"
          text="Assim que houver vendas no período selecionado, o ranking aparecerá aqui."
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {ranking.map((row) => (
            <li key={row.produtoId} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                    row.posicao <= 3 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground',
                  )}
                  aria-label={`${row.posicao}º lugar`}
                >
                  {row.posicao}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{row.nome}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {row.tamanho && <span>Tam. {row.tamanho}</span>}
                    {row.cor.nome && (
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2.5 rounded-full border border-border" style={{ backgroundColor: row.cor.hex }} aria-hidden="true" />
                        {row.cor.nome}
                      </span>
                    )}
                    {row.categoria && <span>{row.categoria}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {sortBy === 'receita' ? formatCents(row.receita) : `${row.quantidade} un.`}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {sortBy === 'receita' ? `${row.quantidade} un.` : formatCents(row.receita)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, share(row))}%` }} />
                </div>
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {share(row).toLocaleString('pt-BR')}%
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
