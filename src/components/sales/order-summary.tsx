import { useId, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import {
  TRANSACTION_TYPES,
  calculateDiscount,
  calculateSubtotal,
  calculateTotal,
  cartItemToSaleItem,
  formatCents,
  type CartItem,
  type DiscountMode,
  type SaleItem,
  type TransactionType,
} from '../../lib/sales'
import { cn } from '../../lib/utils'

type Props = {
  items: CartItem[]
  type: TransactionType
  onTypeChange: (type: TransactionType) => void
  onFinalize: (data: {
    subtotal: number
    desconto: number
    total: number
    saleItems: SaleItem[]
  }) => void
  submitting?: boolean
}

export function OrderSummary({ items, type, onTypeChange, onFinalize, submitting }: Props) {
  const discountId = useId()
  const [discountMode, setDiscountMode] = useState<DiscountMode>('percent')
  const [discountInput, setDiscountInput] = useState('')

  const saleItems = items.map(cartItemToSaleItem)
  const subtotal = calculateSubtotal(saleItems)
  const discount = calculateDiscount(subtotal, discountMode, discountInput, type)
  const total = calculateTotal(subtotal, discount)
  const action = TRANSACTION_TYPES.find((t) => t.value === type)?.action ?? 'Finalizar Venda'
  const isEmpty = items.length === 0

  function handleFinalize() {
    if (isEmpty || submitting) return
    onFinalize({
      subtotal,
      desconto: discount,
      total,
      saleItems,
    })
    setDiscountInput('')
  }

  return (
    <aside
      aria-labelledby="summary-title"
      className="flex w-full flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-xs md:p-5 lg:sticky lg:top-6 lg:w-96 lg:shrink-0"
    >
      <div className="flex items-center justify-between">
        <h2 id="summary-title" className="font-semibold text-card-foreground">
          Resumo da Operação
        </h2>
        <span className="text-xs text-muted-foreground">Cálculo em centavos</span>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-card-foreground">Tipo de transação</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {TRANSACTION_TYPES.map((t) => (
            <label
              key={t.value}
              className={cn(
                'flex h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                type === t.value
                  ? 'bg-card text-card-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-card-foreground',
              )}
            >
              <input
                type="radio"
                name="transaction-type"
                value={t.value}
                checked={type === t.value}
                disabled={submitting}
                onChange={() => onTypeChange(t.value)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-semibold tabular-nums text-card-foreground">{formatCents(subtotal)}</dd>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <dt>
              <label htmlFor={discountId} className="text-muted-foreground">
                Desconto
              </label>
            </dt>
            <dd className="font-semibold tabular-nums text-card-foreground">
              {discount > 0 ? `− ${formatCents(discount)}` : formatCents(0)}
            </dd>
          </div>
          <div className="flex gap-2">
            <input
              id={discountId}
              inputMode="decimal"
              placeholder={discountMode === 'percent' ? '0 %' : 'R$ 0,00'}
              value={discountInput}
              disabled={type !== 'venda' || submitting}
              onChange={(e) => setDiscountInput(e.target.value.replace(/[^\d.,]/g, ''))}
              className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex rounded-xl bg-muted p-1" role="group" aria-label="Tipo de desconto">
              {(['percent', 'value'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={type !== 'venda' || submitting}
                  aria-pressed={discountMode === mode}
                  onClick={() => setDiscountMode(mode)}
                  className={cn(
                    'h-8 w-10 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50',
                    discountMode === mode
                      ? 'bg-card text-card-foreground shadow-xs'
                      : 'text-muted-foreground',
                  )}
                >
                  {mode === 'percent' ? '%' : 'R$'}
                </button>
              ))}
            </div>
          </div>
          {type !== 'venda' ? (
            <p className="text-xs text-muted-foreground">Desconto permitido apenas em operações de venda.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Desconto limitado automaticamente ao subtotal.</p>
          )}
        </div>

        <div className="mt-1 flex items-end justify-between border-t border-border pt-4">
          <dt className="text-base font-semibold text-card-foreground">
            {type === 'devolucao' ? 'Total a devolver' : 'Total'}
          </dt>
          <dd className="text-3xl font-bold tracking-tight tabular-nums text-card-foreground">
            {formatCents(total)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={handleFinalize}
        disabled={isEmpty || submitting}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-md transition-all hover:brightness-105 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Processando...
          </>
        ) : (
          <>
            <CheckCircle2 className="size-5" aria-hidden="true" />
            {action}
          </>
        )}
      </button>
    </aside>
  )
}
