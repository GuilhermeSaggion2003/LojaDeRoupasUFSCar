import { useOutletContext } from 'react-router-dom'

export type Perfil = 'gerente' | 'funcionario'

export type Session = {
  nome: string
  perfil: Perfil | null
}

/** Dados do usuário logado, fornecidos pelo DashboardLayout via <Outlet context>. */
export function useSession() {
  const session = useOutletContext<Session>()
  return { ...session, isGerente: session.perfil === 'gerente' }
}
