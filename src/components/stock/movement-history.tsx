import { History } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { formatMovementDate, type StockMovement } from '../../lib/estoque'
import type { Product } from '../../lib/products'
import { MovementBadge, SignedQuantity } from './movement-badge'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function UserTag({ uid }: { uid: string }) {
  const shortUid = uid.length > 8 ? uid.slice(0, 8) : uid
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground"
        aria-hidden="true"
      >
        {initials(shortUid || 'OP')}
      </span>
      <span className="truncate text-xs font-medium text-muted-foreground" title={uid}>
        {shortUid}
      </span>
    </span>
  )
}

type Props = {
  movements: StockMovement[]
  productMap: Record<string, Product>
}

export function MovementHistory({ movements, productMap }: Props) {
  return (
    <section aria-labelledby="movement-history-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="movement-history-title" className="text-base font-semibold text-foreground">
          Histórico em tempo real
        </h2>
        <span className="text-xs text-muted-foreground">
          {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <History className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada para os filtros selecionados.</p>
        </div>
      ) : (
        <>
          {/* Visualização em Tabela para Desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="h-11 pl-5">Produto</TableHead>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="pr-5">Operador (UID)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const product = productMap[m.produtoId]
                  const { date, time } = formatMovementDate(m.data)
                  const productName = product?.name ?? `Produto (${m.produtoId})`
                  const productDetails = product
                    ? `Tam. ${product.size} · Cor ${product.color.name}`
                    : 'Detalhes indisponíveis'

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="py-3 pl-5">
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold text-foreground">{productName}</span>
                          <span className="text-xs text-muted-foreground">{productDetails}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <time className="flex flex-col leading-tight">
                          <span className="text-foreground">{date}</span>
                          <span className="text-xs text-muted-foreground">{time}</span>
                        </time>
                      </TableCell>
                      <TableCell>
                        <MovementBadge type={m.tipo} />
                      </TableCell>
                      <TableCell className="text-right">
                        <SignedQuantity type={m.tipo} quantity={m.quantidade} />
                      </TableCell>
                      <TableCell className="pr-5 text-muted-foreground">
                        <UserTag uid={m.usuarioId} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Visualização em Cards para Mobile */}
          <ul className="flex flex-col gap-3 md:hidden">
            {movements.map((m) => {
              const product = productMap[m.produtoId]
              const { date, time } = formatMovementDate(m.data)
              const productName = product?.name ?? `Produto (${m.produtoId})`
              const productDetails = product
                ? `Tam. ${product.size} · Cor ${product.color.name}`
                : ''

              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <MovementBadge type={m.tipo} />
                      <h3 className="font-semibold leading-snug text-foreground text-pretty">
                        {productName}
                        {productDetails && (
                          <span className="font-normal text-muted-foreground"> · {productDetails}</span>
                        )}
                      </h3>
                    </div>
                    <span className="text-xl">
                      <SignedQuantity type={m.tipo} quantity={m.quantidade} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
                    <UserTag uid={m.usuarioId} />
                    <time className="shrink-0 text-xs">
                      {date} · {time}
                    </time>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
