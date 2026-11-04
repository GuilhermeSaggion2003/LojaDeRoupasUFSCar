import { describe, expect, it } from '@jest/globals'
import { FirebaseError } from 'firebase/app'
import {
  barcodeFor,
  calculateDiscount,
  calculateSubtotal,
  calculateTotal,
  cartItemToSaleItem,
  formatCents,
  parseDiscountInput,
  validateSale,
  type CartItem,
  type SaleItem,
} from './sales'
import { describeSalesError } from './sales-db'
import type { Product } from './products'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleProduct: Product = {
  id: 'prod-1',
  name: 'Camiseta UFSCar',
  category: 'Camisetas',
  size: 'M',
  color: { name: 'Azul', hex: '#1e2a5a' },
  price: 59.9,
  stock: 10,
}

const sampleItem = (overrides?: Partial<SaleItem>): SaleItem => ({
  produtoId: 'prod-1',
  nome: 'Camiseta UFSCar',
  tamanho: 'M',
  cor: { nome: 'Azul', hex: '#1e2a5a' },
  quantidade: 2,
  precoUnitario: 5990, // R$ 59,90 em centavos
  ...overrides,
})

// ---------------------------------------------------------------------------
// calculateSubtotal
// ---------------------------------------------------------------------------

describe('calculateSubtotal', () => {
  it('retorna 0 para lista vazia de itens', () => {
    expect(calculateSubtotal([])).toBe(0)
  })

  it('calcula o subtotal de um único item em centavos', () => {
    expect(calculateSubtotal([{ precoUnitario: 5990, quantidade: 3 }])).toBe(17970)
  })

  it('soma múltiplos itens sem erro de ponto flutuante', () => {
    const items = [
      { precoUnitario: 5990, quantidade: 2 }, // 11980
      { precoUnitario: 12990, quantidade: 1 }, // 12990
      { precoUnitario: 1000, quantidade: 4 },  // 4000
    ]
    expect(calculateSubtotal(items)).toBe(28970)
  })

  it('trata quantidades e preços negativos como zero', () => {
    expect(calculateSubtotal([{ precoUnitario: -50, quantidade: 2 }])).toBe(0)
    expect(calculateSubtotal([{ precoUnitario: 100, quantidade: -3 }])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// parseDiscountInput
// ---------------------------------------------------------------------------

describe('parseDiscountInput', () => {
  it.each([
    ['10', 10],
    ['10%', 10],
    ['15,50', 15.5],
    ['R$ 25,00', 25],
    ['0', 0],
    ['', 0],
    ['   ', 0],
    ['abc', 0],
  ])('interpreta a entrada "%s" corretamente como %f', (input, expected) => {
    expect(parseDiscountInput(input)).toBe(expected)
  })

  it('lida com números diretos', () => {
    expect(parseDiscountInput(15.5)).toBe(15.5)
    expect(parseDiscountInput(-10)).toBe(0)
    expect(parseDiscountInput(Number.NaN)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateDiscount
// ---------------------------------------------------------------------------

describe('calculateDiscount', () => {
  const subtotal = 10000 // R$ 100,00

  describe('modo percentual (%)', () => {
    it('calcula desconto percentual proporcional em centavos', () => {
      expect(calculateDiscount(subtotal, 'percent', 10)).toBe(1000) // 10% de R$ 100 = R$ 10
      expect(calculateDiscount(subtotal, 'percent', '25%')).toBe(2500) // 25% de R$ 100 = R$ 25
      expect(calculateDiscount(subtotal, 'percent', 0)).toBe(0)
    })

    it('arredonda os centavos corretamente', () => {
      // 33% de 5990 = 1976.7 -> 1977 centavos
      expect(calculateDiscount(5990, 'percent', 33)).toBe(1977)
    })

    it('limita percentual máximo a 100% (nunca ultrapassa o subtotal)', () => {
      expect(calculateDiscount(subtotal, 'percent', 150)).toBe(subtotal)
    })
  })

  describe('modo valor em reais (R$)', () => {
    it('converte o valor informado em reais para centavos', () => {
      expect(calculateDiscount(subtotal, 'value', '15,00')).toBe(1500)
      expect(calculateDiscount(subtotal, 'value', 20)).toBe(2000)
    })

    it('limita o desconto ao valor do subtotal quando o desconto é maior', () => {
      expect(calculateDiscount(subtotal, 'value', '150,00')).toBe(subtotal)
    })
  })

  describe('restrições de regras e tipos de transação', () => {
    it('retorna 0 para trocas e devoluções mesmo se houver desconto digitado', () => {
      expect(calculateDiscount(subtotal, 'percent', 20, 'troca')).toBe(0)
      expect(calculateDiscount(subtotal, 'value', 30, 'devolucao')).toBe(0)
    })

    it('retorna 0 se o subtotal for zero ou negativo', () => {
      expect(calculateDiscount(0, 'percent', 10)).toBe(0)
      expect(calculateDiscount(-100, 'value', 10)).toBe(0)
    })
  })
})

// ---------------------------------------------------------------------------
// calculateTotal
// ---------------------------------------------------------------------------

describe('calculateTotal', () => {
  it('calcula o total subtraindo o desconto do subtotal', () => {
    expect(calculateTotal(10000, 1500)).toBe(8500)
  })

  it('retorna 0 quando desconto é igual ao subtotal', () => {
    expect(calculateTotal(5000, 5000)).toBe(0)
  })

  it('nunca retorna total negativo mesmo se desconto for maior que subtotal', () => {
    expect(calculateTotal(5000, 6000)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// validateSale
// ---------------------------------------------------------------------------

describe('validateSale', () => {
  const itemValido = sampleItem({ quantidade: 2, precoUnitario: 5000 })
  const validSale = {
    itens: [itemValido],
    subtotal: 10000,
    desconto: 1000,
    total: 9000,
    tipo: 'venda' as const,
  }

  it('valida uma venda coerente com sucesso', () => {
    expect(validateSale(validSale)).toEqual({ ok: true })
  })

  it('rejeita venda com carrinho vazio', () => {
    const res = validateSale({ ...validSale, itens: [] })
    expect(res).toEqual({ ok: false, error: 'O carrinho está vazio. Adicione itens antes de finalizar.' })
  })

  it('rejeita tipo de transação inválido', () => {
    const res = validateSale({ ...validSale, tipo: 'outro' as any })
    expect(res).toEqual({ ok: false, error: 'Tipo de transação inválido.' })
  })

  it('rejeita item sem produtoId', () => {
    const res = validateSale({
      ...validSale,
      itens: [{ ...itemValido, produtoId: '' }],
    })
    expect(res.ok).toBe(false)
  })

  it('rejeita item com quantidade zero ou decimal', () => {
    expect(validateSale({ ...validSale, itens: [{ ...itemValido, quantidade: 0 }] }).ok).toBe(false)
    expect(validateSale({ ...validSale, itens: [{ ...itemValido, quantidade: 1.5 }] }).ok).toBe(false)
  })

  it('rejeita item com preço unitário zero ou inválido', () => {
    expect(validateSale({ ...validSale, itens: [{ ...itemValido, precoUnitario: 0 }] }).ok).toBe(false)
  })

  it('rejeita subtotal incoerente com os itens', () => {
    const res = validateSale({ ...validSale, subtotal: 9999 })
    expect(res.ok).toBe(false)
  })

  it('rejeita desconto em troca ou devolução', () => {
    const res = validateSale({
      ...validSale,
      tipo: 'troca',
      desconto: 500,
      total: 9500,
    })
    expect(res).toEqual({ ok: false, error: 'Desconto permitido apenas em operações de venda.' })
  })

  it('rejeita desconto maior que o subtotal ou negativo', () => {
    expect(validateSale({ ...validSale, desconto: 15000, total: 0 }).ok).toBe(false)
    expect(validateSale({ ...validSale, desconto: -100 }).ok).toBe(false)
  })

  it('rejeita total que não corresponde a subtotal - desconto', () => {
    const res = validateSale({ ...validSale, total: 8000 })
    expect(res.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Helpers cartItemToSaleItem, formatCents e barcodeFor
// ---------------------------------------------------------------------------

describe('helpers de vendas', () => {
  it('converte CartItem para SaleItem com precoUnitario em centavos', () => {
    const cartItem: CartItem = {
      product: sampleProduct,
      quantity: 3,
    }
    const saleItem = cartItemToSaleItem(cartItem)
    expect(saleItem).toEqual({
      produtoId: 'prod-1',
      nome: 'Camiseta UFSCar',
      tamanho: 'M',
      cor: { nome: 'Azul', hex: '#1e2a5a' },
      quantidade: 3,
      precoUnitario: 5990,
    })
  })

  it('formata centavos para moeda brasileira via formatCents', () => {
    expect(formatCents(5990)).toMatch(/59,90/)
    expect(formatCents(10000)).toMatch(/100,00/)
    expect(formatCents(0)).toMatch(/0,00/)
  })

  it('gera barcode válido a partir do produto', () => {
    expect(barcodeFor(sampleProduct)).toBe('789123450001')
  })
})

// ---------------------------------------------------------------------------
// describeSalesError
// ---------------------------------------------------------------------------

describe('describeSalesError', () => {
  it.each([
    ['permission-denied', 'Você não tem permissão para registrar vendas.'],
    ['unavailable', 'Servidor indisponível. Verifique sua conexão com a internet.'],
    ['not-found', 'Registro de venda ou produto não encontrado.'],
    ['aborted', 'A transação foi interrompida devido a concorrência. Tente novamente.'],
    ['unknown-code', 'Não foi possível concluir a transação de venda. Tente novamente.'],
  ])('traduz erro "%s" para mensagem clara', (code, expected) => {
    const err = new FirebaseError(code, 'internal error')
    expect(describeSalesError(err)).toBe(expected)
  })

  it('retorna mensagem genérica para erros não-Firebase', () => {
    expect(describeSalesError(new Error('Falha'))).toBe(
      'Não foi possível concluir a transação de venda. Tente novamente.',
    )
  })
})
