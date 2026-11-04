import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useProducts } from '../../hooks/use-products'
import { useSession } from '../../hooks/use-session'
import { auth } from '../../firebase'
import type { Product } from '../../lib/products'
import {
  TRANSACTION_TYPES,
  formatCents,
  validateSale,
  type CartItem,
  type SaleItem,
  type TransactionType,
} from '../../lib/sales'
import { describeSalesError, registrarVenda } from '../../lib/sales-db'
import { CartList } from './cart-list'
import { OrderSummary } from './order-summary'
import { ProductSearch } from './product-search'

export function PosView() {
  const { products, loading: productsLoading, error: productsError } = useProducts()
  const { perfil, nome } = useSession()
  const [cart, setCart] = useState<CartItem[]>([])
  const [type, setType] = useState<TransactionType>('venda')
  const [submitting, setSubmitting] = useState(false)
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
            ? `"${product.name}" está esgotado (0 unidades em estoque).`
            : `Estoque insuficiente para "${product.name}". Saldo disponível: ${product.stock} un.`,
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
    setNotice(null)
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== productId) return [i]
        if (quantity < 1) return []
        return [{ ...i, quantity: Math.min(quantity, maxFor(i.product)) }]
      }),
    )
  }

  function removeItem(productId: string) {
    setNotice(null)
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  async function finalize(data: {
    subtotal: number
    desconto: number
    total: number
    saleItems: SaleItem[]
  }) {
    const validation = validateSale({
      itens: data.saleItems,
      subtotal: data.subtotal,
      desconto: data.desconto,
      total: data.total,
      tipo: type,
    })

    if (!validation.ok) {
      setNotice({ tone: 'error', text: validation.error })
      return
    }

    setSubmitting(true)
    setNotice(null)

    try {
      const uid = auth.currentUser?.uid || 'anonimo'
      const saleId = await registrarVenda(
        {
          itens: data.saleItems,
          subtotal: data.subtotal,
          desconto: data.desconto,
          total: data.total,
          tipo: type,
        },
        uid,
      )

      const units = data.saleItems.reduce((sum, i) => sum + i.quantidade, 0)
      const label = TRANSACTION_TYPES.find((t) => t.value === type)?.label ?? 'Venda'
      const discountText = data.desconto > 0 ? ` (Desconto: ${formatCents(data.desconto)})` : ''

      setNotice({
        tone: 'success',
        text: `${label} registrada com sucesso! ID: ${saleId.slice(0, 8)} · ${units} ${units === 1 ? 'item' : 'itens'} · Total: ${formatCents(data.total)}${discountText}.`,
      })
      setCart([])
    } catch (err) {
      console.error('Erro ao finalizar venda:', err)
      setNotice({ tone: 'error', text: describeSalesError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Frente de Caixa (PDV)
          </h1>
          <p className="text-sm text-muted-foreground">
            Busque pelo nome, cor ou tamanho para registrar vendas, trocas e devoluções.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-xs">
            Operador:
            <span className="font-bold text-primary">{nome || perfil || 'Caixa'}</span>
          </span>
        </div>
      </header>

      {productsError && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{productsError}</p>
        </div>
      )}

      {productsLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Carregando catálogo de produtos...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <ProductSearch products={products} onAdd={addProduct} />

            <div aria-live="polite">
              {notice && (
                <div
                  className={
                    notice.tone === 'success'
                      ? 'flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300'
                      : 'flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive'
                  }
                >
                  {notice.tone === 'success' ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{notice.text}</span>
                </div>
              )}
            </div>

            <CartList
              items={cart}
              maxFor={maxFor}
              onQuantityChange={updateQuantity}
              onRemove={removeItem}
              onClear={() => {
                setCart([])
                setNotice(null)
              }}
            />
          </div>

          <OrderSummary
            items={cart}
            type={type}
            submitting={submitting}
            onTypeChange={(next) => {
              setType(next)
              setNotice(null)
            }}
            onFinalize={finalize}
          />
        </div>
      )}
    </div>
  )
}
