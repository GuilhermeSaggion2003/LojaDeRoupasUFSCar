/**
 * Testes de integração (A9 / EAP 3.1).
 *
 * Diferente de tests/firestore.rules.test.ts (que monta os batches à mão),
 * aqui são chamadas as MESMAS funções usadas pelas telas — createProduct,
 * registrarMovimentacao e registrarVenda — contra as regras reais do
 * firestore.rules no emulador, autenticadas como Gerente ou Funcionário.
 * Ao final, os relatórios (A8) são gerados a partir dos dados gravados.
 *
 * Rodar com: npm run test:integration (requer JDK 21 para o emulador).
 */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { FirebaseError } from 'firebase/app'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  setLogLevel,
  Timestamp,
  type Firestore,
} from 'firebase/firestore'
import { setTestFirestore } from '../support/firebase-stub'
import { createProduct } from '../../src/lib/products-db'
import {
  MovementValidationError,
  describeEstoqueError,
  registrarMovimentacao,
} from '../../src/lib/estoque-db'
import { InsufficientStockError, registrarVenda } from '../../src/lib/sales-db'
import { calculateSubtotal, type Sale, type SaleItem, type TransactionType } from '../../src/lib/sales'
import { productFromDoc, type Product, type ProductInput } from '../../src/lib/products'
import type { MovementType, StockMovement } from '../../src/lib/estoque'
import {
  buildSalesReport,
  buildStockMovementReport,
  buildTopSellingReport,
} from '../../src/lib/relatorios'

let env: RulesTestEnvironment

const GERENTE = 'gerente-uid'
const FUNCIONARIO = 'funcionario-uid'

// ---------------------------------------------------------------------------
// Contextos e leitura do estado (sem regras, apenas para conferência)
// ---------------------------------------------------------------------------

/** Autentica a camada de dados como o perfil informado. */
function comoUsuario(uid: string): void {
  setTestFirestore(env.authenticatedContext(uid).firestore() as unknown as Firestore)
}

async function lerSemRegras<T>(fn: (db: Firestore) => Promise<T>): Promise<T> {
  let result!: T
  await env.withSecurityRulesDisabled(async (ctx) => {
    result = await fn(ctx.firestore() as unknown as Firestore)
  })
  return result
}

const estoqueDe = (produtoId: string) =>
  lerSemRegras(async (db) => (await getDoc(doc(db, 'produtos', produtoId))).data()?.estoque as number)

const lerProdutos = () =>
  lerSemRegras(async (db) =>
    (await getDocs(collection(db, 'produtos'))).docs.flatMap((d) => {
      const p = productFromDoc(d.id, d.data())
      return p ? [p] : []
    }),
  )

const lerMovimentacoes = () =>
  lerSemRegras(async (db) =>
    (await getDocs(collection(db, 'estoque'))).docs.map((d): StockMovement => {
      const data = d.data()
      return {
        id: d.id,
        produtoId: data.produtoId as string,
        tipo: data.tipo as MovementType,
        quantidade: data.quantidade as number,
        data: (data.data as Timestamp).toDate(),
        usuarioId: data.usuarioId as string,
        ...(typeof data.vendaId === 'string' ? { vendaId: data.vendaId } : {}),
      }
    }),
  )

const lerVendas = () =>
  lerSemRegras(async (db) =>
    (await getDocs(collection(db, 'vendas'))).docs.map((d): Sale => {
      const data = d.data()
      return {
        id: d.id,
        itens: data.itens as SaleItem[],
        itensDevolvidos: data.itensDevolvidos as SaleItem[] | undefined,
        subtotal: data.subtotal as number,
        desconto: data.desconto as number,
        total: data.total as number,
        tipo: data.tipo as TransactionType,
        data: (data.data as Timestamp).toDate(),
        usuarioId: data.usuarioId as string,
      }
    }),
  )

// ---------------------------------------------------------------------------
// Dados de apoio
// ---------------------------------------------------------------------------

const camiseta: ProductInput = {
  name: 'Camiseta Básica UFSCar',
  category: 'Camisetas',
  size: 'M',
  color: { name: 'Azul-marinho', hex: '#1e2a5a' },
  priceCents: 5990,
}

const moletom: ProductInput = {
  name: 'Moletom Canguru UFSCar',
  category: 'Moletons',
  size: 'G',
  color: { name: 'Cinza', hex: '#8a8f98' },
  priceCents: 14990,
}

function item(produtoId: string, input: ProductInput, quantidade: number): SaleItem {
  return {
    produtoId,
    nome: input.name,
    tamanho: input.size,
    cor: { nome: input.color.name, hex: input.color.hex },
    quantidade,
    precoUnitario: input.priceCents,
  }
}

/** Monta a transação como o PDV faz (subtotal calculado, desconto só em venda). */
function transacao(
  tipo: TransactionType,
  itens: SaleItem[],
  desconto = 0,
  itensDevolvidos?: SaleItem[],
): Omit<Sale, 'id' | 'data' | 'usuarioId'> {
  const subtotal = calculateSubtotal(itens)
  return {
    tipo,
    itens,
    subtotal,
    desconto,
    total: subtotal - desconto,
    ...(itensDevolvidos ? { itensDevolvidos } : {}),
  }
}

/** Gerente cadastra o produto e registra a entrada inicial pelo módulo de Estoque. */
async function cadastrarComEstoque(input: ProductInput, quantidade: number): Promise<string> {
  comoUsuario(GERENTE)
  const id = await createProduct(input)
  await registrarMovimentacao(id, 'entrada', quantidade, GERENTE)
  return id
}

async function esperarPermissaoNegada(promise: Promise<unknown>) {
  const erro = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(erro).toBeInstanceOf(FirebaseError)
  expect((erro as FirebaseError).code).toBe('permission-denied')
  return erro
}

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

beforeAll(async () => {
  setLogLevel('error')
  env = await initializeTestEnvironment({
    projectId: 'demo-lojaderoupasufscar',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, `usuarios/${GERENTE}`), { nome: 'Ana', perfil: 'gerente' })
    await setDoc(doc(db, `usuarios/${FUNCIONARIO}`), { nome: 'Carlos', perfil: 'funcionario' })
  })
})

// ---------------------------------------------------------------------------
// 1. Estoque (RF04) — correção das movimentações seguidas
// ---------------------------------------------------------------------------

describe('Integração: movimentações de estoque (RF04)', () => {
  it('gerente cadastra produto e registra entradas e saída seguidas do mesmo produto', async () => {
    comoUsuario(GERENTE)
    const id = await createProduct(camiseta)
    expect(await estoqueDe(id)).toBe(0)

    expect(await registrarMovimentacao(id, 'entrada', 10, GERENTE)).toBe(10)
    // Até a S8, a 2ª entrada do mesmo produto era negada (ID fixo virava update)
    expect(await registrarMovimentacao(id, 'entrada', 5, GERENTE)).toBe(15)
    expect(await registrarMovimentacao(id, 'saida', 3, GERENTE)).toBe(12)

    expect(await estoqueDe(id)).toBe(12)
    const movs = await lerMovimentacoes()
    expect(movs).toHaveLength(3)
    expect(new Set(movs.map((m) => m.id)).size).toBe(3)
    expect(movs.every((m) => m.produtoId === id && m.usuarioId === GERENTE && !m.vendaId)).toBe(true)
  })

  it('saída maior que o saldo é recusada sem gravar nada', async () => {
    const id = await cadastrarComEstoque(camiseta, 2)

    const erro = await registrarMovimentacao(id, 'saida', 5, GERENTE).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(MovementValidationError)
    expect(describeEstoqueError(erro)).toContain('Saldo insuficiente')

    expect(await estoqueDe(id)).toBe(2)
    expect(await lerMovimentacoes()).toHaveLength(1)
  })

  it('funcionário não registra movimentação avulsa (RF01)', async () => {
    const id = await cadastrarComEstoque(camiseta, 4)

    comoUsuario(FUNCIONARIO)
    const erro = await esperarPermissaoNegada(registrarMovimentacao(id, 'entrada', 1, FUNCIONARIO))
    expect(describeEstoqueError(erro)).toBe('Você não tem permissão para registrar movimentações.')
    expect(await estoqueDe(id)).toBe(4)
  })

  it('produto inexistente gera mensagem clara', async () => {
    comoUsuario(GERENTE)
    const erro = await registrarMovimentacao('nao-existe', 'entrada', 1, GERENTE).catch((e: unknown) => e)
    expect(describeEstoqueError(erro)).toBe('Produto não encontrado. Pode ter sido excluído.')
  })
})

// ---------------------------------------------------------------------------
// 2. Frente de Caixa (RF05/RF06) — venda, troca e devolução
// ---------------------------------------------------------------------------

describe('Integração: Frente de Caixa (RF05/RF06)', () => {
  it('gerente finaliza venda no PDV (bloqueada até a S8)', async () => {
    const id = await cadastrarComEstoque(camiseta, 10)

    comoUsuario(GERENTE)
    const vendaId = await registrarVenda(transacao('venda', [item(id, camiseta, 2)]), GERENTE)

    expect(await estoqueDe(id)).toBe(8)
    const doPdv = (await lerMovimentacoes()).filter((m) => m.vendaId === vendaId)
    expect(doPdv).toEqual([
      expect.objectContaining({ produtoId: id, tipo: 'saida', quantidade: 2, usuarioId: GERENTE }),
    ])
  })

  it('funcionário registra venda com desconto, troca e devolução', async () => {
    const camisetaId = await cadastrarComEstoque(camiseta, 10)
    const moletomId = await cadastrarComEstoque(moletom, 5)

    comoUsuario(FUNCIONARIO)
    // Venda: 2 camisetas + 1 moletom, R$ 10,00 de desconto
    await registrarVenda(
      transacao('venda', [item(camisetaId, camiseta, 2), item(moletomId, moletom, 1)], 1000),
      FUNCIONARIO,
    )
    expect(await estoqueDe(camisetaId)).toBe(8)
    expect(await estoqueDe(moletomId)).toBe(4)

    // Troca: cliente devolve 1 camiseta e leva 1 moletom
    const trocaId = await registrarVenda(
      transacao('troca', [item(moletomId, moletom, 1)], 0, [item(camisetaId, camiseta, 1)]),
      FUNCIONARIO,
    )
    expect(await estoqueDe(camisetaId)).toBe(9)
    expect(await estoqueDe(moletomId)).toBe(3)
    const movsTroca = (await lerMovimentacoes()).filter((m) => m.vendaId === trocaId)
    expect(movsTroca).toHaveLength(2)

    // Devolução: 1 moletom volta ao estoque
    await registrarVenda(transacao('devolucao', [item(moletomId, moletom, 1)]), FUNCIONARIO)
    expect(await estoqueDe(moletomId)).toBe(4)

    const vendas = await lerVendas()
    expect(vendas.map((v) => v.tipo).sort()).toEqual(['devolucao', 'troca', 'venda'])
    expect(vendas.every((v) => v.usuarioId === FUNCIONARIO)).toBe(true)
  })

  it('estoque insuficiente desfaz toda a transação (atomicidade)', async () => {
    const camisetaId = await cadastrarComEstoque(camiseta, 10)
    const moletomId = await cadastrarComEstoque(moletom, 1)

    comoUsuario(FUNCIONARIO)
    const erro = await registrarVenda(
      transacao('venda', [item(camisetaId, camiseta, 2), item(moletomId, moletom, 3)]),
      FUNCIONARIO,
    ).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(InsufficientStockError)
    expect(await estoqueDe(camisetaId)).toBe(10)
    expect(await estoqueDe(moletomId)).toBe(1)
    expect(await lerVendas()).toHaveLength(0)
    expect((await lerMovimentacoes()).filter((m) => m.vendaId)).toHaveLength(0)
  })

  it('troca de uma peça por outra idêntica não altera o saldo nem gera movimentação', async () => {
    const id = await cadastrarComEstoque(camiseta, 3)

    comoUsuario(FUNCIONARIO)
    const trocaId = await registrarVenda(
      transacao('troca', [item(id, camiseta, 1)], 0, [item(id, camiseta, 1)]),
      FUNCIONARIO,
    )

    expect(await estoqueDe(id)).toBe(3)
    expect((await lerMovimentacoes()).filter((m) => m.vendaId === trocaId)).toHaveLength(0)
    expect(await lerVendas()).toHaveLength(1)
  })

  it('movimentação avulsa e venda seguidas no mesmo produto não colidem', async () => {
    const id = await cadastrarComEstoque(camiseta, 5)

    comoUsuario(FUNCIONARIO)
    await registrarVenda(transacao('venda', [item(id, camiseta, 1)]), FUNCIONARIO)
    comoUsuario(GERENTE)
    expect(await registrarMovimentacao(id, 'entrada', 1, GERENTE)).toBe(5)
    comoUsuario(FUNCIONARIO)
    await registrarVenda(transacao('venda', [item(id, camiseta, 2)]), FUNCIONARIO)

    expect(await estoqueDe(id)).toBe(3)
    expect(await lerMovimentacoes()).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// 3. Ponta a ponta: operação do dia → relatórios (A8)
// ---------------------------------------------------------------------------

describe('Integração ponta a ponta: operação → relatórios (A8)', () => {
  it('os três relatórios refletem exatamente o que foi gravado', async () => {
    const camisetaId = await cadastrarComEstoque(camiseta, 20)
    const moletomId = await cadastrarComEstoque(moletom, 6)

    comoUsuario(FUNCIONARIO)
    await registrarVenda(transacao('venda', [item(camisetaId, camiseta, 3)], 500), FUNCIONARIO)
    await registrarVenda(transacao('venda', [item(moletomId, moletom, 2)]), FUNCIONARIO)
    await registrarVenda(transacao('devolucao', [item(camisetaId, camiseta, 1)]), FUNCIONARIO)
    comoUsuario(GERENTE)
    await registrarMovimentacao(moletomId, 'saida', 1, GERENTE) // peça avariada

    const [vendas, movimentacoes, produtos] = await Promise.all([
      lerVendas(),
      lerMovimentacoes(),
      lerProdutos(),
    ])
    const porId = new Map<string, Product>(produtos.map((p) => [p.id, p]))
    expect(porId.get(camisetaId)?.stock).toBe(18) // 20 - 3 + 1
    expect(porId.get(moletomId)?.stock).toBe(3) // 6 - 2 - 1

    // Relatório de vendas (valores em centavos, RNF03)
    const vendasRel = buildSalesReport(vendas)
    expect(vendasRel.porTipo.venda.transacoes).toBe(2)
    expect(vendasRel.porTipo.devolucao.valor).toBe(5990)
    expect(vendasRel.faturamentoBruto).toBe(3 * 5990 + 2 * 14990)
    expect(vendasRel.ignorados).toBe(0)

    // Relatório de movimentação: 2 entradas iniciais e 1 saída avulsas; 3 do PDV
    const movRel = buildStockMovementReport(movimentacoes, produtos)
    expect(movRel.avulsas).toEqual({ movimentacoes: 3, entradas: 26, saidas: 1, saldo: 25 })
    expect(movRel.porVendas).toEqual({ movimentacoes: 3, entradas: 1, saidas: 5, saldo: -4 })
    expect(movRel.ignorados).toBe(0)

    // Mais vendidos: camiseta 3 - 1 = 2 un.; moletom 2 un. (empate → receita)
    const top = buildTopSellingReport(vendas, produtos, { sortBy: 'quantidade' })
    expect(top.ranking.map((r) => [r.produtoId, r.quantidade])).toEqual([
      [moletomId, 2],
      [camisetaId, 2],
    ])
  })
})
