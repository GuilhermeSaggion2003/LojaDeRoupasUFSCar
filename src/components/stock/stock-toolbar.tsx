import { CATEGORIES, type Category } from '../../lib/products'
import { cn } from '../../lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

export type CategoryFilter = Category | 'all'

const CATEGORY_ITEMS = [
  { value: 'all', label: 'Todas as categorias' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
]

type Props = {
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
}

export function StockToolbar({ category, onCategoryChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Filtrar por Categoria:</span>
        {/* Desktop Select */}
        <div className="hidden sm:block">
          <Select
            items={CATEGORY_ITEMS}
            value={category}
            onValueChange={(value) => onCategoryChange((value ?? 'all') as CategoryFilter)}
          >
            <SelectTrigger
              aria-label="Filtrar por categoria"
              className="h-10! w-56 rounded-xl bg-card px-3.5 shadow-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Horizontal Pill Buttons (deslizáveis) */}
      <div
        role="radiogroup"
        aria-label="Filtrar por categoria no mobile"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:hidden"
      >
        {CATEGORY_ITEMS.map((item) => {
          const selected = category === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onCategoryChange(item.value as CategoryFilter)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {item.value === 'all' ? 'Todas' : item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
