import { History } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { formatMovementDate, type Movement } from '../../lib/stock'
import { MovementBadge, SignedQuantity } from './movement-badge'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function UserTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground"
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}

export function MovementHistory({ movements }: { movements: Movement[] }) {
  return (
    <section aria-labelledby="movement-history-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="movement-history-title" className="text-base font-semibold text-foreground">
          Últimas movimentações
        </h2>
        <span className="text-xs text-muted-foreground">{movements.length} registros</span>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <History className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="h-11 pl-5">Produto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="pr-5">Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const { date, time } = formatMovementDate(m.date)
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="py-3 pl-5">
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold text-foreground">{m.productName}</span>
                          <span className="text-xs text-muted-foreground">Tam. {m.productSize}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <time dateTime={m.date} className="flex flex-col leading-tight">
                          <span className="text-foreground">{date}</span>
                          <span className="text-xs text-muted-foreground">{time}</span>
                        </time>
                      </TableCell>
                      <TableCell>
                        <MovementBadge type={m.type} />
                      </TableCell>
                      <TableCell className="text-right">
                        <SignedQuantity type={m.type} quantity={m.quantity} />
                      </TableCell>
                      <TableCell className="pr-5 text-muted-foreground">
                        <UserTag name={m.user} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {movements.map((m) => {
              const { date, time } = formatMovementDate(m.date)
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <MovementBadge type={m.type} />
                      <h3 className="font-semibold leading-snug text-foreground text-pretty">
                        {m.productName}
                        <span className="font-normal text-muted-foreground"> · Tam. {m.productSize}</span>
                      </h3>
                    </div>
                    <span className="text-xl">
                      <SignedQuantity type={m.type} quantity={m.quantity} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
                    <UserTag name={m.user} />
                    <time dateTime={m.date} className="shrink-0 text-xs">
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
