import { useId, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import type { Product } from '../../lib/products'
import { cn } from '../../lib/utils'

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

type Props = {
  id: string
  products: Product[]
  selected: Product | null
  onSelect: (product: Product | null) => void
  invalid?: boolean
  describedBy?: string
}

export function ProductCombobox({ id, products, selected, onSelect, invalid, describedBy }: Props) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    const q = normalize(query.trim())
    const list = q
      ? products.filter((p) => normalize(`${p.name} ${p.size} ${p.color.name}`).includes(q))
      : products
    return list.slice(0, 6)
  }, [products, query])

  function choose(product: Product) {
    onSelect(product)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && results[activeIndex]) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      choose(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const fieldClass = cn(
    'flex h-12 w-full items-center gap-2.5 rounded-xl border bg-card px-3.5 shadow-xs transition-colors dark:bg-input/20',
    invalid ? 'border-destructive' : 'border-input',
  )

  if (selected) {
    return (
      <div className={cn(fieldClass, 'justify-between')}>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">{selected.name}</span>
          <span className="text-xs text-muted-foreground">
            Tam. {selected.size} · {selected.color.name} · {selected.stock} em estoque
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Trocar produto</span>
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className={cn(
          fieldClass,
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30',
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-activedescendant={open && results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nome, cor ou tamanho"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none md:text-sm"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-2 flex max-h-72 flex-col overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado
            </li>
          ) : (
            results.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-${product.id}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(product)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5',
                  index === activeIndex && 'bg-muted',
                )}
              >
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Tam. {product.size} · {product.color.name}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{product.stock}</span> un.
                  {index === activeIndex && <Check className="size-3.5 text-primary" aria-hidden="true" />}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
