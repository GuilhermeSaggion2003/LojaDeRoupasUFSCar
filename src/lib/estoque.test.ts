import { describe, expect, it } from '@jest/globals'
import { FirebaseError } from 'firebase/app'
import {
  LOW_STOCK_THRESHOLD,
  buildMovementId,
  calculateNewBalance,
  classifyStockLevel,
  filterMovementsByCategory,
  filterProductsByCategory,
  formatMovementDate,
  listAlerts,
  movementFromDelta,
  validateMovement,
  type StockMovement,
} from './estoque'
import { Timestamp } from 'firebase/firestore'
import { MovementValidationError, describeEstoqueError, productVersionMillis } from './estoque-db'
import type { Category, Product } from './products'

// ---------------------------------------------------------------------------
// Helpers e Mocks
// ---------------------------------------------------------------------------

const sampleProduct = (overrides?: Partial<Product>): Product => ({
  id: 'prod-1',
  name: 'Camiseta UFSCar',
  category: 'Camisetas',
  size: 'M',
  color: { name: 'Azul', hex: '#1e2a5a' },
  price: 59.9,
  stock: 10,
  ...overrides,
})

const sampleMovement = (overrides?: Partial<StockMovement>): StockMovement => ({
  id: 'mov-1',
  produtoId: 'prod-1',
  tipo: 'entrada',
  quantidade: 5,
  data: new Date('2026-10-20T14:30:00Z'),
  usuarioId: 'user-123',
  ...overrides,
})

// ---------------------------------------------------------------------------
// Testes de validateMovement
// ---------------------------------------------------------------------------

describe('validateMovement', () => {
  describe('fluxo principal (sucesso)', () => {
    it('valida entrada com quantidade inteira positiva', () => {
      const res = validateMovement('prod-1', 'entrada', 10, 0)
      expect(res).toEqual({ ok: true })
    })

    it('valida saída com quantidade menor que o estoque atual', () => {
      const res = validateMovement('prod-1', 'saida', 3, 5)
      expect(res).toEqual({ ok: true })
    })

    it('valida saída com quantidade exatamente igual ao estoque atual (zera o saldo)', () => {
      const res = validateMovement('prod-1', 'saida', 5, 5)
      expect(res).toEqual({ ok: true })
    })
  })

  describe('fluxos alternativos e tratamento de erros', () => {
    it('rejeita produtoId vazio', () => {
      const res = validateMovement('', 'entrada', 5, 10)
      expect(res).toEqual({ ok: false, error: 'Selecione um produto.' })
    })

    it('rejeita tipo vazio', () => {
      const res = validateMovement('prod-1', '', 5, 10)
      expect(res).toEqual({
        ok: false,
        error: 'Selecione o tipo de movimentação (entrada ou saída).',
      })
    })

    it.each([
      ['vazio string', '', 'Informe a quantidade.'],
      ['null', null as unknown as number, 'Informe a quantidade.'],
      ['undefined', undefined as unknown as number, 'Informe a quantidade.'],
      ['zero', 0, 'A quantidade deve ser um número inteiro maior que zero.'],
      ['negativo', -5, 'A quantidade deve ser um número inteiro maior que zero.'],
      ['decimal', 2.5, 'A quantidade deve ser um número inteiro maior que zero.'],
      ['NaN', Number.NaN, 'A quantidade deve ser um número inteiro maior que zero.'],
      ['Infinity', Number.POSITIVE_INFINITY, 'A quantidade deve ser um número inteiro maior que zero.'],
    ])('rejeita quantidade inválida (%s)', (_, qty, expectedError) => {
      const res = validateMovement('prod-1', 'entrada', qty as unknown as number | '', 10)
      expect(res).toEqual({ ok: false, error: expectedError })
    })

    it('rejeita saída que excede o estoque atual (saldo insuficiente)', () => {
      const res = validateMovement('prod-1', 'saida', 6, 5)
      expect(res).toEqual({
        ok: false,
        error: 'Saldo insuficiente. Estoque atual: 5 unidade(s).',
      })
    })

    it('rejeita saída quando o estoque atual é zero', () => {
      const res = validateMovement('prod-1', 'saida', 1, 0)
      expect(res).toEqual({
        ok: false,
        error: 'Saldo insuficiente. Estoque atual: 0 unidade(s).',
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Testes de calculateNewBalance
// ---------------------------------------------------------------------------

describe('calculateNewBalance', () => {
  describe('fluxo principal', () => {
    it('soma quantidade no estoque existente em entrada', () => {
      expect(calculateNewBalance(10, 'entrada', 5)).toBe(15)
    })

    it('adiciona quantidade a estoque zerado em entrada', () => {
      expect(calculateNewBalance(0, 'entrada', 20)).toBe(20)
    })

    it('subtrai quantidade do estoque em saída', () => {
      expect(calculateNewBalance(15, 'saida', 5)).toBe(10)
    })

    it('permite saída que zera o estoque (saldo 0)', () => {
      expect(calculateNewBalance(7, 'saida', 7)).toBe(0)
    })
  })

  describe('fluxo com erro (defesa em profundidade)', () => {
    it('lança erro ao tentar retirar quantidade maior que o estoque', () => {
      expect(() => calculateNewBalance(4, 'saida', 5)).toThrow(
        'Saldo insuficiente: tentativa de retirar 5 de um estoque de 4.',
      )
    })

    it('lança erro ao tentar retirar de estoque já zerado', () => {
      expect(() => calculateNewBalance(0, 'saida', 1)).toThrow(
        'Saldo insuficiente: tentativa de retirar 1 de um estoque de 0.',
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Testes de classifyStockLevel
// ---------------------------------------------------------------------------

describe('buildMovementId (ID versionado, A9)', () => {
  it('monta {produtoId}_{tipo}_{versão}', () => {
    expect(buildMovementId('p1', 'entrada', 1764240000123)).toBe('p1_entrada_1764240000123')
    expect(buildMovementId('p1', 'saida', 0)).toBe('p1_saida_0')
  })

  it('versões diferentes do mesmo produto geram IDs diferentes (sem colisão)', () => {
    const primeira = buildMovementId('p1', 'entrada', 1000)
    const segunda = buildMovementId('p1', 'entrada', 1001)
    expect(primeira).not.toBe(segunda)
  })

  it('rejeita produto vazio', () => {
    expect(() => buildMovementId('', 'entrada', 1)).toThrow('ID do produto obrigatório')
  })

  it('rejeita tipo desconhecido', () => {
    expect(() => buildMovementId('p1', 'ajuste' as never, 1)).toThrow('Tipo de movimentação inválido')
  })

  it.each([NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejeita versão malformada (%p)',
    (versao) => {
      expect(() => buildMovementId('p1', 'saida', versao)).toThrow('Versão do produto inválida')
    },
  )
})

describe('productVersionMillis', () => {
  it('converte atualizadoEm em milissegundos inteiros, truncando os microssegundos', () => {
    // 1 s + 123,456789 ms → 1123 ms (o SDK daria 1123.456789 em toMillis())
    expect(productVersionMillis({ atualizadoEm: new Timestamp(1, 123_456_789) })).toBe(1123)
    expect(productVersionMillis({ atualizadoEm: Timestamp.fromMillis(0) })).toBe(0)
  })

  it('lança MovementValidationError quando atualizadoEm está ausente ou malformado', () => {
    expect(() => productVersionMillis({})).toThrow(MovementValidationError)
    expect(() => productVersionMillis({ atualizadoEm: '2026-11-27' })).toThrow(MovementValidationError)
  })
})

describe('movementFromDelta', () => {
  it('delta positivo vira entrada', () => {
    expect(movementFromDelta(3)).toEqual({ tipo: 'entrada', quantidade: 3 })
  })

  it('delta negativo vira saída com quantidade positiva', () => {
    expect(movementFromDelta(-2)).toEqual({ tipo: 'saida', quantidade: 2 })
  })

  it('delta zero não gera movimentação', () => {
    expect(movementFromDelta(0)).toBeNull()
  })

  it('rejeita delta não inteiro', () => {
    expect(() => movementFromDelta(1.5)).toThrow('número inteiro')
  })
})

describe('classifyStockLevel', () => {
  it('classifica estoque zero como "Esgotado"', () => {
    expect(classifyStockLevel(0)).toBe('Esgotado')
  })

  it('classifica estoque entre 1 e LOW_STOCK_THRESHOLD como "Baixo"', () => {
    expect(classifyStockLevel(1)).toBe('Baixo')
    expect(classifyStockLevel(LOW_STOCK_THRESHOLD)).toBe('Baixo')
  })

  it('classifica estoque acima de LOW_STOCK_THRESHOLD como "Disponível"', () => {
    expect(classifyStockLevel(LOW_STOCK_THRESHOLD + 1)).toBe('Disponível')
    expect(classifyStockLevel(100)).toBe('Disponível')
  })

  it('aceita threshold customizado', () => {
    const customThreshold = 10
    expect(classifyStockLevel(10, customThreshold)).toBe('Baixo')
    expect(classifyStockLevel(11, customThreshold)).toBe('Disponível')
    expect(classifyStockLevel(0, customThreshold)).toBe('Esgotado')
  })
})

// ---------------------------------------------------------------------------
// Testes de listAlerts
// ---------------------------------------------------------------------------

describe('listAlerts', () => {
  it('retorna lista vazia se todos os produtos estiverem com estoque normal', () => {
    const products = [
      sampleProduct({ id: 'p1', stock: 10 }),
      sampleProduct({ id: 'p2', stock: 6 }),
    ]
    expect(listAlerts(products)).toEqual([])
  })

  it('filtra e classifica produtos com estoque <= threshold', () => {
    const p1 = sampleProduct({ id: 'p1', name: 'Boné', stock: 0 })
    const p2 = sampleProduct({ id: 'p2', name: 'Moletom', stock: 3 })
    const p3 = sampleProduct({ id: 'p3', name: 'Camiseta', stock: 12 })

    const alerts = listAlerts([p1, p2, p3])
    expect(alerts).toHaveLength(2)
    expect(alerts[0]).toMatchObject({ id: 'p1', name: 'Boné', level: 'Esgotado' })
    expect(alerts[1]).toMatchObject({ id: 'p2', name: 'Moletom', level: 'Baixo' })
  })

  it('ordena "Esgotado" antes de "Baixo", e depois por nome alfabético (pt-BR)', () => {
    const pBaixoA = sampleProduct({ id: '1', name: 'Agasalho', stock: 2 })
    const pBaixoZ = sampleProduct({ id: '2', name: 'Zíper Bag', stock: 4 })
    const pEsgotadoB = sampleProduct({ id: '3', name: 'Bermuda', stock: 0 })
    const pEsgotadoA = sampleProduct({ id: '4', name: 'Água Squeeze', stock: 0 })

    const alerts = listAlerts([pBaixoZ, pBaixoA, pEsgotadoB, pEsgotadoA])

    // Esgotados primeiro, ordenados por nome: "Água Squeeze", "Bermuda"
    // Baixos depois, ordenados por nome: "Agasalho", "Zíper Bag"
    expect(alerts.map((a) => a.name)).toEqual([
      'Água Squeeze',
      'Bermuda',
      'Agasalho',
      'Zíper Bag',
    ])
    expect(alerts.map((a) => a.level)).toEqual([
      'Esgotado',
      'Esgotado',
      'Baixo',
      'Baixo',
    ])
  })

  it('permite passar threshold customizado', () => {
    const p = sampleProduct({ id: 'p1', stock: 8 })
    expect(listAlerts([p], 5)).toEqual([])
    expect(listAlerts([p], 10)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Testes de filterMovementsByCategory
// ---------------------------------------------------------------------------

describe('filterMovementsByCategory', () => {
  const categoryMap: Record<string, Category> = {
    p1: 'Camisetas',
    p2: 'Moletons',
    p3: 'Acessórios',
  }

  const movements: StockMovement[] = [
    sampleMovement({ id: 'm1', produtoId: 'p1' }),
    sampleMovement({ id: 'm2', produtoId: 'p2' }),
    sampleMovement({ id: 'm3', produtoId: 'p3' }),
    sampleMovement({ id: 'm4', produtoId: 'p1' }),
  ]

  it('retorna todas as movimentações quando categoria for "all"', () => {
    const result = filterMovementsByCategory(movements, categoryMap, 'all')
    expect(result).toHaveLength(4)
    expect(result).toBe(movements)
  })

  it('filtra movimentações apenas da categoria selecionada', () => {
    const result = filterMovementsByCategory(movements, categoryMap, 'Camisetas')
    expect(result.map((m) => m.id)).toEqual(['m1', 'm4'])
  })

  it('retorna vazio quando nenhum produto pertence à categoria', () => {
    const result = filterMovementsByCategory(movements, categoryMap, 'Calças')
    expect(result).toEqual([])
  })

  it('ignora movimentação cujo produtoId não existe no categoryMap', () => {
    const orphanMov = sampleMovement({ id: 'm5', produtoId: 'pInexistente' })
    const result = filterMovementsByCategory([orphanMov], categoryMap, 'Camisetas')
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Testes de filterProductsByCategory
// ---------------------------------------------------------------------------

describe('filterProductsByCategory', () => {
  const products: Product[] = [
    sampleProduct({ id: 'p1', category: 'Camisetas' }),
    sampleProduct({ id: 'p2', category: 'Moletons' }),
    sampleProduct({ id: 'p3', category: 'Camisetas' }),
  ]

  it('retorna todos os produtos quando categoria for "all"', () => {
    const result = filterProductsByCategory(products, 'all')
    expect(result).toHaveLength(3)
    expect(result).toBe(products)
  })

  it('filtra produtos apenas da categoria informada', () => {
    const result = filterProductsByCategory(products, 'Camisetas')
    expect(result.map((p) => p.id)).toEqual(['p1', 'p3'])
  })

  it('retorna array vazio quando nenhum produto pertence à categoria', () => {
    const result = filterProductsByCategory(products, 'Acessórios')
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Testes de formatMovementDate
// ---------------------------------------------------------------------------

describe('formatMovementDate', () => {
  it('formata objeto Date em data e hora no fuso horário de SP', () => {
    // 2026-10-22T13:42:00Z -> em UTC-3 é 2026-10-22 10:42
    const d = new Date('2026-10-22T13:42:00Z')
    const formatted = formatMovementDate(d)

    expect(formatted.date).toBe('22/10/2026')
    expect(formatted.time).toBe('10:42')
  })
})

// ---------------------------------------------------------------------------
// Testes de describeEstoqueError
// ---------------------------------------------------------------------------

describe('describeEstoqueError', () => {
  it.each([
    ['permission-denied', 'Você não tem permissão para registrar movimentações.'],
    ['unavailable', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'],
    ['not-found', 'Produto não encontrado. Pode ter sido excluído.'],
    ['aborted', 'A operação foi cancelada por conflito. Tente novamente.'],
    ['unknown-code', 'Não foi possível registrar a movimentação. Tente novamente.'],
  ])('traduz FirebaseError "%s" para mensagem clara', (code, expected) => {
    const err = new FirebaseError(code, 'Firebase internal details')
    expect(describeEstoqueError(err)).toBe(expected)
  })

  it('repassa a mensagem de validação detectada na transação', () => {
    expect(describeEstoqueError(new MovementValidationError('Saldo insuficiente. Estoque atual: 2 unidade(s).'))).toBe(
      'Saldo insuficiente. Estoque atual: 2 unidade(s).',
    )
  })

  it('retorna mensagem genérica para erros desconhecidos ou genéricos', () => {
    expect(describeEstoqueError(new Error('Falha aleatória'))).toBe(
      'Não foi possível registrar a movimentação. Tente novamente.',
    )
    expect(describeEstoqueError('string error')).toBe(
      'Não foi possível registrar a movimentação. Tente novamente.',
    )
    expect(describeEstoqueError(null)).toBe(
      'Não foi possível registrar a movimentação. Tente novamente.',
    )
  })
})
