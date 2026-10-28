import { useEffect } from 'react';
import { StockView } from '../components/stock/stock-view';

export default function VendasPage() {
  useEffect(() => {
    document.title = 'Vendas | LojaDeRoupasUFSCar';
  }, []);

  return <StockView />;
}