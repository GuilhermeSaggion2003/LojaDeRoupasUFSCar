import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { formatPrice, type Product } from '../../lib/products'
import { ColorSwatch, ProductActions, StockIndicator, type RowActions } from './product-parts'

export function ProductsTable({ products, onEdit, onDelete }: RowActions & { products: Product[] }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="h-11 pl-5">Nome</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Estoque Atual</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="py-3 pl-5 font-semibold text-foreground">{product.name}</TableCell>
              <TableCell>
                <span className="inline-flex min-w-9 justify-center rounded-md border border-border px-2 py-0.5 text-xs font-semibold">
                  {product.size}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <ColorSwatch color={product.color} />
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatPrice(product.price)}
              </TableCell>
              <TableCell>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {product.category}
                </span>
              </TableCell>
              <TableCell>
                <StockIndicator stock={product.stock} />
              </TableCell>
              <TableCell className="pr-4">
                <ProductActions
                  product={product}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  className="justify-end"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
