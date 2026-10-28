import { useEffect } from 'react';
import { ProductsView } from '../components/products/products-view';

export default function ProdutosPage() {
  useEffect(() => {
    document.title = 'Produtos | LojaDeRoupasUFSCar';
  }, []);

  return <ProductsView />;
}