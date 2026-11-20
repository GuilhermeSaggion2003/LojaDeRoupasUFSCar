import { ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardList, Scale } from 'lucide-react'
import type { MovementTotals, StockMovementReport } from '../../lib/relatorios'
import { cn } from '../../lib/utils'
import { ReportEmpty, ReportSectionTitle, ReportStatCard } from './report-stat-card'

function signed(value: number) {
  if (value > 0) return `+${value}`
  return value < 0 ? `−${-value}` : '0'
}

function SaldoCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        value > 0 && 'text-emerald-700 dark:text-emerald-400',
        value < 0 && 'text-rose-600 dark:text-rose-400',
      )}
    >
      {signed(value)}
    </span>
  )
}

function OriginCard({ title, description, totals }: { title: string; description: string; totals: MovementTotals }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Entradas</dt>
          <dd className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">+{totals.entradas}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Saídas</dt>
          <dd className="font-bold tabular-nums text-rose-600 dark:text-rose-400">−{totals.saidas}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo</dt>
          <dd>
            <SaldoCell value={totals.saldo} />
          </dd>
        </div>
      </dl>
    </div>
  )
}

/** Relatório de movimentação de estoque (EAP 2.6): por origem, categoria e produto. */
export function StockMovementReportView({ report }: { report: StockMovementReport }) {
  const { totais, avulsas, porVendas, porCategoria, porProduto } = report

  if (totais.movimentacoes === 0) {
    return (
      <ReportEmpty
        icon={Boxes}
        title="Nenhuma movimentação no período"
        text="Não há entradas ou saídas de estoque registradas no período selecionado."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ReportStatCard label="Movimentações" value={String(totais.movimentacoes)} icon={ClipboardList} tone="blue" />
        <ReportStatCard label="Entradas" value={`${totais.entradas} un.`} icon={ArrowDownToLine} tone="emerald" />
        <ReportStatCard label="Saídas" value={`${totais.saidas} un.`} icon={ArrowUpFromLine} tone="rose" />
        <ReportStatCard label="Saldo do período" value={`${signed(totais.saldo)} un.`} icon={Scale} />
      </div>

      {/* Origem das movimentações */}
      <section className="flex flex-col gap-3">
        <ReportSectionTitle title="Por origem" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OriginCard title="Movimentações avulsas" description="Registradas na tela de Estoque" totals={avulsas} />
          <OriginCard title="Vendas, trocas e devoluções" description="Geradas pela Frente de Caixa" totals={porVendas} />
        </div>
      </section>

      {/* Por categoria */}
      <section className="flex flex-col gap-3">
        <ReportSectionTitle title="Por categoria" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {porCategoria.map((row) => (
            <div key={row.categoria ?? 'removidos'} className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <p className="truncate text-sm font-semibold text-foreground">{row.categoria ?? 'Removidos'}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                +{row.entradas} / −{row.saidas}
              </p>
              <p className="text-sm">
                Saldo <SaldoCell value={row.saldo} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Por produto */}
      <section className="flex flex-col gap-3">
        <ReportSectionTitle title="Por produto" description="Ordenado pelo volume movimentado no período." />

        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3 text-right">Mov.</th>
                <th className="px-5 py-3 text-right">Entradas</th>
                <th className="px-5 py-3 text-right">Saídas</th>
                <th className="px-5 py-3 text-right">Saldo</th>
                <th className="px-5 py-3 text-right">Estoque atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {porProduto.map((row) => (
                <tr key={row.produtoId} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium text-foreground">{row.nome}</td>
                  <td className="px-5 py-3 text-muted-foreground">{row.categoria ?? '—'}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.movimentacoes}</td>
                  <td className="px-5 py-3 text-right tabular-nums">+{row.entradas}</td>
                  <td className="px-5 py-3 text-right tabular-nums">−{row.saidas}</td>
                  <td className="px-5 py-3 text-right">
                    <SaldoCell value={row.saldo} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{row.estoqueAtual ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col gap-2 md:hidden">
          {porProduto.map((row) => (
            <li key={row.produtoId} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{row.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.categoria ?? 'Sem categoria'} · estoque atual {row.estoqueAtual ?? '—'}
                  </p>
                </div>
                <SaldoCell value={row.saldo} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {row.movimentacoes} mov. · +{row.entradas} entradas · −{row.saidas} saídas
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
