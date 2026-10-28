import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { LOW_STOCK_THRESHOLD, type Product } from '../../lib/products'
import { cn } from '../../lib/utils'

export type RowActions = {
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ColorSwatch({ color }: { color: Product['color'] }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15"
        style={{ backgroundColor: color.hex }}
        aria-hidden="true"
      />
      {color.name}
    </span>
  )
}

export function StockIndicator({ stock }: { stock: number }) {
  const status =
    stock === 0 ? 'out' : stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok'
  const label = { out: 'Esgotado', low: 'Baixo', ok: 'Disponível' }[status]

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-semibold tabular-nums text-foreground">{stock}</span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
          status === 'out' && 'bg-destructive/12 text-destructive',
          status === 'low' && 'bg-brand-gold/20 text-accent-foreground dark:text-brand-gold',
          status === 'ok' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        )}
      >
        {label}
      </span>
    </span>
  )
}

export function ProductActions({
  product,
  onEdit,
  onDelete,
  className,
}: RowActions & { product: Product; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-lg text-muted-foreground hover:text-primary"
        onClick={() => onEdit(product)}
      >
        <Pencil className="size-4" aria-hidden="true" />
        <span className="sr-only">Editar {product.name}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onDelete(product)}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Excluir {product.name}</span>
      </Button>
    </div>
  )
}
