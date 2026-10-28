 

import { Search, X } from 'lucide-react'
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
  query: string
  onQueryChange: (value: string) => void
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
}

export function ProductsToolbar({ query, onQueryChange, category, onCategoryChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="product-search" className="sr-only">
            Pesquisar produtos
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="product-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Pesquisar por nome, cor ou tamanho"
            className="h-11 w-full rounded-xl border border-input bg-card pr-10 pl-10 text-base text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none dark:bg-input/20 md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Limpar pesquisa</span>
            </button>
          )}
        </div>

        <div className="hidden sm:block">
          <Select
            items={CATEGORY_ITEMS}
            value={category}
            onValueChange={(value) => onCategoryChange((value ?? 'all') as CategoryFilter)}
          >
            <SelectTrigger
              aria-label="Filtrar por categoria"
              className="h-11! w-52 rounded-xl bg-card px-3.5 shadow-xs"
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

      <div
        role="radiogroup"
        aria-label="Filtrar por categoria"
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
                'h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
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
