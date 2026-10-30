import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  CATEGORIES,
  EMPTY_PRODUCT_FORM,
  SIZE_SUGGESTIONS,
  findDuplicate,
  productToFormValues,
  validateProductForm,
  type Category,
  type Product,
  type ProductFormErrors,
  type ProductFormValues,
  type ProductInput,
} from '../../lib/products'
import { describeFirestoreError } from '../../lib/products-db'
import { cn } from '../../lib/utils'

type Props = {
  /** Produto em edição; null para cadastrar um novo. */
  product: Product | null
  /** Catálogo atual, usado para impedir cadastros duplicados. */
  products: Product[]
  onClose: () => void
  onSubmit: (input: ProductInput) => Promise<void>
}

const CATEGORY_ITEMS = CATEGORIES.map((c) => ({ value: c, label: c }))

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/20 md:text-sm'

export function ProductFormDialog({ product, products, onClose, onSubmit }: Props) {
  const isNew = product === null
  const [values, setValues] = useState<ProductFormValues>(() =>
    product ? productToFormValues(product) : EMPTY_PRODUCT_FORM,
  )
  const [errors, setErrors] = useState<ProductFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function setField<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const result = validateProductForm(values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    const duplicate = findDuplicate(products, result.input, product?.id)
    if (duplicate) {
      setErrors({ name: 'Já existe um produto com este nome, tamanho e cor.' })
      return
    }

    setSaving(true)
    try {
      await onSubmit(result.input)
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      setSubmitError(describeFirestoreError(error))
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Novo produto' : 'Editar produto'}</DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Preencha os dados para cadastrar o produto no catálogo.'
              : 'Altere os dados do produto do catálogo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field id="product-name" label="Nome" error={errors.name}>
            <input
              id="product-name"
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Ex.: Camiseta Básica UFSCar"
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'product-name-error' : undefined}
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="product-category" label="Categoria" error={errors.category}>
              <Select
                items={CATEGORY_ITEMS}
                value={values.category || null}
                onValueChange={(value) => setField('category', (value ?? '') as Category | '')}
              >
                <SelectTrigger
                  id="product-category"
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={errors.category ? 'product-category-error' : undefined}
                  className="h-11! w-full rounded-xl bg-card px-3.5 shadow-xs"
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="product-size" label="Tamanho" error={errors.size}>
              <input
                id="product-size"
                list="product-size-suggestions"
                value={values.size}
                onChange={(e) => setField('size', e.target.value)}
                placeholder="Ex.: M, 40, Único"
                autoComplete="off"
                aria-invalid={Boolean(errors.size)}
                aria-describedby={errors.size ? 'product-size-error' : undefined}
                className={inputClass}
              />
              <datalist id="product-size-suggestions">
                {SIZE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field id="product-color" label="Cor" error={errors.colorName ?? errors.colorHex}>
            <div className="flex gap-2">
              <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-input shadow-xs">
                <span className="sr-only">Escolher tonalidade</span>
                <input
                  type="color"
                  value={values.colorHex}
                  onChange={(e) => setField('colorHex', e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <span
                  aria-hidden="true"
                  className="block size-full"
                  style={{ backgroundColor: values.colorHex }}
                />
              </label>
              <input
                id="product-color"
                value={values.colorName}
                onChange={(e) => setField('colorName', e.target.value)}
                placeholder="Ex.: Azul-marinho"
                autoComplete="off"
                aria-invalid={Boolean(errors.colorName)}
                aria-describedby={errors.colorName ? 'product-color-error' : undefined}
                className={inputClass}
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="product-price" label="Preço (R$)" error={errors.price}>
              <input
                id="product-price"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="0,00"
                autoComplete="off"
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? 'product-price-error' : undefined}
                className={cn(inputClass, 'tabular-nums')}
              />
            </Field>

            {/* Estoque não é editável aqui: muda apenas por movimentações (módulo de Estoque) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                {isNew ? 'Estoque inicial' : 'Estoque atual'}
              </span>
              <p className="flex h-11 items-center rounded-xl border border-dashed border-border px-3.5 text-sm tabular-nums text-muted-foreground">
                {isNew
                  ? '0 unidades'
                  : `${product.stock} ${product.stock === 1 ? 'unidade' : 'unidades'}`}
              </p>
            </div>
          </div>

          <p className="-mt-2 text-xs text-muted-foreground">
            Entradas e saídas de mercadoria são registradas no módulo de Estoque.
          </p>

          {submitError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            >
              {submitError}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-4"
              disabled={saving}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 gap-2 rounded-xl px-5 font-semibold" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isNew ? 'Cadastrar produto' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
