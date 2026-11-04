import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase' // Confirme se o caminho para o firebase.ts está correto
import { cn } from '../../lib/utils'
import { BrandMark } from './brand-mark'
import { LOGOUT_ITEM, NAV_ITEMS } from './nav-items'

interface MobileHeaderProps {
  nome?: string;
  perfil?: string | null;
}

export function MobileHeader({ nome, perfil }: MobileHeaderProps) {
  const inicial = nome ? nome.charAt(0).toUpperCase() : (perfil === 'gerente' ? 'G' : 'F')
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md md:hidden">
      <BrandMark />
      <span
        className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
        aria-label={`${nome || 'Usuário'}, ${perfil || 'Perfil'}`}
      >
        {inicial}
      </span>
    </header>
  )
}

interface MobileNavProps {
  perfil: string | null;
}

export function MobileBottomNav({ perfil: _perfil }: MobileNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Todos os itens de menu estão disponíveis para gerente e funcionário
  const menuPermitido = NAV_ITEMS

  const items = [...menuPermitido, LOGOUT_ITEM]

  // Função que destrói a sessão no Firebase
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error)
    }
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const isLogout = item === LOGOUT_ITEM
          const active = !isLogout && pathname.startsWith(item.href || '')
          const Icon = item.icon

          // Classes base para manter o visual idêntico no botão e no link
          const baseClasses = cn(
            'flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
            active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          )

          // O conteúdo visual (ícone e texto) que vai dentro do botão ou do link
          const innerContent = (
            <>
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  active && 'bg-primary/12',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              {item.label}
            </>
          )

          return (
            <li key={item.label}>
              {isLogout ? (
                // Se for o botão de sair, usamos a tag <button> e disparamos o Firebase
                <button type="button" onClick={handleLogout} className={baseClasses}>
                  {innerContent}
                </button>
              ) : (
                // Se for os outros menus, usamos o <Link> normal do React Router
                <Link
                  to={item.href || '/'}
                  aria-current={active ? 'page' : undefined}
                  className={baseClasses}
                >
                  {innerContent}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}