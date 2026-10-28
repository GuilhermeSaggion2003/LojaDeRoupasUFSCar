import { useEffect } from 'react';
import { StockView } from '../components/stock/stock-view';

export default function EstoquePage() {
  useEffect(() => {
    document.title = 'Estoque | LojaDeRoupasUFSCar';
  }, []);

  return <StockView />;
}