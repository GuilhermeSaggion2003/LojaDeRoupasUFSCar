import { useEffect, useState } from 'react'
import { History, Lock, ShoppingCart } from 'lucide-react'
import { PosView } from '../components/sales/pos-view'
import { SalesHistoryView } from '../components/sales/sales-history-view'
import { useSession } from '../hooks/use-session'
import { cn } from '../lib/utils'

export type VendasTab = 'pos' | 'history'

export default function VendasPage() {
  const { isGerente } = useSession()
  const [activeTab, setActiveTab] = useState<VendasTab>('pos')

  useEffect(() => {
    document.title =
      activeTab === 'pos'
        ? 'Frente de Caixa (PDV) | LojaDeRoupasUFSCar'
        : 'Histórico de Vendas | LojaDeRoupasUFSCar'
  }, [activeTab])

  return (
    <div className="flex flex-col gap-6">
      {/* Navegação entre Abas (PDV e Histórico Gerencial) */}
      <div className="flex border-b border-border">
        <nav aria-label="Abas de Vendas" className="-mb-px flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer',
              activeTab === 'pos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            Frente de Caixa (PDV)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer',
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            <History className="size-4" aria-hidden="true" />
            Histórico de Vendas
            {!isGerente && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Lock className="size-2.5" aria-hidden="true" />
                Gerente
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'pos' ? (
        <PosView />
      ) : isGerente ? (
        <SalesHistoryView />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-12 text-center text-blue-800 dark:text-blue-300">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <Lock className="size-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold">Acesso Restrito ao Gerente</h2>
          <p className="text-sm max-w-md text-blue-700 dark:text-blue-200">
            Conforme as regras de negócio e controle de acesso (RF01 e RF06), o histórico completo e métricas financeiras de vendas são de acesso exclusivo do perfil Gerente. O perfil Funcionário tem acesso irrestrito à Frente de Caixa (PDV).
          </p>
        </div>
      )}
    </div>
  )
}
