import { useEffect } from 'react';
import { StockView } from '../components/stock/stock-view';

export default function ProdutosPage() {
  useEffect(() => {
    document.title = 'Produtos | LojaDeRoupasUFSCar';
  }, []);

  return <StockView />;
}