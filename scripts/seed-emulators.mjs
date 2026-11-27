/**
 * seed-emulators.mjs — Popula os Emuladores Locais do Firebase para a
 * demonstração offline (RNF04 / plano de contingência do risco R5).
 *
 * Cria:
 *   - os usuários gerente@loja.demo e funcionario@loja.demo (senha loja123)
 *     no Auth Emulator, com o perfil correspondente em `usuarios/{uid}`;
 *   - o catálogo de exemplo com estoque inicial e a movimentação de entrada
 *     de cada produto (para o histórico e os relatórios ficarem coerentes).
 *
 * Uso (com `npm run emulators` rodando em outro terminal):
 *   npm run seed:emulators
 *
 * Sem dependências: usa as APIs REST dos emuladores. O cabeçalho
 * "Authorization: Bearer owner" é aceito apenas pelo emulador e ignora as
 * regras de segurança — necessário porque `usuarios` é somente leitura.
 */

const PROJECT_ID = 'demo-lojaderoupasufscar'
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const SENHA = 'loja123'

const USUARIOS = [
  { email: 'gerente@loja.demo', nome: 'Gerente Demo', perfil: 'gerente' },
  { email: 'funcionario@loja.demo', nome: 'Funcionário Demo', perfil: 'funcionario' },
]

// Mesmo catálogo de INITIAL_PRODUCTS (src/lib/products.ts); preço em centavos (RNF03)
const PRODUTOS = [
  { nome: 'Camiseta Básica UFSCar', tamanho: 'M', cor: { nome: 'Azul-marinho', hex: '#1e2a5a' }, preco: 5990, categoria: 'Camisetas', estoque: 42 },
  { nome: 'Camiseta Computação', tamanho: 'G', cor: { nome: 'Preto', hex: '#111827' }, preco: 6490, categoria: 'Camisetas', estoque: 3 },
  { nome: 'Moletom Canguru Federal', tamanho: 'GG', cor: { nome: 'Cinza mescla', hex: '#9ca3af' }, preco: 14990, categoria: 'Moletons', estoque: 18 },
  { nome: 'Moletom Zíper Engenharia', tamanho: 'M', cor: { nome: 'Vinho', hex: '#7f1d1d' }, preco: 16990, categoria: 'Moletons', estoque: 0 },
  { nome: 'Calça Jogger Atlética', tamanho: '40', cor: { nome: 'Preto', hex: '#111827' }, preco: 11990, categoria: 'Calças', estoque: 12 },
  { nome: 'Boné Aba Curva UFSCar', tamanho: 'Único', cor: { nome: 'Dourado', hex: '#d4a017' }, preco: 4990, categoria: 'Bonés', estoque: 25 },
  { nome: 'Ecobag Campus São Carlos', tamanho: 'Único', cor: { nome: 'Cru', hex: '#e7dcc5' }, preco: 3490, categoria: 'Acessórios', estoque: 5 },
  { nome: 'Camiseta Baby Look Biologia', tamanho: 'P', cor: { nome: 'Verde', hex: '#166534' }, preco: 5990, categoria: 'Camisetas', estoque: 31 },
  { nome: 'Caneca Térmica UFSCar', tamanho: '450 ml', cor: { nome: 'Branco', hex: '#f8fafc' }, preco: 5490, categoria: 'Acessórios', estoque: 9 },
]

const firestoreBase = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// ---------------------------------------------------------------------------
// Conversão para o formato REST do Firestore
// ---------------------------------------------------------------------------

function toValue(value) {
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Number.isInteger(value)) return { integerValue: String(value) }
  if (typeof value === 'string') return { stringValue: value }
  if (value && typeof value === 'object') return { mapValue: { fields: toFields(value) } }
  throw new Error(`Valor não suportado no seed: ${value}`)
}

function toFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]))
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner', ...options.headers },
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

async function setDocument(path, data) {
  const res = await request(`${firestoreBase}/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: toFields(data) }),
  })
  if (!res.ok) throw new Error(`Falha ao gravar ${path}: ${res.status} ${JSON.stringify(res.body)}`)
}

// ---------------------------------------------------------------------------
// Auth Emulator
// ---------------------------------------------------------------------------

async function ensureUser(email) {
  const base = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts`
  const payload = JSON.stringify({ email, password: SENHA, returnSecureToken: true })

  const signUp = await request(`${base}:signUp?key=demo-key`, { method: 'POST', body: payload })
  if (signUp.ok) return signUp.body.localId

  // Usuário já existe (seed executado antes): recupera o UID pelo login
  const signIn = await request(`${base}:signInWithPassword?key=demo-key`, { method: 'POST', body: payload })
  if (signIn.ok) return signIn.body.localId

  throw new Error(`Falha ao criar ${email}: ${JSON.stringify(signUp.body)}`)
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function main() {
  // Verifica se os emuladores estão de pé antes de começar
  try {
    await fetch(`http://${FIRESTORE_HOST}/`)
    await fetch(`http://${AUTH_HOST}/`)
  } catch {
    console.error('Emuladores não encontrados. Rode antes, em outro terminal: npm run emulators')
    process.exit(1)
  }

  const uids = {}
  for (const u of USUARIOS) {
    const uid = await ensureUser(u.email)
    uids[u.perfil] = uid
    await setDocument(`usuarios/${uid}`, { nome: u.nome, perfil: u.perfil })
    console.log(`✓ ${u.perfil.padEnd(11)} ${u.email} / ${SENHA}`)
  }

  const existentes = await request(`${firestoreBase}/produtos?pageSize=1`)
  if (existentes.ok && existentes.body.documents?.length) {
    console.log('• Catálogo já populado: produtos mantidos.')
    return
  }

  const agora = new Date()
  for (const [i, p] of PRODUTOS.entries()) {
    const produtoId = `demo-${String(i + 1).padStart(2, '0')}`
    await setDocument(`produtos/${produtoId}`, { ...p, criadoEm: agora, atualizadoEm: agora })
    if (p.estoque > 0) {
      await setDocument(`estoque/${produtoId}_entrada_seed`, {
        produtoId,
        tipo: 'entrada',
        quantidade: p.estoque,
        data: agora,
        usuarioId: uids.gerente,
      })
    }
  }
  console.log(`✓ ${PRODUTOS.length} produtos com estoque inicial e movimentações de entrada.`)
  console.log('\nPronto. Inicie o app com: npm run dev:emulators')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
