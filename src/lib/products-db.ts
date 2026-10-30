import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { db } from '../firebase'
import {
  INITIAL_PRODUCTS,
  productFromDoc,
  productInputToDoc,
  sortProducts,
  toCents,
  type Product,
  type ProductInput,
} from './products'

const produtosRef = collection(db, 'produtos')

/** Escuta a coleção "produtos" em tempo real. Retorna a função para cancelar. */
export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    produtosRef,
    (snapshot) => {
      const products = snapshot.docs.flatMap((d) => {
        const product = productFromDoc(d.id, d.data())
        if (!product) console.warn(`Produto ${d.id} ignorado: documento fora do formato esperado.`)
        return product ? [product] : []
      })
      onData(sortProducts(products))
    },
    onError,
  )
}

// O produto nasce com estoque zero; entradas são registradas no módulo de Estoque.
export async function createProduct(input: ProductInput) {
  const ref = await addDoc(produtosRef, {
    ...productInputToDoc(input),
    estoque: 0,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  return ref.id
}

// O estoque não é alterado aqui: ele só muda por movimentações e vendas.
export async function updateProduct(id: string, input: ProductInput) {
  await updateDoc(doc(db, 'produtos', id), {
    ...productInputToDoc(input),
    atualizadoEm: serverTimestamp(),
  })
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, 'produtos', id))
}

/** Popula um catálogo vazio com os produtos de exemplo (apoio à demonstração). */
export async function seedSampleProducts() {
  const batch = writeBatch(db)
  for (const p of INITIAL_PRODUCTS) {
    batch.set(doc(produtosRef), {
      nome: p.name,
      tamanho: p.size,
      cor: p.color,
      preco: toCents(p.price),
      categoria: p.category,
      estoque: 0,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  }
  await batch.commit()
}

export function describeFirestoreError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied')
      return 'Você não tem permissão para esta operação.'
    if (error.code === 'unavailable')
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    if (error.code === 'not-found') return 'Este produto não existe mais.'
  }
  return 'Não foi possível concluir a operação. Tente novamente.'
}
