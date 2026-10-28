import { Shirt } from 'lucide-react'

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
        <Shirt className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="text-base font-bold tracking-tight text-foreground">
        LojaDeRoupas<span className="text-primary">UFSCar</span>
      </span>
    </div>
  )
}
