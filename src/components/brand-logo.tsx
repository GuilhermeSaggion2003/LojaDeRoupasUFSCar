import { Shirt } from 'lucide-react'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className || ''}`}>
      <div className="relative flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        <Shirt className="size-8" strokeWidth={1.75} aria-hidden="true" />
        <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-brand-gold text-[10px] font-extrabold text-[oklch(0.22_0.04_262)] dark:bg-[oklch(0.36_0.12_262)] dark:text-white">
          U
        </span>
      </div>
      <p className="text-center text-xl font-bold tracking-tight text-foreground">
        LojaDeRoupas<span className="text-primary">UFSCar</span>
      </p>
    </div>
  )
}
