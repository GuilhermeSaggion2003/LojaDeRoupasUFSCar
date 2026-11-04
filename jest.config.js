/**
 * Testes unitários das regras de negócio (src/**\/*.test.ts).
 * As regras do Firestore têm configuração própria: jest.rules.config.js.
 * @type {import('jest').Config}
 */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  collectCoverageFrom: ['src/lib/products.ts', 'src/lib/estoque.ts', 'src/lib/sales.ts'],
  // Indicador de qualidade do PGP (seção 5.2): cobertura ≥ 80% das regras de negócio
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
}
