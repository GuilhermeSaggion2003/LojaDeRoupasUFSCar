import { describe, expect, it } from '@jest/globals'
import {
  EMPTY_PRODUCT_FORM,
  INITIAL_PRODUCTS,
  filterProducts,
  findDuplicate,
  formatPriceInput,
  fromCents,
  isCategory,
  parsePriceToCents,
  productFromDoc,
  productInputToDoc,
  productToFormValues,
  sortProducts,
  toCents,
  validateProductForm,
  type ProductFormValues,
} from './products'

const validForm: ProductFormValues = {
  name: '  Camiseta   Física  ',
  category: 'Camisetas',
  size: ' G ',
  colorName: ' Azul ',
  colorHex: '#1E2A5A',
  price: '59,90',
}

describe('conversão de preço', () => {
  it('converte reais em centavos sem erro de ponto flutuante', () => {
    expect(toCents(59.9)).toBe(5990)
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(fromCents(5990)).toBe(59.9)
  })

  it.each([
    ['59,90', 5990],
    ['59.90', 5990],
    ['59,9', 5990],
    ['59', 5900],
    ['R$ 1.234,56', 123456],
    ['1.234', 123400],
    ['0,01', 1],
    ['  149,90 ', 14990],
  ])('interpreta "%s" como %i centavos', (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents)
  })

  it.each(['', '   ', 'abc', '12,345', '-10', '1,2,3', '10.5.3', 'R$'])(
    'rejeita o valor inválido "%s"',
    (input) => {
      expect(parsePriceToCents(input)).toBeNull()
    },
  )

  it('formata o preço para o campo do formulário', () => {
    expect(formatPriceInput(59.9)).toBe('59,90')
    expect(formatPriceInput(1234.5)).toBe('1234,50')
  })
})

describe('validateProductForm', () => {
  it('aceita um cadastro válido e normaliza os campos', () => {
    const result = validateProductForm(validForm)
    expect(result).toEqual({
      ok: true,
      input: {
        name: 'Camiseta Física',
        category: 'Camisetas',
        size: 'G',
        color: { name: 'Azul', hex: '#1e2a5a' },
        priceCents: 5990,
      },
    })
  })

  it('aponta todos os campos obrigatórios vazios', () => {
    const result = validateProductForm(EMPTY_PRODUCT_FORM)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual(
      ['category', 'colorName', 'name', 'price', 'size'].sort(),
    )
  })

  it('rejeita preço zero, inválido ou acima do limite', () => {
    for (const [price, message] of [
      ['0', 'O preço deve ser maior que zero.'],
      ['abc', 'Digite um valor válido, ex.: 59,90.'],
      ['100000,01', 'Preço acima do limite permitido.'],
    ]) {
      const result = validateProductForm({ ...validForm, price })
      expect(result).toEqual({ ok: false, errors: { price: message } })
    }
  })

  it('rejeita categoria fora da lista e cor em formato inválido', () => {
    const result = validateProductForm({
      ...validForm,
      category: 'Sapatos' as never,
      colorHex: 'azul',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.category).toBeDefined()
    expect(result.errors.colorHex).toBeDefined()
  })

  it('rejeita textos acima do tamanho máximo', () => {
    const result = validateProductForm({
      ...validForm,
      name: 'a'.repeat(101),
      size: 'b'.repeat(21),
      colorName: 'c'.repeat(41),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toMatchObject({
      name: expect.any(String),
      size: expect.any(String),
      colorName: expect.any(String),
    })
  })
})

describe('findDuplicate', () => {
  const [camiseta] = INITIAL_PRODUCTS

  it('detecta mesmo nome, tamanho e cor ignorando acentos e maiúsculas', () => {
    const duplicate = findDuplicate(INITIAL_PRODUCTS, {
      name: 'camiseta basica ufscar',
      size: 'm',
      color: { name: 'AZUL-MARINHO', hex: '#000000' },
    })
    expect(duplicate?.id).toBe(camiseta.id)
  })

  it('permite outro tamanho do mesmo produto', () => {
    expect(
      findDuplicate(INITIAL_PRODUCTS, { name: camiseta.name, size: 'G', color: camiseta.color }),
    ).toBeUndefined()
  })

  it('não acusa duplicidade com o próprio produto em edição', () => {
    expect(findDuplicate(INITIAL_PRODUCTS, camiseta, camiseta.id)).toBeUndefined()
  })
})

describe('mapeamento do Firestore', () => {
  const doc = {
    nome: 'Moletom',
    tamanho: 'GG',
    cor: { nome: 'Cinza', hex: '#9ca3af' },
    preco: 14990,
    categoria: 'Moletons',
    estoque: 18,
  }

  it('converte um documento válido em produto (centavos para reais)', () => {
    expect(productFromDoc('abc', doc)).toEqual({
      id: 'abc',
      name: 'Moletom',
      size: 'GG',
      color: { name: 'Cinza', hex: '#9ca3af' },
      price: 149.9,
      category: 'Moletons',
      stock: 18,
    })
  })

  it.each([
    ['sem nome', { ...doc, nome: undefined }],
    ['preço como texto', { ...doc, preco: '149,90' }],
    ['categoria desconhecida', { ...doc, categoria: 'Sapatos' }],
    ['sem cor', { ...doc, cor: undefined }],
    ['sem estoque', { ...doc, estoque: undefined }],
  ])('ignora documento malformado (%s)', (_, data) => {
    expect(productFromDoc('x', data)).toBeNull()
  })

  it('gera o documento com os nomes de campo do banco', () => {
    const result = validateProductForm(validForm)
    if (!result.ok) throw new Error('formulário deveria ser válido')
    expect(productInputToDoc(result.input)).toEqual({
      nome: 'Camiseta Física',
      tamanho: 'G',
      cor: { nome: 'Azul', hex: '#1e2a5a' },
      preco: 5990,
      categoria: 'Camisetas',
    })
  })

  it('preenche o formulário de edição a partir do produto', () => {
    expect(productToFormValues(INITIAL_PRODUCTS[2])).toEqual({
      name: 'Moletom Canguru Federal',
      category: 'Moletons',
      size: 'GG',
      colorName: 'Cinza mescla',
      colorHex: '#9ca3af',
      price: '149,90',
    })
  })
})

describe('busca e filtro', () => {
  const names = (list: typeof INITIAL_PRODUCTS) => list.map((p) => p.name)

  it('retorna tudo sem busca e sem categoria', () => {
    expect(filterProducts(INITIAL_PRODUCTS, '  ', 'all')).toHaveLength(INITIAL_PRODUCTS.length)
  })

  it('busca por nome ignorando acentos e maiúsculas', () => {
    expect(names(filterProducts(INITIAL_PRODUCTS, 'COMPUTACAO', 'all'))).toEqual([
      'Camiseta Computação',
    ])
  })

  it('combina vários termos (nome, cor e tamanho)', () => {
    expect(names(filterProducts(INITIAL_PRODUCTS, 'camiseta preto g', 'all'))).toEqual([
      'Camiseta Computação',
    ])
  })

  it('filtra por categoria junto com a busca', () => {
    expect(names(filterProducts(INITIAL_PRODUCTS, 'ufscar', 'Acessórios'))).toEqual([
      'Caneca Térmica UFSCar',
    ])
    expect(filterProducts(INITIAL_PRODUCTS, '', 'Bonés')).toHaveLength(1)
  })

  it('ordena alfabeticamente por nome e tamanho', () => {
    const base = INITIAL_PRODUCTS[0]
    const sorted = sortProducts([
      { ...base, id: '1', name: 'Zíper', size: 'M' },
      { ...base, id: '2', name: 'Ábaco', size: 'P' },
      { ...base, id: '3', name: 'Ábaco', size: 'G' },
    ])
    expect(sorted.map((p) => p.id)).toEqual(['3', '2', '1'])
  })

  it('reconhece apenas categorias cadastradas', () => {
    expect(isCategory('Bonés')).toBe(true)
    expect(isCategory('bones')).toBe(false)
    expect(isCategory(42)).toBe(false)
  })
})
