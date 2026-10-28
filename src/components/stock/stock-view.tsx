import { useState } from 'react'
import { INITIAL_PRODUCTS, type Product } from '../../lib/products'
import { CURRENT_USER, INITIAL_MOVEMENTS, type Movement, type MovementType } from '../../lib/stock'
import { MovementForm } from './movement-form'
import { MovementHistory } from './movement-history'

export function StockView() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [movements, setMovements] = useState<Movement[]>(INITIAL_MOVEMENTS)

  function registerMovement(product: Product, type: MovementType, quantity: number) {
    const delta = type === 'entrada' ? quantity : -quantity
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: p.stock + delta } : p)),
    )
    setMovements((prev) => [
      {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        productSize: product.size,
        type,
        quantity,
        date: new Date().toISOString(),
        user: CURRENT_USER,
      },
      ...prev,
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Estoque</h1>
        <p className="text-sm text-muted-foreground">
          Registre entradas e saídas e acompanhe o histórico.
        </p>
      </header>

      <MovementForm products={products} onSubmit={registerMovement} />
      <MovementHistory movements={movements} />
    </div>
  )
}
