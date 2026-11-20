import { useEffect } from 'react'
import { Lock } from 'lucide-react'
import { ReportsView } from '../components/reports/reports-view'
import { useSession } from '../hooks/use-session'

export default function RelatoriosPage() {
  const { isGerente } = useSession()

  useEffect(() => {
    document.title = 'Relatórios | LojaDeRoupasUFSCar'
  }, [])

  // Relatórios são exclusivos do Gerente (RF01). O funcionário que acessar a URL
  // diretamente vê o aviso e nenhuma consulta é feita ao Firestore.
  if (!isGerente) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-12 text-center text-blue-800 dark:text-blue-300">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
          <Lock className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold">Acesso Restrito ao Gerente</h1>
        <p className="max-w-md text-sm text-blue-700 dark:text-blue-200">
          Os relatórios de vendas, movimentação de estoque e produtos mais vendidos são de acesso
          exclusivo do perfil Gerente (RF01).
        </p>
      </div>
    )
  }

  return <ReportsView />
}
