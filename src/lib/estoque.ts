/**
 * estoque.ts — Lógica de negócio do controle de estoque (funções puras).
 *
 * Nenhuma chamada ao Firestore aqui: todas as funções recebem dados por
 * parâmetro e retornam valores, tornando-as testáveis sem mock.
 */

import type { Product, Category } from './products'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type MovementType = 'entrada' | 'saida'

/** Documento lido da coleção `estoque` já mapeado para a interface. */
export type StockMovement = {
  id: string
  produtoId: string
  tipo: MovementType
  quantidade: number
  /** Timestamp convertido para Date pelo observador do Firestore. */
  data: Date
  usuarioId: string
}

/** Resultado de uma validação de movimentação. */
export type MovementValidationResult =
  | { ok: true }
  | { ok: false; error: string }

/** Nível de estoque de um produto. */
export type StockLevel = 'Disponível' | 'Baixo' | 'Esgotado'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/**
 * Quantidade mínima para considerar o estoque "Disponível".
 * Produtos com estoque > 0 e <= LOW_STOCK_THRESHOLD são classificados como "Baixo".
 * Exporte esta constante para permitir que a UI a exiba/configure.
 */
export const LOW_STOCK_THRESHOLD = 5

// ---------------------------------------------------------------------------
// Validação de movimentação
// ---------------------------------------------------------------------------

/**
 * Valida os dados de uma movimentação antes de enviá-la ao Firestore.
 * Recebe o estoque atual do produto para verificar saldo negativo em saídas.
 */
export function validateMovement(
  produtoId: string,
  tipo: MovementType | '',
  quantidade: number | '',
  estoqueAtual: number,
): MovementValidationResult {
  if (!produtoId) {
    return { ok: false, error: 'Selecione um produto.' }
  }

  if (!tipo) {
    return { ok: false, error: 'Selecione o tipo de movimentação (entrada ou saída).' }
  }

  if (quantidade === '' || quantidade === null || quantidade === undefined) {
    return { ok: false, error: 'Informe a quantidade.' }
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return { ok: false, error: 'A quantidade deve ser um número inteiro maior que zero.' }
  }

  if (tipo === 'saida' && quantidade > estoqueAtual) {
    return {
      ok: false,
      error: `Saldo insuficiente. Estoque atual: ${estoqueAtual} unidade(s).`,
    }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Cálculo de saldo
// ---------------------------------------------------------------------------

/**
 * Calcula o novo saldo após uma movimentação.
 * Lança erro se o resultado for negativo (defesa em profundidade — a regra
 * do Firestore também bloqueia, mas esta função protege a camada da UI).
 */
export function calculateNewBalance(
  estoqueAtual: number,
  tipo: MovementType,
  quantidade: number,
): number {
  if (tipo === 'entrada') return estoqueAtual + quantidade

  const result = estoqueAtual - quantidade
  if (result < 0) {
    throw new Error(
      `Saldo insuficiente: tentativa de retirar ${quantidade} de um estoque de ${estoqueAtual}.`,
    )
  }
  return result
}

// ---------------------------------------------------------------------------
// Classificação de nível de estoque
// ---------------------------------------------------------------------------

/**
 * Classifica o nível de estoque de um produto.
 *
 * | Condição                              | Nível       |
 * |---------------------------------------|-------------|
 * | estoque == 0                          | Esgotado    |
 * | 0 < estoque <= LOW_STOCK_THRESHOLD    | Baixo       |
 * | estoque > LOW_STOCK_THRESHOLD         | Disponível  |
 *
 * @param threshold Limite mínimo para "Disponível" (padrão: LOW_STOCK_THRESHOLD).
 */
export function classifyStockLevel(
  stock: number,
  threshold = LOW_STOCK_THRESHOLD,
): StockLevel {
  if (stock === 0) return 'Esgotado'
  if (stock <= threshold) return 'Baixo'
  return 'Disponível'
}

// ---------------------------------------------------------------------------
// Alertas de baixa / esgotamento
// ---------------------------------------------------------------------------

/**
 * Retorna os produtos em alerta (Baixo ou Esgotado), ordenados por nível
 * (Esgotado primeiro) e depois por nome.
 *
 * @param threshold Limite mínimo de estoque (padrão: LOW_STOCK_THRESHOLD).
 */
export function listAlerts(
  products: Product[],
  threshold = LOW_STOCK_THRESHOLD,
): Array<Product & { level: StockLevel }> {
  return products
    .filter((p) => p.stock <= threshold)
    .map((p) => ({ ...p, level: classifyStockLevel(p.stock, threshold) }))
    .sort((a, b) => {
      // Esgotado antes de Baixo
      if (a.level === 'Esgotado' && b.level !== 'Esgotado') return -1
      if (a.level !== 'Esgotado' && b.level === 'Esgotado') return 1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
}

// ---------------------------------------------------------------------------
// Filtro por categoria
// ---------------------------------------------------------------------------

/**
 * Filtra uma lista de movimentações por categoria do produto.
 * Requer um mapa de produtoId → Category para fazer o join.
 */
export function filterMovementsByCategory(
  movements: StockMovement[],
  categoryMap: Record<string, Category>,
  category: Category | 'all',
): StockMovement[] {
  if (category === 'all') return movements
  return movements.filter((m) => categoryMap[m.produtoId] === category)
}

/**
 * Filtra uma lista de produtos por categoria.
 * Passando 'all' retorna todos os produtos.
 */
export function filterProductsByCategory(
  products: Product[],
  category: Category | 'all',
): Product[] {
  if (category === 'all') return products
  return products.filter((p) => p.category === category)
}

// ---------------------------------------------------------------------------
// Formatação de datas
// ---------------------------------------------------------------------------

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

/** Formata uma Date de movimentação para exibição na UI. */
export function formatMovementDate(date: Date): { date: string; time: string } {
  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date),
  }
}
