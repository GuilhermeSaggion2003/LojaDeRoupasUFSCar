import { Shirt } from 'lucide-react'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className || ''}`}>
      <div className="relative flex size-16 items-center justify-center rounded-2xl bg-[#fbb03b] text-slate-950 shadow-lg shadow-amber-500/20">
        <Shirt className="size-8" strokeWidth={2} aria-hidden="true" />
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-[#111927] bg-white text-[10px] font-black text-slate-950">
          U
        </span>
      </div>
      <p className="text-center text-lg font-bold tracking-tight text-white">
        LojaDeRoupas<span className="text-[#fbb03b]">UFSCar</span>
      </p>
    </div>
  )
}
