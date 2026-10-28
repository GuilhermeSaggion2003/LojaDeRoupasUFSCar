import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase' // Verifique se o caminho do firebase está correto
import { AppSidebar } from './app-shell/app-sidebar'
import { MobileBottomNav, MobileHeader } from './app-shell/mobile-nav'

export default function DashboardLayout() {
  const navigate = useNavigate()
  // Estado para evitar que a tela pisque antes de o Firebase confirmar quem é o usuário
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // O onAuthStateChanged fica "escutando" o status do login em tempo real
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Se não houver usuário logado, expulsa de volta para a tela inicial
        navigate('/')
      } else {
        // Se estiver logado, libera a renderização da tela
        setIsCheckingAuth(false)
      }
    })

    // Limpa o "escutador" se o componente for destruído
    return () => unsubscribe()
  }, [navigate])

  // Enquanto estiver validando com o servidor, mostra uma tela branca (ou poderia ser um ícone de loading)
  if (isCheckingAuth) {
    return <div className="min-h-dvh bg-background flex items-center justify-center">Verificando segurança...</div>
  }

  // Se passou pela verificação (isCheckingAuth for false), renderiza o sistema normalmente
  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar />
      <MobileHeader />
      <main className="pb-24 md:pb-0 md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}