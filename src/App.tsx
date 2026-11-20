import { Routes, Route } from 'react-router-dom';
import LoginPage from './login';
import DashboardLayout from './components/DashboardLayout';
import Produtos from './pages/Produtos';
import Vendas from './pages/Vendas';
import Estoque from './pages/Estoque';
import Relatorios from './pages/Relatorios';

function App() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/" element={<LoginPage />} />

      {/* Rotas protegidas (envolvidas pelo Layout com o menu) */}
      <Route element={<DashboardLayout />}>
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/relatorios" element={<Relatorios />} />
      </Route>
    </Routes>
  );
}

export default App;