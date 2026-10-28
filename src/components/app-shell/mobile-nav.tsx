import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { BrandMark } from './brand-mark'
import { LOGOUT_ITEM, NAV_ITEMS } from './nav-items'

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md md:hidden">
      <BrandMark />
      <span
        className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
        aria-label="Ana Martins, Gerente"
      >
        AM
      </span>
    </header>
  )
}

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const items = [...NAV_ITEMS, LOGOUT_ITEM]

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = item !== LOGOUT_ITEM && pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Link
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-primary/12',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
