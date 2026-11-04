import { useState, useEffect } from 'react'
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Loader2, Minus, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import type { Product } from '../../lib/products'
import {
  calculateNewBalance,
  validateMovement,
  type MovementType,
} from '../../lib/estoque'
import { describeEstoqueError, registrarMovimentacao } from '../../lib/estoque-db'
import { auth } from '../../firebase'
import { cn } from '../../lib/utils'
import { ProductCombobox } from './product-combobox'

type Props = {
  products: Product[]
  preSelectedProduct?: Product | null
  onMovementSuccess?: () => void
}

const TYPE_OPTIONS: { value: MovementType; label: string; icon: typeof ArrowDownLeft }[] = [
  { value: 'entrada', label: 'Entrada', icon: ArrowDownLeft },
  { value: 'saida', label: 'Saída', icon: ArrowUpRight },
]

export function MovementForm({ products, preSelectedProduct, onMovementSuccess }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preSelectedProduct ?? null)
  const [type, setType] = useState<MovementType>('entrada')
  const [quantity, setQuantity] = useState('1')
  const [errors, setErrors] = useState<{ product?: string; quantity?: string }>({})
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Sincroniza se o componente pai passar um produto pré-selecionado (ex: via botão "Repor" do painel de alertas)
  useEffect(() => {
    if (preSelectedProduct) {
      setSelectedProduct(preSelectedProduct)
      setType('entrada')
      setNotice(null)
      setErrors({})
    }
  }, [preSelectedProduct])

  // Mantém o objeto de produto atualizado com o estoque mais recente da lista de produtos
  const currentProduct = selectedProduct
    ? (products.find((p) => p.id === selectedProduct.id) ?? selectedProduct)
    : null

  const qty = Number(quantity)

  function changeQuantity(next: number) {
    setQuantity(String(Math.max(1, next)))
    setErrors((e) => ({ ...e, quantity: undefined }))
    setNotice(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!currentProduct) {
      setErrors({ product: 'Selecione um produto.' })
      setNotice(null)
      return
    }

    const validation = validateMovement(
      currentProduct.id,
      type,
      qty || '',
      currentProduct.stock,
    )

    if (!validation.ok) {
      if (validation.error.includes('produto')) {
        setErrors({ product: validation.error })
      } else {
        setErrors({ quantity: validation.error })
      }
      setNotice(null)
      return
    }

    setErrors({})
    setSubmitting(true)
    setNotice(null)

    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const novoSaldo = calculateNewBalance(currentProduct.stock, type, qty)

      await registrarMovimentacao(
        currentProduct.id,
        type,
        qty,
        novoSaldo,
        uid,
      )

      setNotice({
        tone: 'success',
        text: `${type === 'entrada' ? 'Entrada' : 'Saída'} de ${qty} ${qty === 1 ? 'unidade' : 'unidades'} registrada para "${currentProduct.name}". Novo saldo: ${novoSaldo} un.`,
      })
      setSelectedProduct(null)
      setQuantity('1')
      onMovementSuccess?.()
    } catch (err) {
      console.error('Erro ao registrar movimentação:', err)
      setNotice({
        tone: 'error',
        text: describeEstoqueError(err),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="movement-form-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="movement-form-title" className="text-base font-semibold text-foreground">
          Registrar Movimentação
        </h2>
        <span className="text-xs text-muted-foreground">Gravação atômica com validação de regras</span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-start">
          {/* Seletor de produto com Combobox */}
          <div className="flex flex-col gap-2">
            <label htmlFor="movement-product" className="text-sm font-medium text-foreground">
              Produto
            </label>
            <ProductCombobox
              id="movement-product"
              products={products}
              selected={currentProduct}
              onSelect={(p) => {
                setSelectedProduct(p)
                setErrors((e) => ({ ...e, product: undefined, quantity: undefined }))
                setNotice(null)
              }}
              invalid={Boolean(errors.product)}
              describedBy={errors.product ? 'movement-product-error' : undefined}
            />
            {errors.product && (
              <p id="movement-product-error" className="text-xs font-medium text-destructive">
                {errors.product}
              </p>
            )}
          </div>

          {/* Tipo de movimentação (Entrada / Saída) */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Tipo</legend>
            <div role="radiogroup" className="grid h-12 grid-cols-2 gap-1 rounded-xl bg-muted p-1 lg:w-56">
              {TYPE_OPTIONS.map((option) => {
                const checked = type === option.value
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => {
                      setType(option.value)
                      setErrors((e) => ({ ...e, quantity: undefined }))
                      setNotice(null)
                    }}
                    disabled={submitting}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50',
                      checked
                        ? option.value === 'entrada'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-red-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Quantidade com botões +/- */}
          <div className="flex flex-col gap-2">
            <label htmlFor="movement-quantity" className="text-sm font-medium text-foreground">
              Quantidade
            </label>
            <div
              className={cn(
                'flex h-12 items-center rounded-xl border bg-card shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 dark:bg-input/20 lg:w-36',
                errors.quantity ? 'border-destructive' : 'border-input',
              )}
            >
              <button
                type="button"
                onClick={() => changeQuantity((qty || 1) - 1)}
                disabled={submitting || qty <= 1}
                className="flex h-full w-12 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <Minus className="size-4" aria-hidden="true" />
                <span className="sr-only">Diminuir quantidade</span>
              </button>
              <input
                id="movement-quantity"
                type="number"
                inputMode="numeric"
                min={1}
                value={quantity}
                disabled={submitting}
                onChange={(e) => {
                  setQuantity(e.target.value)
                  setErrors((er) => ({ ...er, quantity: undefined }))
                  setNotice(null)
                }}
                aria-invalid={Boolean(errors.quantity) || undefined}
                aria-describedby={errors.quantity ? 'movement-quantity-error' : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-center text-base font-semibold tabular-nums text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => changeQuantity((qty || 0) + 1)}
                disabled={submitting}
                className="flex h-full w-12 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="sr-only">Aumentar quantidade</span>
              </button>
            </div>
            {errors.quantity && (
              <p id="movement-quantity-error" className="text-xs font-medium text-destructive">
                {errors.quantity}
              </p>
            )}
          </div>

          {/* Botão de confirmação */}
          <div className="flex flex-col gap-2">
            <span aria-hidden="true" className="hidden text-sm lg:block">
              &nbsp;
            </span>
            <Button
              type="submit"
              disabled={submitting}
              className="h-12 rounded-xl px-6 text-base font-semibold shadow-sm shadow-primary/20 lg:text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Gravando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </div>

        {/* Feedback visual de sucesso ou erro */}
        <div aria-live="polite">
          {notice && notice.tone === 'success' && (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {notice.text}
            </p>
          )}
          {notice && notice.tone === 'error' && (
            <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {notice.text}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
