import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { MovementType } from '../../lib/stock'
import { cn } from '../../lib/utils'

export function MovementBadge({ type }: { type: MovementType }) {
  const isIn = type === 'entrada'
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        isIn
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-red-500/15 text-red-700 dark:text-red-400',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {isIn ? 'Entrada' : 'Saída'}
    </span>
  )
}

export function SignedQuantity({ type, quantity }: { type: MovementType; quantity: number }) {
  const isIn = type === 'entrada'
  return (
    <span
      className={cn(
        'font-bold tabular-nums',
        isIn ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400',
      )}
    >
      {isIn ? '+' : '−'}
      {quantity}
      <span className="sr-only"> unidades</span>
    </span>
  )
}
