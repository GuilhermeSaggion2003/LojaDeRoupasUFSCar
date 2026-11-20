import { describe, expect, it } from '@jest/globals'
import {
  buildSalesReport,
  buildStockMovementReport,
  buildTopSellingReport,
  dayKey,
  DEFAULT_TOP_LIMIT,
  formatDayKey,
  isValidSaleForReport,
  isWithinPeriod,
  REMOVED_PRODUCT_LABEL,
  REPORT_PERIOD_OPTIONS,
  sharePercent,
  type ReportMovement,
} from './relatorios'
import type { Sale, SaleItem } from './sales'
import type { Product } from './products'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Quinta-feira, 19/11/2026, 15h00 em São Paulo (UTC-3). */
const REF = new Date('2026-11-19T18:00:00Z')
const hoursAgo = (h: number) => new Date(REF.getTime() - h * 60 * 60 * 1000)
const daysAgo = (d: number) => hoursAgo(d * 24)

const products: Product[] = [
  { id: 'p1', name: 'Camiseta UFSCar', size: 'M', color: { name: 'Azul', hex: '#1e2a5a' }, price: 59.9, category: 'Camisetas', stock: 10 },
  { id: 'p2', name: 'Moletom Federal', size: 'G', color: { name: 'Cinza', hex: '#9ca3af' }, price: 149.9, category: 'Moletons', stock: 4 },
  { id: 'p3', name: 'Boné UFSCar', size: 'Único', color: { name: 'Dourado', hex: '#d4a017' }, price: 49.9, category: 'Bonés', stock: 0 },
]

const item = (produtoId: string, quantidade: number, precoUnitario: number, nome = produtoId): SaleItem => ({
  produtoId,
  nome,
  tamanho: 'M',
  cor: { nome: 'Azul', hex: '#1e2a5a' },
  quantidade,
  precoUnitario,
})

let seq = 0
function sale(tipo: Sale['tipo'], itens: SaleItem[], data: Date, extra: Partial<Sale> = {}): Sale {
  const subtotal = itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0)
  const desconto = extra.desconto ?? 0
  return {
    id: `v${++seq}`,
    itens,
    subtotal,
    desconto,
    total: subtotal - desconto,
    tipo,
    data,
    usuarioId: 'u1',
    ...extra,
  }
}

function mov(produtoId: string, tipo: 'entrada' | 'saida', quantidade: number, data: Date, vendaId?: string): ReportMovement {
  return { id: `${produtoId}_${tipo}_${data.getTime()}`, produtoId, tipo, quantidade, data, usuarioId: 'u1', vendaId }
}

// ---------------------------------------------------------------------------
// Datas e período
// ---------------------------------------------------------------------------

describe('período dos relatórios', () => {
  it('oferece as opções Hoje, 7 dias, 30 dias e Todo o período', () => {
    expect(REPORT_PERIOD_OPTIONS.map((o) => o.value)).toEqual(['today', '7days', '30days', 'all'])
  })

  it('gera a chave do dia no fuso de São Paulo', () => {
    // 01h00 UTC do dia 20 ainda é dia 19 em São Paulo
    expect(dayKey(new Date('2026-11-20T01:00:00Z'))).toBe('2026-11-19')
    expect(dayKey(new Date('2026-11-20T03:00:00Z'))).toBe('2026-11-20')
  })

  it('formata a chave do dia para DD/MM/AAAA', () => {
    expect(formatDayKey('2026-11-05')).toBe('05/11/2026')
  })

  it('"Hoje" considera o dia civil em São Paulo', () => {
    expect(isWithinPeriod(hoursAgo(14), 'today', REF)).toBe(true) // 01h00 do dia 19
    expect(isWithinPeriod(hoursAgo(16), 'today', REF)).toBe(false) // 23h00 do dia 18
  })

  it('"7 dias" e "30 dias" incluem as bordas e excluem datas futuras', () => {
    expect(isWithinPeriod(daysAgo(7), '7days', REF)).toBe(true)
    expect(isWithinPeriod(new Date(daysAgo(7).getTime() - 1), '7days', REF)).toBe(false)
    expect(isWithinPeriod(daysAgo(30), '30days', REF)).toBe(true)
    expect(isWithinPeriod(daysAgo(31), '30days', REF)).toBe(false)
    expect(isWithinPeriod(new Date(REF.getTime() + 1000), '7days', REF)).toBe(false)
  })

  it('"Todo o período" aceita qualquer data válida e rejeita data inválida', () => {
    expect(isWithinPeriod(daysAgo(400), 'all', REF)).toBe(true)
    expect(isWithinPeriod(new Date('inválida'), 'all', REF)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 1. Relatório de vendas
// ---------------------------------------------------------------------------

describe('buildSalesReport', () => {
  const vendas: Sale[] = [
    sale('venda', [item('p1', 2, 5990), item('p2', 1, 14990)], hoursAgo(2), { desconto: 1000 }), // total 25970
    sale('venda', [item('p1', 1, 5990)], daysAgo(1)), // 5990
    sale('troca', [item('p2', 1, 14990)], daysAgo(1), { itensDevolvidos: [item('p1', 1, 5990)] }), // 14990
    sale('devolucao', [item('p1', 1, 5990)], hoursAgo(1)), // 5990
    sale('venda', [item('p3', 3, 4990)], daysAgo(40)), // fora de 30 dias
  ]

  it('retorna relatório zerado para período sem transações', () => {
    const r = buildSalesReport([], { period: '7days', referenceDate: REF })
    expect(r.metricas.totalTransacoes).toBe(0)
    expect(r.metricas.saldoLiquido).toBe(0)
    expect(r.faturamentoBruto).toBe(0)
    expect(r.porDia).toEqual([])
    expect(r.porTipo.venda).toEqual({ transacoes: 0, pecas: 0, valor: 0 })
  })

  it('consolida os totais por tipo de operação no período', () => {
    const r = buildSalesReport(vendas, { period: '30days', referenceDate: REF })
    expect(r.porTipo.venda).toEqual({ transacoes: 2, pecas: 4, valor: 25970 + 5990 })
    expect(r.porTipo.troca).toEqual({ transacoes: 1, pecas: 1, valor: 14990 })
    expect(r.porTipo.devolucao).toEqual({ transacoes: 1, pecas: 1, valor: 5990 })
  })

  it('reaproveita os indicadores do módulo de vendas (líquido, descontos e ticket)', () => {
    const r = buildSalesReport(vendas, { period: '30days', referenceDate: REF })
    const faturado = 25970 + 5990 + 14990
    expect(r.metricas.totalFaturadoVendas).toBe(faturado)
    expect(r.metricas.totalDevolvido).toBe(5990)
    expect(r.metricas.saldoLiquido).toBe(faturado - 5990)
    expect(r.metricas.totalDescontos).toBe(1000)
    expect(r.metricas.ticketMedio).toBe(Math.round(faturado / 3))
  })

  it('calcula o faturamento bruto antes dos descontos', () => {
    const r = buildSalesReport(vendas, { period: '30days', referenceDate: REF })
    expect(r.faturamentoBruto).toBe(26970 + 5990 + 14990)
    expect(r.faturamentoBruto - r.metricas.totalDescontos).toBe(r.metricas.totalFaturadoVendas)
  })

  it('agrupa por dia (fuso de São Paulo) do mais recente para o mais antigo', () => {
    const r = buildSalesReport(vendas, { period: '30days', referenceDate: REF })
    expect(r.porDia.map((d) => d.dia)).toEqual(['2026-11-19', '2026-11-18'])
    expect(r.porDia[0]).toEqual({
      dia: '2026-11-19',
      transacoes: 2,
      faturamento: 25970,
      devolucoes: 5990,
      liquido: 25970 - 5990,
    })
    expect(r.porDia[1].faturamento).toBe(5990 + 14990)
  })

  it('permite saldo líquido negativo em um dia com apenas devoluções', () => {
    const r = buildSalesReport([sale('devolucao', [item('p1', 2, 5990)], hoursAgo(1))], {
      period: 'today',
      referenceDate: REF,
    })
    expect(r.porDia[0].liquido).toBe(-11980)
    expect(r.metricas.saldoLiquido).toBe(0) // indicador geral nunca negativo (regra do S7)
  })

  it('respeita o filtro de período', () => {
    expect(buildSalesReport(vendas, { period: 'today', referenceDate: REF }).metricas.totalTransacoes).toBe(2)
    expect(buildSalesReport(vendas, { period: 'all', referenceDate: REF }).metricas.totalTransacoes).toBe(5)
  })

  it('ignora documentos malformados e informa quantos foram descartados', () => {
    const malformados = [
      { ...sale('venda', [item('p1', 1, 5990)], hoursAgo(1)), tipo: 'brinde' },
      { ...sale('venda', [item('p1', 1, 5990)], hoursAgo(1)), total: 59.9 },
      { ...sale('venda', [item('p1', 1, 5990)], hoursAgo(1)), itens: undefined },
    ] as unknown as Sale[]
    const r = buildSalesReport([...malformados, vendas[1]], { period: 'all', referenceDate: REF })
    expect(r.ignorados).toBe(3)
    expect(r.metricas.totalTransacoes).toBe(1)
  })

  it('não conta peças de itens malformados', () => {
    const s = sale('venda', [item('p1', 1, 5990)], hoursAgo(1))
    s.itens.push({ produtoId: '', quantidade: 2 } as SaleItem, { produtoId: 'p2', quantidade: 1.5, precoUnitario: 10 } as SaleItem)
    const r = buildSalesReport([s], { referenceDate: REF })
    expect(r.porTipo.venda.pecas).toBe(1)
  })

  it('usa todo o período e a data atual por padrão', () => {
    const r = buildSalesReport([sale('venda', [item('p1', 1, 5990)], new Date('2020-01-01T12:00:00Z'))])
    expect(r.metricas.totalTransacoes).toBe(1)
  })

  it('mantém os valores em centavos inteiros (sem erro de ponto flutuante)', () => {
    const muitas = Array.from({ length: 10 }, () => sale('venda', [item('p1', 1, 10)], hoursAgo(1)))
    const r = buildSalesReport(muitas, { referenceDate: REF })
    expect(r.porTipo.venda.valor).toBe(100)
    expect(Number.isInteger(r.metricas.ticketMedio)).toBe(true)
  })
})

describe('isValidSaleForReport', () => {
  it('aceita transação coerente e rejeita valores negativos', () => {
    const ok = sale('venda', [item('p1', 1, 5990)], REF)
    expect(isValidSaleForReport(ok)).toBe(true)
    expect(isValidSaleForReport({ ...ok, desconto: -1 })).toBe(false)
    expect(isValidSaleForReport({ ...ok, subtotal: Number.NaN })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. Relatório de movimentação de estoque
// ---------------------------------------------------------------------------

describe('buildStockMovementReport', () => {
  const movimentos: ReportMovement[] = [
    mov('p1', 'entrada', 20, daysAgo(3)),
    mov('p1', 'saida', 2, hoursAgo(2), 'v1'),
    mov('p2', 'entrada', 5, daysAgo(2)),
    mov('p2', 'saida', 1, hoursAgo(3), 'v2'),
    mov('p1', 'entrada', 1, hoursAgo(1), 'v3'), // devolução
    mov('p3', 'saida', 4, daysAgo(1)),
    mov('px', 'entrada', 7, daysAgo(1)), // produto excluído do catálogo
    mov('p2', 'entrada', 50, daysAgo(60)), // fora do período
  ]

  it('retorna relatório zerado sem movimentações', () => {
    const r = buildStockMovementReport([], products, { period: '7days', referenceDate: REF })
    expect(r.totais).toEqual({ movimentacoes: 0, entradas: 0, saidas: 0, saldo: 0 })
    expect(r.porProduto).toEqual([])
    expect(r.porCategoria).toEqual([])
  })

  it('totaliza entradas, saídas e saldo do período', () => {
    const r = buildStockMovementReport(movimentos, products, { period: '30days', referenceDate: REF })
    expect(r.totais).toEqual({ movimentacoes: 7, entradas: 33, saidas: 7, saldo: 26 })
  })

  it('separa movimentações avulsas das geradas por vendas (vendaId)', () => {
    const r = buildStockMovementReport(movimentos, products, { period: '30days', referenceDate: REF })
    expect(r.porVendas).toEqual({ movimentacoes: 3, entradas: 1, saidas: 3, saldo: -2 })
    expect(r.avulsas).toEqual({ movimentacoes: 4, entradas: 32, saidas: 4, saldo: 28 })
  })

  it('consolida por produto, ordenando pelo volume movimentado', () => {
    const r = buildStockMovementReport(movimentos, products, { period: '30days', referenceDate: REF })
    expect(r.porProduto.map((p) => p.produtoId)).toEqual(['p1', 'px', 'p2', 'p3'])
    expect(r.porProduto[0]).toEqual({
      produtoId: 'p1',
      nome: 'Camiseta UFSCar (M)',
      categoria: 'Camisetas',
      estoqueAtual: 10,
      movimentacoes: 3,
      entradas: 21,
      saidas: 2,
      saldo: 19,
    })
  })

  it('desempata produtos com o mesmo volume pelo nome', () => {
    const r = buildStockMovementReport(
      [mov('p2', 'entrada', 2, hoursAgo(1)), mov('p3', 'entrada', 2, hoursAgo(1))],
      products,
      { referenceDate: REF },
    )
    expect(r.porProduto.map((p) => p.produtoId)).toEqual(['p3', 'p2'])
  })

  it('identifica produto removido do catálogo', () => {
    const r = buildStockMovementReport(movimentos, products, { period: '30days', referenceDate: REF })
    const removido = r.porProduto.find((p) => p.produtoId === 'px')
    expect(removido).toMatchObject({ nome: REMOVED_PRODUCT_LABEL, categoria: null, estoqueAtual: null })
  })

  it('consolida por categoria na ordem do catálogo, com removidos ao final', () => {
    const r = buildStockMovementReport(movimentos, products, { period: '30days', referenceDate: REF })
    expect(r.porCategoria.map((c) => c.categoria)).toEqual(['Camisetas', 'Moletons', 'Bonés', null])
    expect(r.porCategoria[1]).toMatchObject({ entradas: 5, saidas: 1, saldo: 4 })
  })

  it('respeita o filtro de período', () => {
    const r = buildStockMovementReport(movimentos, products, { period: 'today', referenceDate: REF })
    expect(r.totais.movimentacoes).toBe(3)
    expect(buildStockMovementReport(movimentos, products).totais.movimentacoes).toBe(8)
  })

  it('ignora movimentações malformadas', () => {
    const ruins = [
      { ...mov('p1', 'entrada', 1, REF), tipo: 'ajuste' },
      { ...mov('p1', 'entrada', 1, REF), quantidade: 0 },
      { ...mov('p1', 'entrada', 1, REF), quantidade: 2.5 },
      { ...mov('p1', 'entrada', 1, REF), produtoId: '' },
      { ...mov('p1', 'entrada', 1, REF), data: '2026-11-19' },
    ] as unknown as ReportMovement[]
    const r = buildStockMovementReport(ruins, products, { referenceDate: REF })
    expect(r.ignorados).toBe(5)
    expect(r.totais.movimentacoes).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Relatório dos produtos mais vendidos
// ---------------------------------------------------------------------------

describe('buildTopSellingReport', () => {
  it('retorna ranking vazio sem vendas no período', () => {
    const r = buildTopSellingReport([], products, { period: 'today', referenceDate: REF })
    expect(r).toEqual({ ranking: [], totalProdutos: 0, totalUnidades: 0, totalReceita: 0 })
  })

  it('ordena por quantidade vendida e numera as posições', () => {
    const r = buildTopSellingReport(
      [
        sale('venda', [item('p1', 3, 5990, 'Camiseta'), item('p2', 1, 14990, 'Moletom')], hoursAgo(1)),
        sale('venda', [item('p3', 2, 4990, 'Boné')], hoursAgo(2)),
      ],
      products,
      { referenceDate: REF },
    )
    expect(r.ranking.map((x) => [x.posicao, x.produtoId, x.quantidade, x.receita])).toEqual([
      [1, 'p1', 3, 17970],
      [2, 'p3', 2, 9980],
      [3, 'p2', 1, 14990],
    ])
    expect(r.ranking[0].categoria).toBe('Camisetas')
    expect(r.totalUnidades).toBe(6)
    expect(r.totalReceita).toBe(17970 + 9980 + 14990)
  })

  it('ordena por receita quando solicitado', () => {
    const r = buildTopSellingReport(
      [sale('venda', [item('p1', 3, 5990), item('p2', 2, 14990)], hoursAgo(1))],
      products,
      { referenceDate: REF, sortBy: 'receita' },
    )
    expect(r.ranking.map((x) => x.produtoId)).toEqual(['p2', 'p1'])
  })

  it('devoluções abatem unidades e receita', () => {
    const r = buildTopSellingReport(
      [
        sale('venda', [item('p1', 3, 5990)], hoursAgo(3)),
        sale('devolucao', [item('p1', 1, 5990)], hoursAgo(1)),
      ],
      products,
      { referenceDate: REF },
    )
    expect(r.ranking[0]).toMatchObject({ produtoId: 'p1', quantidade: 2, receita: 11980 })
  })

  it('troca soma as peças levadas e abate as devolvidas sem estornar receita', () => {
    const r = buildTopSellingReport(
      [
        sale('venda', [item('p1', 2, 5990)], hoursAgo(3)),
        sale('troca', [item('p2', 1, 14990)], hoursAgo(1), { itensDevolvidos: [item('p1', 1, 5990)] }),
      ],
      products,
      { referenceDate: REF },
    )
    const p1 = r.ranking.find((x) => x.produtoId === 'p1')
    const p2 = r.ranking.find((x) => x.produtoId === 'p2')
    expect(p1).toMatchObject({ quantidade: 1, receita: 11980 })
    expect(p2).toMatchObject({ quantidade: 1, receita: 14990 })
  })

  it('exclui produtos com venda líquida zero ou negativa', () => {
    const r = buildTopSellingReport(
      [
        sale('venda', [item('p1', 1, 5990)], hoursAgo(3)),
        sale('devolucao', [item('p1', 1, 5990)], hoursAgo(2)),
        sale('devolucao', [item('p2', 1, 14990)], hoursAgo(1)),
      ],
      products,
      { referenceDate: REF },
    )
    expect(r.ranking).toEqual([])
    expect(r.totalProdutos).toBe(0)
  })

  it('desempata pelo critério secundário e depois pelo nome', () => {
    const r = buildTopSellingReport(
      [sale('venda', [item('b', 2, 1000, 'Bolsa'), item('a', 2, 1000, 'Agasalho'), item('c', 2, 5000, 'Calça')], hoursAgo(1))],
      [],
      { referenceDate: REF },
    )
    expect(r.ranking.map((x) => x.nome)).toEqual(['Calça', 'Agasalho', 'Bolsa'])
    expect(r.ranking[0].categoria).toBeNull()
  })

  it('limita o ranking (padrão de 10) mantendo os totais de todos os produtos', () => {
    const itens = Array.from({ length: 12 }, (_, i) => item(`x${i}`, i + 1, 100, `Produto ${i}`))
    const vendas = [sale('venda', itens, hoursAgo(1))]
    const padrao = buildTopSellingReport(vendas, [], { referenceDate: REF })
    expect(padrao.ranking).toHaveLength(DEFAULT_TOP_LIMIT)
    expect(padrao.totalProdutos).toBe(12)
    expect(padrao.ranking[0].produtoId).toBe('x11')
    expect(buildTopSellingReport(vendas, [], { referenceDate: REF, limit: 3 }).ranking).toHaveLength(3)
    expect(buildTopSellingReport(vendas, [], { referenceDate: REF, limit: 0 }).ranking).toHaveLength(DEFAULT_TOP_LIMIT)
  })

  it('respeita o período e ignora transações e itens malformados', () => {
    const antiga = sale('venda', [item('p2', 5, 14990)], daysAgo(10))
    const comItemRuim = sale('venda', [item('p1', 1, 5990)], hoursAgo(1))
    comItemRuim.itens.push({ produtoId: 'p3', quantidade: -1, precoUnitario: 4990 } as SaleItem)
    const invalida = { ...sale('venda', [item('p3', 9, 4990)], hoursAgo(1)), tipo: 'x' } as unknown as Sale
    const r = buildTopSellingReport([antiga, comItemRuim, invalida], products, { period: '7days', referenceDate: REF })
    expect(r.ranking.map((x) => x.produtoId)).toEqual(['p1'])
  })

  it('usa rótulos padrão para itens sem nome ou cor', () => {
    const semDados = { produtoId: 'p9', nome: '', tamanho: '', quantidade: 1, precoUnitario: 100 } as unknown as SaleItem
    const r = buildTopSellingReport([sale('venda', [semDados], hoursAgo(1))], [])
    expect(r.ranking[0]).toMatchObject({ nome: REMOVED_PRODUCT_LABEL, tamanho: '', cor: { nome: '', hex: '#cccccc' } })
  })
})

describe('sharePercent', () => {
  it('calcula a participação com uma casa decimal', () => {
    expect(sharePercent(3, 8)).toBe(37.5)
    expect(sharePercent(1, 3)).toBe(33.3)
  })

  it('retorna zero quando o total é zero', () => {
    expect(sharePercent(5, 0)).toBe(0)
  })
})
