/**
 * Testes das regras de segurança do Firestore (firestore.rules).
 * Rodar com: npm run test:rules (sobe o emulador do Firestore automaticamente).
 */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from '@jest/globals'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

let env: RulesTestEnvironment

// ---------------------------------------------------------------------------
// Helpers de dados
// ---------------------------------------------------------------------------

const produto = () => ({
  nome: 'Camiseta Básica UFSCar',
  tamanho: 'M',
  cor: { nome: 'Azul-marinho', hex: '#1e2a5a' },
  preco: 5990,
  categoria: 'Camisetas',
  estoque: 0,
  criadoEm: serverTimestamp(),
  atualizadoEm: serverTimestamp(),
})

/** Movimentação mínima válida para o gerente criar */
const movimentacao = (tipo: 'entrada' | 'saida', quantidade: number, produtoId = 'p1') => ({
  produtoId,
  tipo,
  quantidade,
  data: serverTimestamp(),
  usuarioId: 'gerente-uid',
})

const gerente    = () => env.authenticatedContext('gerente-uid').firestore()
const funcionario = () => env.authenticatedContext('funcionario-uid').firestore()
const anonimo    = () => env.unauthenticatedContext().firestore()

// ---------------------------------------------------------------------------
// Configuração do ambiente de testes
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
    await setDoc(doc(db, 'usuarios/gerente-uid'), { nome: 'Ana', perfil: 'gerente' })
    await setDoc(doc(db, 'usuarios/funcionario-uid'), { nome: 'Carlos', perfil: 'funcionario' })
    // Produto p1 com estoque 10 — usado nos testes de movimentação
    await setDoc(doc(db, 'produtos/p1'), {
      ...produto(),
      estoque: 10,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: Timestamp.fromMillis(0),
    })
  })
})

// ---------------------------------------------------------------------------
// usuários
// ---------------------------------------------------------------------------

describe('usuários', () => {
  it('usuário lê o próprio perfil, mas não o de outro', async () => {
    await assertSucceeds(getDoc(doc(funcionario(), 'usuarios/funcionario-uid')))
    await assertFails(getDoc(doc(funcionario(), 'usuarios/gerente-uid')))
  })

  it('funcionário não pode se promover a gerente', async () => {
    await assertFails(
      updateDoc(doc(funcionario(), 'usuarios/funcionario-uid'), { perfil: 'gerente' }),
    )
  })

  it('anônimo não lê perfis', async () => {
    await assertFails(getDoc(doc(anonimo(), 'usuarios/gerente-uid')))
  })
})

// ---------------------------------------------------------------------------
// produtos: consulta
// ---------------------------------------------------------------------------

describe('produtos: consulta', () => {
  it('gerente e funcionário consultam o catálogo', async () => {
    await assertSucceeds(getDocs(collection(gerente(), 'produtos')))
    await assertSucceeds(getDoc(doc(funcionario(), 'produtos/p1')))
  })

  it('anônimo não consulta', async () => {
    await assertFails(getDocs(collection(anonimo(), 'produtos')))
  })
})

// ---------------------------------------------------------------------------
// produtos: cadastro
// ---------------------------------------------------------------------------

describe('produtos: cadastro', () => {
  it('gerente cadastra um produto válido', async () => {
    await assertSucceeds(setDoc(doc(gerente(), 'produtos/novo'), produto()))
  })

  it('funcionário não cadastra produto', async () => {
    await assertFails(setDoc(doc(funcionario(), 'produtos/novo'), produto()))
  })

  it.each([
    ['preço decimal', { preco: 59.9 }],
    ['preço zero', { preco: 0 }],
    ['nome vazio', { nome: '' }],
    ['categoria inexistente', { categoria: 'Sapatos' }],
    ['cor sem hexadecimal válido', { cor: { nome: 'Azul', hex: 'azul' } }],
    ['estoque inicial diferente de zero', { estoque: 5 }],
    ['campo extra', { desconto: 10 }],
    ['data de criação forjada', { criadoEm: Timestamp.fromMillis(0) }],
  ])('rejeita produto com %s', async (_, override) => {
    await assertFails(setDoc(doc(gerente(), 'produtos/novo'), { ...produto(), ...override }))
  })
})

// ---------------------------------------------------------------------------
// produtos: edição e exclusão (metadados, sem alterar estoque)
// ---------------------------------------------------------------------------

describe('produtos: edição e exclusão', () => {
  it('gerente edita os metadados do produto sem alterar estoque', async () => {
    await assertSucceeds(
      updateDoc(doc(gerente(), 'produtos/p1'), { preco: 6990, atualizadoEm: serverTimestamp() }),
    )
  })

  it('edição direta do estoque pelo formulário é bloqueada', async () => {
    await assertFails(
      updateDoc(doc(gerente(), 'produtos/p1'), { estoque: 99, atualizadoEm: serverTimestamp() }),
    )
    await assertFails(
      updateDoc(doc(gerente(), 'produtos/p1'), { estoque: 0, atualizadoEm: serverTimestamp() }),
    )
  })

  it('edição não pode alterar data de criação', async () => {
    await assertFails(
      updateDoc(doc(gerente(), 'produtos/p1'), {
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      }),
    )
  })

  it('funcionário não edita nem exclui', async () => {
    await assertFails(
      updateDoc(doc(funcionario(), 'produtos/p1'), { preco: 1, atualizadoEm: serverTimestamp() }),
    )
    await assertFails(deleteDoc(doc(funcionario(), 'produtos/p1')))
  })

  it('gerente exclui produto', async () => {
    await assertSucceeds(deleteDoc(doc(gerente(), 'produtos/p1')))
  })
})

// ---------------------------------------------------------------------------
// estoque: atualização via movimentação atômica (getAfter)
// ---------------------------------------------------------------------------

describe('produtos: atualização de estoque via movimentação atômica', () => {
  it('gerente registra entrada de 5 unidades com batch atômico', async () => {
    // Estoque atual: 10 → novo estoque: 15
    const db = gerente()
    const batch = writeBatch(db)
    // O ID da movimentação segue o padrão {produtoId}_{tipo} para a regra usar getAfter
    batch.set(doc(db, 'estoque/p1_entrada'), {
      produtoId: 'p1',
      tipo: 'entrada',
      quantidade: 5,
      data: serverTimestamp(),
      usuarioId: 'gerente-uid',
    })
    batch.update(doc(db, 'produtos/p1'), {
      estoque: 15,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
  })

  it('gerente registra saída de 3 unidades com batch atômico', async () => {
    // Estoque atual: 10 → novo estoque: 7
    const db = gerente()
    const batch = writeBatch(db)
    batch.set(doc(db, 'estoque/p1_saida'), {
      produtoId: 'p1',
      tipo: 'saida',
      quantidade: 3,
      data: serverTimestamp(),
      usuarioId: 'gerente-uid',
    })
    batch.update(doc(db, 'produtos/p1'), {
      estoque: 7,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
  })

  it('bloqueia batch com saldo incoerente na entrada (quantidade != diferença)', async () => {
    // Movimentação diz 5 mas produto tenta ir de 10 para 20 (diferença 10)
    const db = gerente()
    const batch = writeBatch(db)
    batch.set(doc(db, 'estoque/p1_entrada'), {
      produtoId: 'p1',
      tipo: 'entrada',
      quantidade: 5,
      data: serverTimestamp(),
      usuarioId: 'gerente-uid',
    })
    batch.update(doc(db, 'produtos/p1'), {
      estoque: 20,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })

  it('bloqueia batch com saldo incoerente na saída (quantidade != diferença)', async () => {
    // Movimentação diz 3 mas produto tenta ir de 10 para 5 (diferença 5)
    const db = gerente()
    const batch = writeBatch(db)
    batch.set(doc(db, 'estoque/p1_saida'), {
      produtoId: 'p1',
      tipo: 'saida',
      quantidade: 3,
      data: serverTimestamp(),
      usuarioId: 'gerente-uid',
    })
    batch.update(doc(db, 'produtos/p1'), {
      estoque: 5,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })

  it('bloqueia saída que resultaria em saldo negativo', async () => {
    // Estoque atual: 10, tentativa de saída de 15 (resultado: -5)
    const db = gerente()
    const batch = writeBatch(db)
    batch.set(doc(db, 'estoque/p1_saida'), {
      produtoId: 'p1',
      tipo: 'saida',
      quantidade: 15,
      data: serverTimestamp(),
      usuarioId: 'gerente-uid',
    })
    batch.update(doc(db, 'produtos/p1'), {
      estoque: -5,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })

  it('bloqueia atualização de estoque sem movimentação correspondente', async () => {
    // Sem batch, apenas updateDoc direto — não cria movimentação
    await assertFails(
      updateDoc(doc(gerente(), 'produtos/p1'), {
        estoque: 15,
        criadoEm: Timestamp.fromMillis(0),
        atualizadoEm: serverTimestamp(),
      }),
    )
  })

  it('bloqueia batch com movimentação de produto diferente do produto atualizado', async () => {
    // Movimentação aponta para 'p2' mas update é em 'p1'
    const db = gerente()
    const batch = writeBatch(db)
    batch.set(doc(db, 'estoque/p1_entrada'), {
      produtoId: 'p2', // ID errado!
      tipo: 'entrada',
      quantidade: 5,
      data: serverTimestamp(),
      usuarioId: 'gerente-uid',
    })
    batch.update(doc(db, 'produtos/p1'), {
      estoque: 15,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })
})

// ---------------------------------------------------------------------------
// estoque: coleção de movimentações
// ---------------------------------------------------------------------------

describe('estoque: criação de movimentações', () => {
  it('gerente cria movimentação de entrada válida', async () => {
    await assertSucceeds(
      setDoc(doc(gerente(), 'estoque/mov1'), movimentacao('entrada', 10)),
    )
  })

  it('gerente cria movimentação de saída válida', async () => {
    await assertSucceeds(
      setDoc(doc(gerente(), 'estoque/mov2'), movimentacao('saida', 3)),
    )
  })

  it('funcionário não cria movimentação', async () => {
    await assertFails(
      setDoc(doc(funcionario(), 'estoque/mov3'), {
        produtoId: 'p1',
        tipo: 'entrada',
        quantidade: 5,
        data: serverTimestamp(),
        usuarioId: 'funcionario-uid',
      }),
    )
  })

  it('anônimo não cria movimentação', async () => {
    await assertFails(
      addDoc(collection(anonimo(), 'estoque'), { quantidade: 1 }),
    )
  })

  it.each([
    ['tipo inválido', { tipo: 'ajuste' }],
    ['quantidade zero', { quantidade: 0 }],
    ['quantidade negativa', { quantidade: -1 }],
    ['quantidade decimal (float)', { quantidade: 1.5 }],
    ['produtoId vazio', { produtoId: '' }],
    ['campo extra', { observacao: 'teste' }],
    ['usuarioId diferente do uid autenticado', { usuarioId: 'outro-uid' }],
  ])('rejeita movimentação com %s', async (_, override) => {
    await assertFails(
      setDoc(
        doc(gerente(), 'estoque/mov_invalido'),
        { ...movimentacao('entrada', 5), ...override },
      ),
    )
  })
})

describe('estoque: leitura', () => {
  it('gerente lê o histórico de movimentações', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'estoque/m1'), movimentacao('entrada', 10))
    })
    await assertSucceeds(getDocs(collection(gerente(), 'estoque')))
  })

  it('funcionário lê o histórico de movimentações', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'estoque/m1'), movimentacao('entrada', 10))
    })
    await assertSucceeds(getDocs(collection(funcionario(), 'estoque')))
  })

  it('anônimo não lê movimentações', async () => {
    await assertFails(getDocs(collection(anonimo(), 'estoque')))
  })
})

describe('estoque: imutabilidade (update e delete negados)', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'estoque/m_imutavel'), {
        produtoId: 'p1',
        tipo: 'entrada',
        quantidade: 5,
        data: Timestamp.fromMillis(0),
        usuarioId: 'gerente-uid',
      })
    })
  })

  it('gerente não consegue atualizar uma movimentação existente', async () => {
    await assertFails(
      updateDoc(doc(gerente(), 'estoque/m_imutavel'), { quantidade: 99 }),
    )
  })

  it('gerente não consegue deletar uma movimentação', async () => {
    await assertFails(deleteDoc(doc(gerente(), 'estoque/m_imutavel')))
  })

  it('funcionário não consegue deletar uma movimentação', async () => {
    await assertFails(deleteDoc(doc(funcionario(), 'estoque/m_imutavel')))
  })
})

// ---------------------------------------------------------------------------
// vendas (RF05, RF06 e Subtarefa 2)
// ---------------------------------------------------------------------------

const itemVenda = () => ({
  produtoId: 'p1',
  nome: 'Camiseta Básica UFSCar',
  tamanho: 'M',
  cor: { nome: 'Azul-marinho', hex: '#1e2a5a' },
  quantidade: 2,
  precoUnitario: 5990,
})

const vendaValida = (usuarioId = 'funcionario-uid', overrides: Record<string, unknown> = {}) => ({
  itens: [itemVenda()],
  subtotal: 11980,
  desconto: 1000,
  total: 10980,
  tipo: 'venda',
  data: serverTimestamp(),
  usuarioId,
  ...overrides,
})

describe('vendas: criação e validação estrita (vendaValida)', () => {
  it('funcionário registra venda válida com sucesso', async () => {
    await assertSucceeds(addDoc(collection(funcionario(), 'vendas'), vendaValida('funcionario-uid')))
  })

  it('gerente registra venda válida com sucesso', async () => {
    await assertSucceeds(addDoc(collection(gerente(), 'vendas'), vendaValida('gerente-uid')))
  })

  it('anônimo não pode registrar venda', async () => {
    await assertFails(addDoc(collection(anonimo(), 'vendas'), vendaValida('anonimo')))
  })

  it('rejeita venda com lista de itens vazia', async () => {
    await assertFails(
      addDoc(collection(funcionario(), 'vendas'), vendaValida('funcionario-uid', { itens: [] })),
    )
  })

  it('rejeita venda com inconsistência aritmética (total != subtotal - desconto)', async () => {
    await assertFails(
      addDoc(
        collection(funcionario(), 'vendas'),
        vendaValida('funcionario-uid', { subtotal: 10000, desconto: 1000, total: 8000 }),
      ),
    )
  })

  it('rejeita desconto em transação de troca ou devolução', async () => {
    await assertFails(
      addDoc(
        collection(funcionario(), 'vendas'),
        vendaValida('funcionario-uid', {
          tipo: 'troca',
          subtotal: 10000,
          desconto: 500,
          total: 9500,
        }),
      ),
    )
    await assertFails(
      addDoc(
        collection(funcionario(), 'vendas'),
        vendaValida('funcionario-uid', {
          tipo: 'devolucao',
          subtotal: 10000,
          desconto: 500,
          total: 9500,
        }),
      ),
    )
  })

  it('rejeita venda com desconto maior que o subtotal', async () => {
    await assertFails(
      addDoc(
        collection(funcionario(), 'vendas'),
        vendaValida('funcionario-uid', {
          subtotal: 5000,
          desconto: 6000,
          total: 0,
        }),
      ),
    )
  })

  it('rejeita venda com campo extra não permitido (hasOnly)', async () => {
    await assertFails(
      addDoc(
        collection(funcionario(), 'vendas'),
        vendaValida('funcionario-uid', { observacao: 'campo malicioso extra' }),
      ),
    )
  })

  it('rejeita venda com data de criação forjada', async () => {
    await assertFails(
      addDoc(
        collection(funcionario(), 'vendas'),
        vendaValida('funcionario-uid', { data: Timestamp.fromMillis(0) }),
      ),
    )
  })

  it('rejeita venda com usuarioId diferente do autenticado', async () => {
    await assertFails(
      addDoc(
        collection(funcionario(), 'vendas'),
        vendaValida('outro-usuario-uid'),
      ),
    )
  })
})

describe('vendas: controle de acesso e consulta (restrito ao Gerente)', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'vendas/venda-teste-1'), {
        itens: [itemVenda()],
        subtotal: 5990,
        desconto: 0,
        total: 5990,
        tipo: 'venda',
        data: Timestamp.fromMillis(0),
        usuarioId: 'funcionario-uid',
      })
    })
  })

  it('gerente consulta o histórico de vendas', async () => {
    await assertSucceeds(getDocs(collection(gerente(), 'vendas')))
    await assertSucceeds(getDoc(doc(gerente(), 'vendas/venda-teste-1')))
  })

  it('funcionário não consulta o histórico de vendas', async () => {
    await assertFails(getDocs(collection(funcionario(), 'vendas')))
    await assertFails(getDoc(doc(funcionario(), 'vendas/venda-teste-1')))
  })

  it('anônimo não consulta vendas', async () => {
    await assertFails(getDocs(collection(anonimo(), 'vendas')))
  })
})

describe('vendas: imutabilidade (update e delete negados)', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'vendas/venda-imutavel'), {
        itens: [itemVenda()],
        subtotal: 5990,
        desconto: 0,
        total: 5990,
        tipo: 'venda',
        data: Timestamp.fromMillis(0),
        usuarioId: 'funcionario-uid',
      })
    })
  })

  it('gerente não consegue alterar uma venda registrada', async () => {
    await assertFails(
      updateDoc(doc(gerente(), 'vendas/venda-imutavel'), { total: 0 }),
    )
  })

  it('funcionário não consegue alterar uma venda registrada', async () => {
    await assertFails(
      updateDoc(doc(funcionario(), 'vendas/venda-imutavel'), { total: 0 }),
    )
  })

  it('gerente não consegue excluir uma venda registrada', async () => {
    await assertFails(deleteDoc(doc(gerente(), 'vendas/venda-imutavel')))
  })

  it('funcionário não consegue excluir uma venda registrada', async () => {
    await assertFails(deleteDoc(doc(funcionario(), 'vendas/venda-imutavel')))
  })
})

describe('vendas e estoque: abatimento pelo funcionário em transação de venda', () => {
  it('funcionário abate estoque e registra movimentação com vendaId válida em batch', async () => {
    // Estoque inicial de p1 é 10. Venda de 2 unidades -> estoque novo: 8
    const db = funcionario()
    const batch = writeBatch(db)

    const novaVendaRef = doc(collection(db, 'vendas'))
    batch.set(novaVendaRef, vendaValida('funcionario-uid', {
      total: 10980,
      subtotal: 11980,
      desconto: 1000,
    }))

    batch.update(doc(db, 'produtos/p1'), {
      estoque: 8,
      atualizadoEm: serverTimestamp(),
    })

    batch.set(doc(db, `estoque/${novaVendaRef.id}_p1_saida`), {
      produtoId: 'p1',
      tipo: 'saida',
      quantidade: 2,
      data: serverTimestamp(),
      usuarioId: 'funcionario-uid',
      vendaId: novaVendaRef.id,
    })

    await assertSucceeds(batch.commit())
  })

  it('bloqueia funcionário tentando abater estoque que resultaria em saldo negativo', async () => {
    // Estoque inicial de p1 é 10. Tentativa de deixar -2
    const db = funcionario()
    const batch = writeBatch(db)

    const novaVendaRef = doc(collection(db, 'vendas'))
    batch.set(novaVendaRef, vendaValida('funcionario-uid'))

    batch.update(doc(db, 'produtos/p1'), {
      estoque: -2,
      atualizadoEm: serverTimestamp(),
    })

    await assertFails(batch.commit())
  })
})


