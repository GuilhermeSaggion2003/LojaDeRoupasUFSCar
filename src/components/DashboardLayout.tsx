import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase' // Confirme se o caminho para o firebase.ts está correto
import { AppSidebar } from './app-shell/app-sidebar'
import { MobileBottomNav, MobileHeader } from './app-shell/mobile-nav'
import type { Perfil, Session } from '../hooks/use-session'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation() 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [nome, setNome] = useState<string>('Carregando...')

  // 1. Descobrir quem é o utilizador e qual o seu cargo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/')
        setIsCheckingAuth(false)
      } else {
        try {
          console.log("UID do usuário logado:", user.uid);
          // Vai à coleção 'usuarios' e procura o documento com o UID de quem fez login
          const docRef = doc(db, 'usuarios', user.uid)
          const docSnap = await getDoc(docRef)
          
          if (docSnap.exists()) {
            setNome(docSnap.data().nome || 'Usuário')
            setPerfil(docSnap.data().perfil) // Guarda se é 'gerente' ou 'funcionario'
          } else {
            console.error("Utilizador sem cargo atribuído no banco de dados!")
            navigate('/')
          }
        } catch (error) {
          console.error("Erro ao ler o perfil do Firestore:", error)
        } finally {
          setIsCheckingAuth(false)
        }
      }
    })

    return () => unsubscribe()
  }, [navigate])

  useEffect(() => {
    // Bloqueia o funcionário APENAS se ele tentar aceder ao estoque
    if (perfil === 'funcionario' && location.pathname.includes('/estoque')) {
      navigate('/vendas') 
    }
  }, [perfil, location.pathname, navigate])

  if (isCheckingAuth) {
    return <div className="min-h-dvh bg-background flex items-center justify-center">Verificando permissões...</div>
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Passamos o 'perfil' para a sidebar para que ela saiba que botões esconder */}
      <AppSidebar perfil={perfil} nome={nome} />
      <MobileHeader nome={nome} perfil={perfil}/>
      <main className="pb-24 md:pb-0 md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {/* Disponibiliza nome e perfil às páginas (ver hooks/use-session) */}
          <Outlet context={{ nome, perfil } satisfies Session} />
        </div>
      </main>
      <MobileBottomNav perfil={perfil} />
    </div>
  )
}