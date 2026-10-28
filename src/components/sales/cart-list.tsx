import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { formatPrice, type Product } from '../../lib/products'
import type { CartItem } from '../../lib/sales'

type Props = {
  items: CartItem[]
  maxFor: (product: Product) => number
  onQuantityChange: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  onClear: () => void
}

export function CartList({ items, maxFor, onQuantityChange, onRemove, onClear }: Props) {
  const units = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <section
      aria-labelledby="cart-title"
      className="flex flex-col rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
        <h2 id="cart-title" className="flex items-center gap-2 font-semibold text-card-foreground">
          Carrinho
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {units} {units === 1 ? 'item' : 'itens'}
          </span>
        </h2>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            Limpar
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="font-medium text-card-foreground">Carrinho vazio</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Use a busca acima para adicionar produtos à transação.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map(({ product, quantity }) => {
            const max = maxFor(product)
            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 md:px-5 2xl:flex-nowrap"
              >
                <span
                  className="size-9 shrink-0 rounded-lg border border-border"
                  style={{ backgroundColor: product.color.hex }}
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-card-foreground">{product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.size} · {product.color.name} · {formatPrice(product.price)} un.
                  </span>
                </div>

                <div className="flex w-full items-center justify-between gap-3 2xl:w-auto 2xl:justify-end">
                  <div
                    className="flex items-center rounded-lg border border-border"
                    role="group"
                    aria-label={`Quantidade de ${product.name}`}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-r-none"
                      onClick={() => onQuantityChange(product.id, quantity - 1)}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </Button>
                    <span className="w-10 text-center font-bold tabular-nums text-card-foreground" aria-live="polite">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-l-none"
                      onClick={() => onQuantityChange(product.id, quantity + 1)}
                      disabled={quantity >= max}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <span className="w-24 text-right font-bold tabular-nums text-card-foreground">
                    {formatPrice(product.price * quantity)}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRemove(product.id)}
                    aria-label={`Remover ${product.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
