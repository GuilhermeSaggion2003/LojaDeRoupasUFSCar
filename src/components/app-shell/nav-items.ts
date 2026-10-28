import { Boxes, LogOut, Receipt, Shirt, type LucideIcon } from 'lucide-react'

export type NavItem = { label: string; href?: string; icon: LucideIcon }

export const NAV_ITEMS: NavItem[] = [
  { label: 'Produtos', href: '/produtos', icon: Shirt },
  { label: 'Estoque', href: '/estoque', icon: Boxes },
  { label: 'Vendas', href: '/vendas', icon: Receipt },
]

export const LOGOUT_ITEM: NavItem = { label: 'Sair', icon: LogOut }