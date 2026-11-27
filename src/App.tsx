import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import LoginPage from './login';
import DashboardLayout from './components/DashboardLayout';

// Carregamento sob demanda (A9): cada página vira um pacote JS separado,
// baixado só quando a rota é aberta. Reduz o pacote inicial do app.
const Produtos = lazy(() => import('./pages/Produtos'));
const Vendas = lazy(() => import('./pages/Vendas'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Relatorios = lazy(() => import('./pages/Relatorios'));

function PageFallback() {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Carregando…
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/" element={<LoginPage />} />

      {/* Rotas protegidas (envolvidas pelo Layout com o menu) */}
      <Route element={<DashboardLayout />}>
        <Route path="/produtos" element={<Suspense fallback={<PageFallback />}><Produtos /></Suspense>} />
        <Route path="/vendas" element={<Suspense fallback={<PageFallback />}><Vendas /></Suspense>} />
        <Route path="/estoque" element={<Suspense fallback={<PageFallback />}><Estoque /></Suspense>} />
        <Route path="/relatorios" element={<Suspense fallback={<PageFallback />}><Relatorios /></Suspense>} />
      </Route>
    </Routes>
  );
}

export default App;
