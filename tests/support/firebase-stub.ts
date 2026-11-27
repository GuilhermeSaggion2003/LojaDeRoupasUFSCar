/**
 * Substituto de src/firebase.ts nos testes (moduleNameMapper do Jest).
 *
 * - Nos testes unitários, evita inicializar um app Firebase real e o uso de
 *   `import.meta.env`, que o ts-jest (CommonJS) não compila.
 * - Nos testes de integração, permite apontar a camada de dados real
 *   (products-db, estoque-db, sales-db) para o Firestore do emulador,
 *   autenticado como o perfil de cada cenário (setTestFirestore).
 */
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

export const USE_EMULATORS = true
export const EMULATOR_PROJECT_ID = 'demo-lojaderoupasufscar'

// `let` exportado: o import em `../firebase` enxerga a troca (live binding).
export let db = undefined as unknown as Firestore
export const auth = { currentUser: null } as unknown as Auth

/** Troca o Firestore usado pela camada de dados (contexto do emulador). */
export function setTestFirestore(firestore: Firestore): void {
  db = firestore
}
