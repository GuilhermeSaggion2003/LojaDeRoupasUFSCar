import { useEffect, useState } from 'react'
import { describeFirestoreError, subscribeProducts } from '../lib/products-db'
import type { Product } from '../lib/products'

type State = {
  products: Product[]
  loading: boolean
  error: string | null
}

export function useProducts(): State {
  const [state, setState] = useState<State>({ products: [], loading: true, error: null })

  useEffect(() => {
    return subscribeProducts(
      (products) => setState({ products, loading: false, error: null }),
      (error) => {
        console.error('Erro ao carregar produtos:', error)
        setState((prev) => ({ ...prev, loading: false, error: describeFirestoreError(error) }))
      },
    )
  }, [])

  return state
}
