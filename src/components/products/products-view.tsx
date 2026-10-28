import { useMemo, useState } from 'react'
import { PackageSearch, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { INITIAL_PRODUCTS, type Product } from '../../lib/products'
import { ProductsToolbar, type CategoryFilter } from './products-toolbar'
import { ProductsTable } from './products-table'
import { ProductCards } from './product-cards'
import { DeleteProductDialog } from './delete-product-dialog'

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function ProductsView() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      return normalize(`${p.name} ${p.color.name} ${p.size}`).includes(q)
    })
  }, [products, query, category])

  function handleEdit(_product: Product) {}

  function confirmDelete() {
    if (!pendingDelete) return
    setProducts((prev) => prev.filter((p) => p.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
          </p>
        </div>
        <Button className="h-11 gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm shadow-primary/20">
          <Plus className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Novo Produto</span>
        </Button>
      </header>

      <ProductsToolbar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <PackageSearch className="size-10 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-foreground">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground">Ajuste a busca ou o filtro de categoria.</p>
          </div>
        </div>
      ) : (
        <>
          <ProductsTable products={filtered} onEdit={handleEdit} onDelete={setPendingDelete} />
          <ProductCards products={filtered} onEdit={handleEdit} onDelete={setPendingDelete} />
        </>
      )}

      <DeleteProductDialog
        product={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
