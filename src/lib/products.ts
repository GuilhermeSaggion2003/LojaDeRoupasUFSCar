export type Product = {
  id: string
  name: string
  size: string
  color: { name: string; hex: string }
  price: number
  category: Category
  stock: number
}

export const CATEGORIES = [
  'Camisetas',
  'Moletons',
  'Calças',
  'Bonés',
  'Acessórios',
] as const

export type Category = (typeof CATEGORIES)[number]

export const LOW_STOCK_THRESHOLD = 5

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Camiseta Básica UFSCar', size: 'M', color: { name: 'Azul-marinho', hex: '#1e2a5a' }, price: 59.9, category: 'Camisetas', stock: 42 },
  { id: 'p2', name: 'Camiseta Computação', size: 'G', color: { name: 'Preto', hex: '#111827' }, price: 64.9, category: 'Camisetas', stock: 3 },
  { id: 'p3', name: 'Moletom Canguru Federal', size: 'GG', color: { name: 'Cinza mescla', hex: '#9ca3af' }, price: 149.9, category: 'Moletons', stock: 18 },
  { id: 'p4', name: 'Moletom Zíper Engenharia', size: 'M', color: { name: 'Vinho', hex: '#7f1d1d' }, price: 169.9, category: 'Moletons', stock: 0 },
  { id: 'p5', name: 'Calça Jogger Atlética', size: '40', color: { name: 'Preto', hex: '#111827' }, price: 119.9, category: 'Calças', stock: 12 },
  { id: 'p6', name: 'Boné Aba Curva UFSCar', size: 'Único', color: { name: 'Dourado', hex: '#d4a017' }, price: 49.9, category: 'Bonés', stock: 25 },
  { id: 'p7', name: 'Ecobag Campus São Carlos', size: 'Único', color: { name: 'Cru', hex: '#e7dcc5' }, price: 34.9, category: 'Acessórios', stock: 5 },
  { id: 'p8', name: 'Camiseta Baby Look Biologia', size: 'P', color: { name: 'Verde', hex: '#166534' }, price: 59.9, category: 'Camisetas', stock: 31 },
  { id: 'p9', name: 'Caneca Térmica UFSCar', size: '450 ml', color: { name: 'Branco', hex: '#f8fafc' }, price: 54.9, category: 'Acessórios', stock: 9 },
]

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatPrice(value: number) {
  return currency.format(value)
}
