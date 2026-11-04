import { AlertTriangle, Boxes, CheckCircle2, PackageX, PlusCircle } from 'lucide-react'
import type { Product } from '../../lib/products'
import {
  LOW_STOCK_THRESHOLD,
  listAlerts,
  type StockLevel,
} from '../../lib/estoque'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

type Props = {
  products: Product[]
  isGerente?: boolean
  onSelectProductForRestock?: (product: Product) => void
}

function StockBadge({ level, stock }: { level: StockLevel; stock: number }) {
  if (level === 'Esgotado') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
        <PackageX className="size-3" aria-hidden="true" />
        Esgotado ({stock} un.)
      </span>
    )
  }
  if (level === 'Baixo') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-3" aria-hidden="true" />
        Baixo ({stock} un.)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      Disponível ({stock} un.)
    </span>
  )
}

export function StockAlerts({ products, isGerente, onSelectProductForRestock }: Props) {
  const alerts = listAlerts(products, LOW_STOCK_THRESHOLD)
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0)
  const esgotadosCount = products.filter((p) => p.stock === 0).length
  const baixosCount = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length

  return (
    <div className="flex flex-col gap-5">
      {/* Indicadores de resumo de nível */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Boxes className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total em Estoque</p>
            <p className="text-xl font-bold tracking-tight text-foreground">{totalStock} <span className="text-xs font-normal text-muted-foreground">peças</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Estoque Baixo (≤ {LOW_STOCK_THRESHOLD} un.)</p>
            <p className="text-xl font-bold tracking-tight text-foreground">
              {baixosCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {baixosCount === 1 ? 'produto' : 'produtos'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <PackageX className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Esgotados (0 un.)</p>
            <p className="text-xl font-bold tracking-tight text-foreground">
              {esgotadosCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {esgotadosCount === 1 ? 'produto' : 'produtos'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Painel / Lista de alertas de baixa e esgotados */}
      <section
        aria-labelledby="stock-alerts-title"
        className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="stock-alerts-title" className="text-base font-semibold text-foreground">
              Painel de Alertas de Reposição
            </h2>
            {alerts.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                {alerts.length} em alerta
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">Limite padrão: ≤ {LOW_STOCK_THRESHOLD} un.</span>
        </div>

        {alerts.length === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <div className="text-sm">
              <span className="font-semibold">Estoque saudável!</span> Nenhum produto está com estoque baixo ou esgotado no momento.
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {alerts.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex flex-col items-start justify-between gap-3 p-3.5 transition-colors sm:flex-row sm:items-center',
                  item.level === 'Esgotado' ? 'bg-destructive/5' : 'bg-card hover:bg-muted/40',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className="size-4 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: item.color.hex }}
                    aria-hidden="true"
                    title={item.color.name}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} · Tam. {item.size} · Cor {item.color.name}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                  <StockBadge level={item.level} stock={item.stock} />
                  {isGerente && onSelectProductForRestock && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectProductForRestock(item)}
                      className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                    >
                      <PlusCircle className="size-3.5" aria-hidden="true" />
                      Repor
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
