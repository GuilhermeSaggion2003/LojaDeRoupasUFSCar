/**
 * Testes de integração (A9 / EAP 3.1): executam a camada de dados real
 * (products-db, estoque-db e sales-db) contra as regras reais no Emulador
 * do Firestore. Use `npm run test:integration`, que sobe e encerra o emulador.
 * @type {import('jest').Config}
 */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.integration.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // A camada de dados importa `../firebase`: nos testes ele vira um stub
  // cujo Firestore é trocado pelo do emulador em cada cenário.
  moduleNameMapper: { '^\\.\\./firebase$': '<rootDir>/tests/support/firebase-stub.ts' },
  testTimeout: 30000,
}
