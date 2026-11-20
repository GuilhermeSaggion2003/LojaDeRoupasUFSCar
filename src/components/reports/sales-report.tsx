import { ArrowLeftRight, BadgePercent, CalendarDays, DollarSign, Receipt, RotateCcw, ShoppingBag, TrendingUp } from 'lucide-react'
import { formatDayKey, type SalesReport } from '../../lib/relatorios'
import { formatCents, type TransactionType } from '../../lib/sales'
import { cn } from '../../lib/utils'
import { ReportEmpty, ReportSectionTitle, ReportStatCard } from './report-stat-card'

const TYPE_ROWS: { tipo: TransactionType; label: string; icon: typeof ShoppingBag; badge: string }[] = [
  { tipo: 'venda', label: 'Vendas', icon: ShoppingBag, badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
  { tipo: 'troca', label: 'Trocas', icon: ArrowLeftRight, badge: 'bg-blue-500/10 text-blue-800 dark:text-blue-300' },
  { tipo: 'devolucao', label: 'Devoluções', icon: RotateCcw, badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300' },
]

/** Relatório de vendas (EAP 2.6): resumo do período, totais por tipo e por dia. */
export function SalesReportView({ report }: { report: SalesReport }) {
  const { metricas, porTipo, porDia } = report

  if (metricas.totalTransacoes === 0) {
    return (
      <ReportEmpty
        icon={Receipt}
        title="Nenhuma transação no período"
        text="Não há vendas, trocas ou devoluções registradas no período selecionado."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ReportStatCard
          label="Faturamento líquido"
          value={formatCents(metricas.saldoLiquido)}
          hint={`Bruto ${formatCents(report.faturamentoBruto)}`}
          icon={DollarSign}
        />
        <ReportStatCard
          label="Transações"
          value={String(metricas.totalTransacoes)}
          hint={`${metricas.totalPecas} ${metricas.totalPecas === 1 ? 'peça' : 'peças'}`}
          icon={Receipt}
          tone="blue"
        />
        <ReportStatCard
          label="Ticket médio"
          value={formatCents(metricas.ticketMedio)}
          hint="Por venda ou troca"
          icon={TrendingUp}
          tone="emerald"
        />
        <ReportStatCard
          label="Descontos"
          value={formatCents(metricas.totalDescontos)}
          hint={`Devolvido ${formatCents(metricas.totalDevolvido)}`}
          icon={BadgePercent}
          tone="purple"
        />
      </div>

      {/* Totais por tipo de operação */}
      <section className="flex flex-col gap-3">
        <ReportSectionTitle title="Por tipo de operação" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TYPE_ROWS.map(({ tipo, label, icon: Icon, badge }) => (
            <div key={tipo} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', badge)}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {porTipo[tipo].transacoes} {porTipo[tipo].transacoes === 1 ? 'transação' : 'transações'} ·{' '}
                  {porTipo[tipo].pecas} {porTipo[tipo].pecas === 1 ? 'peça' : 'peças'}
                </p>
                <p className="text-base font-bold tabular-nums text-foreground">{formatCents(porTipo[tipo].valor)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Totais por dia */}
      <section className="flex flex-col gap-3">
        <ReportSectionTitle title="Resumo diário" description="Datas no fuso de São Paulo." />

        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Dia</th>
                <th className="px-5 py-3 text-right">Transações</th>
                <th className="px-5 py-3 text-right">Vendas e trocas</th>
                <th className="px-5 py-3 text-right">Devoluções</th>
                <th className="px-5 py-3 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {porDia.map((row) => (
                <tr key={row.dia} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium text-foreground">{formatDayKey(row.dia)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.transacoes}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCents(row.faturamento)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                    {row.devolucoes > 0 ? `−${formatCents(row.devolucoes)}` : formatCents(0)}
                  </td>
                  <td className={cn('px-5 py-3 text-right font-semibold tabular-nums', row.liquido < 0 && 'text-rose-600 dark:text-rose-400')}>
                    {row.liquido < 0 ? `−${formatCents(-row.liquido)}` : formatCents(row.liquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col gap-2 md:hidden">
          {porDia.map((row) => (
            <li key={row.dia} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                  {formatDayKey(row.dia)}
                </span>
                <span className={cn('text-sm font-bold tabular-nums', row.liquido < 0 && 'text-rose-600 dark:text-rose-400')}>
                  {row.liquido < 0 ? `−${formatCents(-row.liquido)}` : formatCents(row.liquido)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.transacoes} {row.transacoes === 1 ? 'transação' : 'transações'} · vendas e trocas{' '}
                {formatCents(row.faturamento)} · devoluções {formatCents(row.devolucoes)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
