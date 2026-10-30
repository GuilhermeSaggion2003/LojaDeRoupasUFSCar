import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, DatabaseZap, Loader2, PackageSearch, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { filterProducts, type Product, type ProductInput } from '../../lib/products'
import {
  createProduct,
  deleteProduct,
  describeFirestoreError,
  seedSampleProducts,
  updateProduct,
} from '../../lib/products-db'
import { useProducts } from '../../hooks/use-products'
import { useSession } from '../../hooks/use-session'
import { ProductsToolbar, type CategoryFilter } from './products-toolbar'
import { ProductsTable } from './products-table'
import { ProductCards } from './product-cards'
import { DeleteProductDialog } from './delete-product-dialog'
import { ProductFormDialog } from './product-form-dialog'

type Notice = { tone: 'success' | 'error'; text: string }

export function ProductsView() {
  const { isGerente } = useSession()
  const { products, loading, error } = useProducts()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  // undefined = formulário fechado; null = novo produto; Product = edição
  const [editing, setEditing] = useState<Product | null | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [seeding, setSeeding] = useState(false)

  const filtered = useMemo(
    () => filterProducts(products, query, category),
    [products, query, category],
  )

  // Funcionário apenas consulta o catálogo (PGP, seção 2.1).
  const actions = isGerente
    ? { onEdit: (p: Product) => setEditing(p), onDelete: setPendingDelete }
    : undefined

  async function saveProduct(input: ProductInput) {
    if (editing) {
      await updateProduct(editing.id, input)
      setNotice({ tone: 'success', text: `Produto "${input.name}" atualizado.` })
    } else {
      await createProduct(input)
      setNotice({ tone: 'success', text: `Produto "${input.name}" cadastrado.` })
    }
    setEditing(undefined)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const product = pendingDelete
    setPendingDelete(null)
    try {
      await deleteProduct(product.id)
      setNotice({ tone: 'success', text: `Produto "${product.name}" excluído.` })
    } catch (err) {
      console.error('Erro ao excluir produto:', err)
      setNotice({ tone: 'error', text: describeFirestoreError(err) })
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      await seedSampleProducts()
      setNotice({ tone: 'success', text: 'Catálogo de exemplo importado.' })
    } catch (err) {
      console.error('Erro ao importar catálogo:', err)
      setNotice({ tone: 'error', text: describeFirestoreError(err) })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Carregando catálogo...'
              : `${products.length} ${products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}`}
          </p>
        </div>
        {isGerente && (
          <Button
            className="h-11 gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm shadow-primary/20"
            onClick={() => {
              setNotice(null)
              setEditing(null)
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Novo Produto</span>
          </Button>
        )}
      </header>

      <ProductsToolbar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
      />

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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Carregando produtos...
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="size-10 text-destructive" aria-hidden="true" />}
          title="Não foi possível carregar os produtos"
          description={error}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<DatabaseZap className="size-10 text-muted-foreground" aria-hidden="true" />}
          title="Nenhum produto cadastrado"
          description={
            isGerente
              ? 'Cadastre o primeiro produto ou importe o catálogo de exemplo.'
              : 'Aguarde o gerente cadastrar os produtos da loja.'
          }
        >
          {isGerente && (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4"
              disabled={seeding}
              onClick={handleSeed}
            >
              {seeding && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Importar catálogo de exemplo
            </Button>
          )}
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="size-10 text-muted-foreground" aria-hidden="true" />}
          title="Nenhum produto encontrado"
          description="Ajuste a busca ou o filtro de categoria."
        />
      ) : (
        <>
          <ProductsTable products={filtered} actions={actions} />
          <ProductCards products={filtered} actions={actions} />
        </>
      )}

      {editing !== undefined && (
        <ProductFormDialog
          key={editing?.id ?? 'novo'}
          product={editing}
          products={products}
          onClose={() => setEditing(undefined)}
          onSubmit={saveProduct}
        />
      )}

      <DeleteProductDialog
        product={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      {icon}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
