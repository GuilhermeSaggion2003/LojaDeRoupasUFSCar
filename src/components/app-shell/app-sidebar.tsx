 

import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { BrandMark } from './brand-mark'
import { LOGOUT_ITEM, NAV_ITEMS } from './nav-items'

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <BrandMark />
      </div>

      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
            AM
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Ana Martins</p>
            <p className="text-xs text-muted-foreground">Gerente</p>
          </div>
        </div>
        <Link
          to={LOGOUT_ITEM.href}
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LOGOUT_ITEM.icon className="size-4" aria-hidden="true" />
          {LOGOUT_ITEM.label}
        </Link>
      </div>
    </aside>
  )
}
