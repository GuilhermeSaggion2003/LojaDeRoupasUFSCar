/**
 * Testes das regras de segurança do Firestore. Precisam do emulador:
 * use `npm run test:rules`, que o inicia e encerra automaticamente.
 * @type {import('jest').Config}
 */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.rules.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testTimeout: 20000,
}
