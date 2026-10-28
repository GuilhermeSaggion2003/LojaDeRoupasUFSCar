import { useState } from 'react'
import { INITIAL_PRODUCTS, formatPrice, type Product } from '../../lib/products'
import { TRANSACTION_TYPES, type CartItem, type TransactionType } from '../../lib/sales'
import { ProductSearch } from './product-search'
import { CartList } from './cart-list'
import { OrderSummary } from './order-summary'

export function PosView() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [type, setType] = useState<TransactionType>('venda')
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const limitByStock = type !== 'devolucao'

  function maxFor(product: Product) {
    return limitByStock ? product.stock : 99
  }

  function addProduct(product: Product) {
    const current = cart.find((i) => i.product.id === product.id)?.quantity ?? 0
    if (current + 1 > maxFor(product)) {
      setNotice({
        tone: 'error',
        text:
          product.stock === 0
            ? `${product.name} está sem estoque.`
            : `Estoque insuficiente de ${product.name}. Disponível: ${product.stock}.`,
      })
      return
    }
    setNotice(null)
    setCart((prev) =>
      current > 0
        ? prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { product, quantity: 1 }],
    )
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== productId) return [i]
        if (quantity < 1) return []
        return [{ ...i, quantity: Math.min(quantity, maxFor(i.product)) }]
      }),
    )
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function finalize(total: number) {
    const units = cart.reduce((sum, i) => sum + i.quantity, 0)
    const sign = type === 'devolucao' ? 1 : -1
    setProducts((prev) =>
      prev.map((p) => {
        const item = cart.find((i) => i.product.id === p.id)
        return item ? { ...p, stock: p.stock + sign * item.quantity } : p
      }),
    )
    const label = TRANSACTION_TYPES.find((t) => t.value === type)?.label ?? 'Venda'
    setNotice({
      tone: 'success',
      text: `${label} registrada: ${units} ${units === 1 ? 'item' : 'itens'} · ${formatPrice(total)}.`,
    })
    setCart([])
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Ponto de Venda
        </h1>
        <p className="text-sm text-muted-foreground">
          Busque pelo nome do produto para adicionar itens.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ProductSearch products={products} onAdd={addProduct} />
          <div aria-live="polite">
            {notice && (
              <p
                className={
                  notice.tone === 'success'
                    ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400'
                    : 'rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive'
                }
              >
                {notice.text}
              </p>
            )}
          </div>
          <CartList
            items={cart}
            maxFor={maxFor}
            onQuantityChange={updateQuantity}
            onRemove={removeItem}
            onClear={() => setCart([])}
          />
        </div>

        <OrderSummary
          items={cart}
          type={type}
          onTypeChange={(next) => {
            setType(next)
            setNotice(null)
          }}
          onFinalize={finalize}
        />
      </div>
    </div>
  )
}
