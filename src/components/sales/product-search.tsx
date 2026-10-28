import { useId, useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { formatPrice, type Product } from '../../lib/products'
import { cn } from '../../lib/utils'

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

type Props = { products: Product[]; onAdd: (product: Product) => void }

export function ProductSearch({ products, onAdd }: Props) {
  const inputId = useId()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const trimmed = query.trim()
  const results = useMemo(() => {
    if (!trimmed) return []
    const q = normalize(trimmed)
    return products
      .filter((p) =>
        normalize(`${p.name} ${p.size} ${p.color.name}`).includes(q),
      )
      .slice(0, 6)
  }, [products, trimmed])

  function add(product: Product) {
    onAdd(product)
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[activeIndex]
      if (target) add(target)
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  const open = results.length > 0

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        Buscar produto
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          autoFocus
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Digite o nome do produto..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          className="h-16 w-full rounded-xl border-2 border-input bg-card pr-4 pl-14 text-base font-medium text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20 md:text-lg"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados da busca"
          className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {results.map((p, index) => (
            <li
              key={p.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(p)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-4 py-3',
                index === activeIndex && 'bg-muted',
                p.stock === 0 && 'opacity-60',
              )}
            >
              <span
                className="size-4 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: p.color.hex }}
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-popover-foreground">
                  {p.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {p.size} · {p.color.name} ·{' '}
                  {p.stock === 0 ? 'Sem estoque' : `${p.stock} em estoque`}
                </span>
              </span>
              <span className="text-sm font-bold tabular-nums text-popover-foreground">
                {formatPrice(p.price)}
              </span>
              <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
