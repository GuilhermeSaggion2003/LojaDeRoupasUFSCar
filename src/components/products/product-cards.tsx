import { formatPrice, type Product } from '../../lib/products'
import { ColorSwatch, ProductActions, StockIndicator, type RowActions } from './product-parts'

export function ProductCards({ products, onEdit, onDelete }: RowActions & { products: Product[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="w-fit rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {product.category}
              </span>
              <h2 className="font-semibold leading-snug text-foreground text-pretty">{product.name}</h2>
            </div>
            <ProductActions product={product} onEdit={onEdit} onDelete={onDelete} className="-mt-1 -mr-2" />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Tamanho</dt>
              <dd className="font-medium text-foreground">{product.size}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Cor</dt>
              <dd className="font-medium text-foreground">
                <ColorSwatch color={product.color} />
              </dd>
            </div>
          </dl>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-lg font-bold tabular-nums text-primary">{formatPrice(product.price)}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground">Estoque</span>
              <StockIndicator stock={product.stock} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
