import { ArrowDownLeft, ArrowUpRight, DollarSign, Package, Receipt, TrendingUp } from 'lucide-react'
import { formatCents, type SalesMetrics } from '../../lib/sales'

type Props = {
  metrics: SalesMetrics
}

export function SalesMetricsCards({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Saldo Líquido */}
      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Faturamento Líquido</span>
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl tabular-nums">
            {formatCents(metrics.saldoLiquido)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              {formatCents(metrics.totalFaturadoVendas)} em vendas
            </span>
            {metrics.totalDevolvido > 0 && (
              <span className="inline-flex items-center text-rose-500 font-medium">
                <ArrowDownLeft className="size-3.5" aria-hidden="true" />
                −{formatCents(metrics.totalDevolvido)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Total de Transações */}
      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Transações</span>
          <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Receipt className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl tabular-nums">
            {metrics.totalTransacoes}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.totalPecas} {metrics.totalPecas === 1 ? 'peça movimentada' : 'peças movimentadas'}
          </p>
        </div>
      </div>

      {/* Ticket Médio */}
      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Ticket Médio</span>
          <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl tabular-nums">
            {formatCents(metrics.ticketMedio)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Por venda finalizada
          </p>
        </div>
      </div>

      {/* Peças e Descontos */}
      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Descontos Concedidos</span>
          <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Package className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl tabular-nums">
            {formatCents(metrics.totalDescontos)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Economia entregue aos clientes
          </p>
        </div>
      </div>
    </div>
  )
}

