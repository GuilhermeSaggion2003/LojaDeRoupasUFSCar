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
} from 'firebase/firestore'

let env: RulesTestEnvironment

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

const gerente = () => env.authenticatedContext('gerente-uid').firestore()
const funcionario = () => env.authenticatedContext('funcionario-uid').firestore()
const anonimo = () => env.unauthenticatedContext().firestore()

beforeAll(async () => {
  // Os acessos negados são esperados; evita poluir a saída com avisos do SDK
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
    await setDoc(doc(db, 'produtos/p1'), {
      ...produto(),
      estoque: 10,
      criadoEm: Timestamp.fromMillis(0),
      atualizadoEm: Timestamp.fromMillis(0),
    })
  })
})

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

describe('produtos: consulta', () => {
  it('gerente e funcionário consultam o catálogo', async () => {
    await assertSucceeds(getDocs(collection(gerente(), 'produtos')))
    await assertSucceeds(getDoc(doc(funcionario(), 'produtos/p1')))
  })

  it('anônimo não consulta', async () => {
    await assertFails(getDocs(collection(anonimo(), 'produtos')))
  })
})

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

describe('produtos: edição e exclusão', () => {
  it('gerente edita os dados do produto', async () => {
    await assertSucceeds(
      updateDoc(doc(gerente(), 'produtos/p1'), { preco: 6990, atualizadoEm: serverTimestamp() }),
    )
  })

  it('edição não altera estoque nem data de criação', async () => {
    await assertFails(
      updateDoc(doc(gerente(), 'produtos/p1'), { estoque: 99, atualizadoEm: serverTimestamp() }),
    )
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

describe('vendas e estoque', () => {
  it('funcionário registra venda, mas só o gerente consulta as vendas', async () => {
    await assertSucceeds(addDoc(collection(funcionario(), 'vendas'), { total: 5990 }))
    await assertFails(getDocs(collection(funcionario(), 'vendas')))
    await assertSucceeds(getDocs(collection(gerente(), 'vendas')))
  })

  it('apenas o gerente acessa as movimentações de estoque', async () => {
    await assertFails(getDocs(collection(funcionario(), 'estoque')))
    await assertSucceeds(addDoc(collection(gerente(), 'estoque'), { quantidade: 1 }))
  })
})
