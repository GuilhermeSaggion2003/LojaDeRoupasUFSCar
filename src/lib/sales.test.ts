import { describe, expect, it } from '@jest/globals'
import { FirebaseError } from 'firebase/app'
import {
  barcodeFor,
  calculateDiscount,
  calculateSalesMetrics,
  calculateSaleStockDeltas,
  calculateSubtotal,
  calculateTotal,
  cartItemToSaleItem,
  filterSales,
  formatCents,
  formatReceiptDate,
  parseDiscountInput,
  validateSale,
  validateStockAvailability,
  type CartItem,
  type Sale,
  type SaleItem,
  type TransactionType,
} from './sales'
import { describeSalesError, InsufficientStockError } from './sales-db'
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
    const res = validateSale({ ...validSale, tipo: 'outro' as unknown as TransactionType })
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

  it('valida itens devolvidos em operação de troca', () => {
    const saleTroca = {
      ...validSale,
      tipo: 'troca' as const,
      desconto: 0,
      total: 10000,
      itensDevolvidos: [
        {
          produtoId: '',
          nome: 'Camiseta Antiga',
          tamanho: 'P',
          cor: { nome: 'Branco', hex: '#fff' },
          quantidade: 1,
          precoUnitario: 5000,
        },
      ],
    }
    expect(validateSale(saleTroca)).toEqual({
      ok: false,
      error: 'Item devolvido com produto não identificado.',
    })

    const saleTrocaQtdInvalida = {
      ...saleTroca,
      itensDevolvidos: [
        {
          ...saleTroca.itensDevolvidos[0],
          produtoId: 'prod-antigo',
          quantidade: 0,
        },
      ],
    }
    expect(validateSale(saleTrocaQtdInvalida)).toEqual({
      ok: false,
      error: 'Quantidade inválida para o item devolvido "Camiseta Antiga".',
    })

    const saleTrocaValida = {
      ...saleTroca,
      itensDevolvidos: [
        {
          ...saleTroca.itensDevolvidos[0],
          produtoId: 'prod-antigo',
          quantidade: 1,
        },
      ],
    }
    expect(validateSale(saleTrocaValida)).toEqual({ ok: true })
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

  it('retorna mensagem específica para InsufficientStockError', () => {
    const err = new InsufficientStockError('Estoque insuficiente para "Camiseta UFSCar". Saldo disponível: 1, solicitado: 2.')
    expect(describeSalesError(err)).toBe(
      'Estoque insuficiente para "Camiseta UFSCar". Saldo disponível: 1, solicitado: 2.',
    )
  })
})

// ---------------------------------------------------------------------------
// Abatimento Atômico de Estoque (Subtarefa 1 - RF06)
// ---------------------------------------------------------------------------

describe('calculateSaleStockDeltas', () => {
  it('gera delta negativo (saída) para todos os itens em transação de venda', () => {
    const sale = {
      tipo: 'venda' as const,
      itens: [
        sampleItem({ produtoId: 'p1', nome: 'Camiseta', quantidade: 2 }),
        sampleItem({ produtoId: 'p2', nome: 'Bermuda', quantidade: 1 }),
      ],
    }
    const deltas = calculateSaleStockDeltas(sale)
    expect(deltas.size).toBe(2)
    expect(deltas.get('p1')).toEqual({
      produtoId: 'p1',
      nome: 'Camiseta',
      quantidadeSaida: 2,
      quantidadeEntrada: 0,
      netDelta: -2,
    })
    expect(deltas.get('p2')).toEqual({
      produtoId: 'p2',
      nome: 'Bermuda',
      quantidadeSaida: 1,
      quantidadeEntrada: 0,
      netDelta: -1,
    })
  })

  it('gera delta positivo (entrada) para todos os itens em devolução', () => {
    const sale = {
      tipo: 'devolucao' as const,
      itens: [
        sampleItem({ produtoId: 'p1', nome: 'Camiseta', quantidade: 3 }),
      ],
    }
    const deltas = calculateSaleStockDeltas(sale)
    expect(deltas.get('p1')).toEqual({
      produtoId: 'p1',
      nome: 'Camiseta',
      quantidadeSaida: 0,
      quantidadeEntrada: 3,
      netDelta: 3,
    })
  })

  it('processa troca com itens que saem e itens devolvidos que entram', () => {
    const sale = {
      tipo: 'troca' as const,
      itens: [
        sampleItem({ produtoId: 'p1', nome: 'Camiseta G', quantidade: 1 }),
      ],
      itensDevolvidos: [
        sampleItem({ produtoId: 'p2', nome: 'Camiseta M', quantidade: 1 }),
      ],
    }
    const deltas = calculateSaleStockDeltas(sale)
    expect(deltas.size).toBe(2)
    expect(deltas.get('p1')?.netDelta).toBe(-1)
    expect(deltas.get('p2')?.netDelta).toBe(1)
  })

  it('agrega corretamente múltiplos itens do mesmo produto na mesma venda', () => {
    const sale = {
      tipo: 'venda' as const,
      itens: [
        sampleItem({ produtoId: 'p1', nome: 'Camiseta', quantidade: 2 }),
        sampleItem({ produtoId: 'p1', nome: 'Camiseta', quantidade: 3 }),
      ],
    }
    const deltas = calculateSaleStockDeltas(sale)
    expect(deltas.size).toBe(1)
    expect(deltas.get('p1')).toEqual({
      produtoId: 'p1',
      nome: 'Camiseta',
      quantidadeSaida: 5,
      quantidadeEntrada: 0,
      netDelta: -5,
    })
  })
})

describe('validateStockAvailability', () => {
  it('aprova quando estoque é suficiente', () => {
    const delta = {
      produtoId: 'p1',
      nome: 'Camiseta',
      quantidadeSaida: 3,
      quantidadeEntrada: 0,
      netDelta: -3,
    }
    const res = validateStockAvailability(10, delta)
    expect(res).toEqual({ ok: true, novoEstoque: 7 })
  })

  it('aprova quando saída zera exatamente o estoque', () => {
    const delta = {
      produtoId: 'p1',
      nome: 'Camiseta',
      quantidadeSaida: 5,
      quantidadeEntrada: 0,
      netDelta: -5,
    }
    const res = validateStockAvailability(5, delta)
    expect(res).toEqual({ ok: true, novoEstoque: 0 })
  })

  it('reprova quando estoque atual é menor que a quantidade solicitada (concorrência)', () => {
    const delta = {
      produtoId: 'p1',
      nome: 'Camiseta',
      quantidadeSaida: 4,
      quantidadeEntrada: 0,
      netDelta: -4,
    }
    const res = validateStockAvailability(2, delta)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toContain('Estoque insuficiente para "Camiseta"')
      expect(res.error).toContain('Saldo disponível: 2, solicitado: 4')
    }
  })

  it('aprova devolução mesmo com estoque atual zerado', () => {
    const delta = {
      produtoId: 'p1',
      nome: 'Camiseta',
      quantidadeSaida: 0,
      quantidadeEntrada: 2,
      netDelta: 2,
    }
    const res = validateStockAvailability(0, delta)
    expect(res).toEqual({ ok: true, novoEstoque: 2 })
  })
})

// ---------------------------------------------------------------------------
// Comprovante de Venda (Subtarefa 3)
// ---------------------------------------------------------------------------

describe('formatReceiptDate', () => {
  it('formata data e hora no fuso horário de São Paulo', () => {
    // 2026-11-12T15:30:00Z -> em UTC-3 é 12/11/2026 às 12:30:00
    const d = new Date('2026-11-12T15:30:00Z')
    const formatted = formatReceiptDate(d)
    expect(formatted.date).toBe('12/11/2026')
    expect(formatted.time).toBe('12:30:00')
    expect(formatted.full).toBe('12/11/2026 às 12:30:00')
  })

  it('aceita timestamp em número e string ISO', () => {
    const iso = '2026-10-15T18:00:00Z'
    const formatted = formatReceiptDate(iso)
    expect(formatted.date).toBe('15/10/2026')
    expect(formatted.time).toBe('15:00:00')
  })
})

// ---------------------------------------------------------------------------
// Filtros e Métricas Gerenciais de Vendas (Subtarefa 4 - RF06)
// ---------------------------------------------------------------------------

describe('filterSales', () => {
  const refDate = new Date('2026-11-12T12:00:00Z')

  const saleList: Sale[] = [
    {
      id: 'v1',
      tipo: 'venda',
      itens: [sampleItem({ produtoId: 'p1', nome: 'Camiseta UFSCar', quantidade: 2 })],
      subtotal: 10000,
      desconto: 1000,
      total: 9000,
      data: new Date('2026-11-12T10:00:00Z'), // Hoje
      usuarioId: 'u1',
      operadorNome: 'Carlos Mendes',
    },
    {
      id: 'v2',
      tipo: 'troca',
      itens: [sampleItem({ produtoId: 'p2', nome: 'Bermuda Esportiva', quantidade: 1 })],
      subtotal: 8000,
      desconto: 0,
      total: 8000,
      data: new Date('2026-11-10T14:00:00Z'), // Há 2 dias
      usuarioId: 'u2',
      operadorNome: 'Juliana Rocha',
    },
    {
      id: 'v3',
      tipo: 'devolucao',
      itens: [sampleItem({ produtoId: 'p1', nome: 'Camiseta UFSCar', quantidade: 1 })],
      subtotal: 5000,
      desconto: 0,
      total: 5000,
      data: new Date('2026-10-25T11:00:00Z'), // Há 18 dias
      usuarioId: 'u1',
      operadorNome: 'Carlos Mendes',
    },
    {
      id: 'v4',
      tipo: 'venda',
      itens: [sampleItem({ produtoId: 'p3', nome: 'Moletom Federal', quantidade: 1 })],
      subtotal: 15000,
      desconto: 0,
      total: 15000,
      data: new Date('2026-09-01T10:00:00Z'), // Antiga (> 30 dias)
      usuarioId: 'u3',
      operadorNome: 'Pedro Alves',
    },
  ]

  it('retorna todas as vendas sem filtros ativos', () => {
    expect(filterSales(saleList)).toHaveLength(4)
  })

  it('filtra por tipo de operação', () => {
    const vendas = filterSales(saleList, { type: 'venda' })
    expect(vendas).toHaveLength(2)
    expect(vendas.every((s) => s.tipo === 'venda')).toBe(true)

    const trocas = filterSales(saleList, { type: 'troca' })
    expect(trocas).toHaveLength(1)
    expect(trocas[0].id).toBe('v2')

    const devolucoes = filterSales(saleList, { type: 'devolucao' })
    expect(devolucoes).toHaveLength(1)
    expect(devolucoes[0].id).toBe('v3')
  })

  it('filtra por período: today', () => {
    const todaySales = filterSales(saleList, { period: 'today', referenceDate: refDate })
    expect(todaySales).toHaveLength(1)
    expect(todaySales[0].id).toBe('v1')
  })

  it('filtra por período: 7days', () => {
    const recentSales = filterSales(saleList, { period: '7days', referenceDate: refDate })
    expect(recentSales).toHaveLength(2)
    expect(recentSales.map((s) => s.id)).toEqual(['v1', 'v2'])
  })

  it('filtra por período: 30days', () => {
    const monthSales = filterSales(saleList, { period: '30days', referenceDate: refDate })
    expect(monthSales).toHaveLength(3)
    expect(monthSales.map((s) => s.id)).toEqual(['v1', 'v2', 'v3'])
  })

  it('filtra por termo de busca no operador ou ID', () => {
    const porOperador = filterSales(saleList, { search: 'Juliana' })
    expect(porOperador).toHaveLength(1)
    expect(porOperador[0].id).toBe('v2')

    const porId = filterSales(saleList, { search: 'v3' })
    expect(porId).toHaveLength(1)
    expect(porId[0].id).toBe('v3')
  })

  it('filtra por termo de busca no nome do produto vendido', () => {
    const porProduto = filterSales(saleList, { search: 'Moletom' })
    expect(porProduto).toHaveLength(1)
    expect(porProduto[0].id).toBe('v4')
  })

  it('combina múltiplos filtros simultâneos', () => {
    const combinada = filterSales(saleList, {
      period: '7days',
      type: 'venda',
      search: 'Carlos',
      referenceDate: refDate,
    })
    expect(combinada).toHaveLength(1)
    expect(combinada[0].id).toBe('v1')
  })
})

describe('calculateSalesMetrics', () => {
  it('calcula métricas corretamente a partir de vendas, trocas e devoluções', () => {
    const list: Sale[] = [
      {
        id: '1',
        tipo: 'venda',
        itens: [sampleItem({ quantidade: 2 }), sampleItem({ quantidade: 1 })],
        subtotal: 10000,
        desconto: 1000,
        total: 9000,
        data: new Date(),
        usuarioId: 'u1',
      },
      {
        id: '2',
        tipo: 'venda',
        itens: [sampleItem({ quantidade: 1 })],
        subtotal: 5000,
        desconto: 0,
        total: 5000,
        data: new Date(),
        usuarioId: 'u1',
      },
      {
        id: '3',
        tipo: 'devolucao',
        itens: [sampleItem({ quantidade: 1 })],
        subtotal: 2000,
        desconto: 0,
        total: 2000,
        data: new Date(),
        usuarioId: 'u1',
      },
      {
        id: '4',
        tipo: 'troca',
        itens: [sampleItem({ quantidade: 1, precoUnitario: 3000 })],
        subtotal: 3000,
        desconto: 0,
        total: 3000,
        data: new Date(),
        usuarioId: 'u1',
      },
    ]

    const m = calculateSalesMetrics(list)
    expect(m.totalTransacoes).toBe(4)
    expect(m.totalFaturadoVendas).toBe(17000) // 9000 + 5000 + 3000
    expect(m.totalDevolvido).toBe(2000)
    expect(m.saldoLiquido).toBe(15000) // 17000 - 2000
    expect(m.totalPecas).toBe(6) // (2+1) + 1 + 1 + 1
    expect(m.totalDescontos).toBe(1000)
    expect(m.ticketMedio).toBe(5667) // 17000 / 3 (2 vendas + 1 troca)
  })

  it('retorna zeros com segurança para lista vazia', () => {
    const m = calculateSalesMetrics([])
    expect(m).toEqual({
      totalTransacoes: 0,
      totalFaturadoVendas: 0,
      totalDevolvido: 0,
      saldoLiquido: 0,
      totalPecas: 0,
      totalDescontos: 0,
      ticketMedio: 0,
    })
  })
})



