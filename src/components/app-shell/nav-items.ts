import { BarChart3, Boxes, LogOut, Receipt, Shirt, type LucideIcon } from 'lucide-react'

export type NavItem = { label: string; href?: string; icon: LucideIcon; gerenteOnly?: boolean }

export const NAV_ITEMS: NavItem[] = [
  { label: 'Produtos', href: '/produtos', icon: Shirt },
  { label: 'Estoque', href: '/estoque', icon: Boxes },
  { label: 'Vendas', href: '/vendas', icon: Receipt },
  // Relatórios (A8) são funcionalidade de gestão: exclusivos do perfil Gerente (RF01)
  { label: 'Relatórios', href: '/relatorios', icon: BarChart3, gerenteOnly: true },
]

/** Itens de menu visíveis para o perfil informado. */
export function navItemsFor(perfil: string | null | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.gerenteOnly || perfil === 'gerente')
}

export const LOGOUT_ITEM: NavItem = { label: 'Sair', icon: LogOut }