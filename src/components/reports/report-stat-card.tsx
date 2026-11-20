import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

type Props = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: 'primary' | 'emerald' | 'blue' | 'amber' | 'rose' | 'purple'
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
}

/** Cartão de indicador usado nos três relatórios (mesmo visual dos KPIs de Vendas). */
export function ReportStatCard({ label, value, hint, icon: Icon, tone = 'primary' }: Props) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span className="text-xs leading-tight font-semibold uppercase tracking-wider">{label}</span>
        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold tracking-tight break-words text-foreground tabular-nums md:text-xl">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

/** Estado vazio padrão dos relatórios. */
export function ReportEmpty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
      <Icon className="size-10 text-muted-foreground" aria-hidden="true" />
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/** Título de seção dentro de um relatório. */
export function ReportSectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground md:text-lg">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
