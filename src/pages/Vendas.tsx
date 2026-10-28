import { useEffect } from 'react';
import { PosView } from '../components/sales/pos-view';

export default function VendasPage() {
  useEffect(() => {
    document.title = 'Vendas | LojaDeRoupasUFSCar';
  }, []);

  return <PosView />;
}