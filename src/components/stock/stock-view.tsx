import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Eye, Loader2 } from 'lucide-react'
import { useProducts } from '../../hooks/use-products'
import { useSession } from '../../hooks/use-session'
import {
  filterMovementsByCategory,
  filterProductsByCategory,
  type StockMovement,
} from '../../lib/estoque'
import { describeEstoqueError, subscribeMovements } from '../../lib/estoque-db'
import type { Category, Product } from '../../lib/products'
import { MovementForm } from './movement-form'
import { MovementHistory } from './movement-history'
import { StockAlerts } from './stock-alerts'
import { StockToolbar, type CategoryFilter } from './stock-toolbar'

export function StockView() {
  const { isGerente, perfil } = useSession()
  const { products, loading: productsLoading, error: productsError } = useProducts()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [movementsError, setMovementsError] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [preSelectedProduct, setPreSelectedProduct] = useState<Product | null>(null)

  // Escuta as movimentações em tempo real do Firestore via onSnapshot
  useEffect(() => {
    const unsubscribe = subscribeMovements(
      (data) => {
        setMovements(data)
        setMovementsLoading(false)
        setMovementsError(null)
      },
      (err) => {
        console.error('Erro ao escutar movimentações de estoque:', err)
        setMovementsError(describeEstoqueError(err))
        setMovementsLoading(false)
      },
    )
    return () => unsubscribe()
  }, [])

  // Mapas para joins rápidos
  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  )

  const categoryMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.category])) as Record<string, Category>,
    [products],
  )

  // Produtos filtrados por categoria para a exibição de alertas
  const filteredProducts = useMemo(
    () => filterProductsByCategory(products, category),
    [products, category],
  )

  // Movimentações filtradas por categoria do produto
  const filteredMovements = useMemo(
    () => filterMovementsByCategory(movements, categoryMap, category),
    [movements, categoryMap, category],
  )

  const isLoading = productsLoading || movementsLoading

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho da página com identificador de perfil */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Controle de Estoque
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe indicadores, alertas de reposição e registre entradas e saídas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-xs">
            Perfil:
            <span className="capitalize font-bold text-primary">
              {perfil || (isGerente ? 'gerente' : 'funcionário')}
            </span>
          </span>
        </div>
      </header>

      {/* Alerta de erro de conexão/permissão, se houver */}
      {(productsError || movementsError) && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">
            {productsError || movementsError}
          </p>
        </div>
      )}

      {/* Barra de Filtro por Categoria (Select no desktop, botões deslizáveis no mobile) */}
      <StockToolbar category={category} onCategoryChange={setCategory} />

      {/* Painel de Indicadores de Nível e Alertas de Baixa/Esgotado */}
      <StockAlerts
        products={filteredProducts}
        isGerente={isGerente}
        onSelectProductForRestock={(product) => {
          setPreSelectedProduct(product)
          // Rola suavemente até o formulário se estiver no desktop
          window.scrollTo({ top: 300, behavior: 'smooth' })
        }}
      />

      {/* Formulário de Registro de Movimentação (Exclusivo para Gerente) */}
      {isGerente ? (
        <MovementForm
          products={products}
          preSelectedProduct={preSelectedProduct}
          onMovementSuccess={() => setPreSelectedProduct(null)}
        />
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-800 dark:text-blue-300">
          <Eye className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <div className="text-sm">
            <span className="font-semibold">Modo de Consulta (Funcionário):</span> Você tem permissão para visualizar o estoque atual, os alertas de reposição e o histórico completo de movimentações. O registro de novas entradas e saídas é restrito ao perfil de Gerente.
          </div>
        </div>
      )}

      {/* Histórico de Movimentações em Tempo Real */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Carregando dados de estoque...</p>
        </div>
      ) : (
        <MovementHistory movements={filteredMovements} productMap={productMap} />
      )}
    </div>
  )
}
