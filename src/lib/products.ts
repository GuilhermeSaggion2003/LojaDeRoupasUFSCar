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

export const SIZE_SUGGESTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'] as const

export const LOW_STOCK_THRESHOLD = 5

export const NAME_MAX_LENGTH = 100
export const SIZE_MAX_LENGTH = 20
export const COLOR_NAME_MAX_LENGTH = 40
export const MAX_PRICE_CENTS = 10_000_000 // R$ 100.000,00

// Catálogo de exemplo. Estoque e Vendas ainda o usam como dado local até as
// atividades A6/A7; em Produtos ele serve para popular um banco vazio (com
// estoque zero, pois as entradas são registradas no módulo de Estoque).
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

// ---------------------------------------------------------------------------
// Preço: o Firestore guarda centavos inteiros (int64) para evitar erros de
// arredondamento; a interface trabalha com reais.
// ---------------------------------------------------------------------------

export function toCents(reais: number) {
  return Math.round(reais * 100)
}

export function fromCents(cents: number) {
  return cents / 100
}

/**
 * Converte o texto digitado pelo usuário ("59,90", "1.234,56", "R$ 49") em
 * centavos. Retorna null se o texto não for um valor monetário válido.
 */
export function parsePriceToCents(input: string): number | null {
  let text = input.replace(/R\$/i, '').replace(/\s/g, '')
  if (!text) return null

  if (text.includes(',')) {
    // Formato brasileiro: ponto separa milhar, vírgula separa centavos.
    text = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    // "1.234" sem vírgula: ponto como separador de milhar.
    text = text.replace(/\./g, '')
  }

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  return toCents(Number(text))
}

/** Formata centavos para o campo de preço do formulário ("59,90"). */
export function formatPriceInput(reais: number) {
  return (toCents(reais) / 100).toFixed(2).replace('.', ',')
}

// ---------------------------------------------------------------------------
// Formulário de cadastro e edição
// ---------------------------------------------------------------------------

export type ProductFormValues = {
  name: string
  category: Category | ''
  size: string
  colorName: string
  colorHex: string
  price: string
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>

export type ProductInput = {
  name: string
  category: Category
  size: string
  color: { name: string; hex: string }
  priceCents: number
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: '',
  category: '',
  size: '',
  colorName: '',
  colorHex: '#1e2a5a',
  price: '',
}

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    category: product.category,
    size: product.size,
    colorName: product.color.name,
    colorHex: product.color.hex,
    price: formatPriceInput(product.price),
  }
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

type ValidationResult =
  | { ok: true; input: ProductInput }
  | { ok: false; errors: ProductFormErrors }

/**
 * Valida os campos do formulário de produto. O estoque não faz parte do
 * cadastro: ele começa em zero e muda apenas por movimentações (A6).
 */
export function validateProductForm(values: ProductFormValues): ValidationResult {
  const errors: ProductFormErrors = {}
  const name = values.name.trim().replace(/\s+/g, ' ')
  const size = values.size.trim()
  const colorName = values.colorName.trim()

  if (!name) errors.name = 'Informe o nome do produto.'
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Use no máximo ${NAME_MAX_LENGTH} caracteres.`

  if (!isCategory(values.category)) errors.category = 'Selecione uma categoria.'

  if (!size) errors.size = 'Informe o tamanho.'
  else if (size.length > SIZE_MAX_LENGTH) errors.size = `Use no máximo ${SIZE_MAX_LENGTH} caracteres.`

  if (!colorName) errors.colorName = 'Informe o nome da cor.'
  else if (colorName.length > COLOR_NAME_MAX_LENGTH)
    errors.colorName = `Use no máximo ${COLOR_NAME_MAX_LENGTH} caracteres.`

  if (!HEX_COLOR.test(values.colorHex)) errors.colorHex = 'Escolha uma cor válida.'

  const priceCents = parsePriceToCents(values.price)
  if (!values.price.trim()) errors.price = 'Informe o preço.'
  else if (priceCents === null) errors.price = 'Digite um valor válido, ex.: 59,90.'
  else if (priceCents <= 0) errors.price = 'O preço deve ser maior que zero.'
  else if (priceCents > MAX_PRICE_CENTS) errors.price = 'Preço acima do limite permitido.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    input: {
      name,
      category: values.category as Category,
      size,
      color: { name: colorName, hex: values.colorHex.toLowerCase() },
      priceCents: priceCents as number,
    },
  }
}

/** Impede cadastrar duas vezes o mesmo produto (nome + tamanho + cor). */
export function findDuplicate(
  products: Product[],
  input: Pick<ProductInput, 'name' | 'size' | 'color'>,
  ignoreId?: string,
) {
  const key = normalize(`${input.name}|${input.size}|${input.color.name}`)
  return products.find(
    (p) => p.id !== ignoreId && normalize(`${p.name}|${p.size}|${p.color.name}`) === key,
  )
}

// ---------------------------------------------------------------------------
// Mapeamento entre o documento da coleção "produtos" e o tipo da interface
// ---------------------------------------------------------------------------

export type ProductDoc = {
  nome: string
  tamanho: string
  cor: { nome: string; hex: string }
  preco: number // centavos
  categoria: Category
  estoque: number
}

export function productFromDoc(id: string, data: Record<string, unknown>): Product | null {
  const cor = data.cor as { nome?: unknown; hex?: unknown } | undefined
  if (
    typeof data.nome !== 'string' ||
    typeof data.tamanho !== 'string' ||
    typeof data.preco !== 'number' ||
    typeof data.estoque !== 'number' ||
    !isCategory(data.categoria) ||
    typeof cor?.nome !== 'string' ||
    typeof cor?.hex !== 'string'
  ) {
    return null
  }

  return {
    id,
    name: data.nome,
    size: data.tamanho,
    color: { name: cor.nome, hex: cor.hex },
    price: fromCents(data.preco),
    category: data.categoria,
    stock: data.estoque,
  }
}

export function productInputToDoc(input: ProductInput): Omit<ProductDoc, 'estoque'> {
  return {
    nome: input.name,
    tamanho: input.size,
    cor: { nome: input.color.name, hex: input.color.hex },
    preco: input.priceCents,
    categoria: input.category,
  }
}

// ---------------------------------------------------------------------------
// Busca e filtro
// ---------------------------------------------------------------------------

export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function filterProducts(
  products: Product[],
  query: string,
  category: Category | 'all',
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  return products.filter((p) => {
    if (category !== 'all' && p.category !== category) return false
    if (terms.length === 0) return true
    const haystack = normalize(`${p.name} ${p.color.name} ${p.size} ${p.category}`)
    return terms.every((term) => haystack.includes(term))
  })
}

export function sortProducts(products: Product[]) {
  return [...products].sort(
    (a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.size.localeCompare(b.size, 'pt-BR'),
  )
}
