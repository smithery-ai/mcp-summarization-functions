/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/__tests__/**',
    '!src/types/**',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 70,
      lines: 60,
      statements: 60
    }
  },
  testTimeout: 10000,
  setupFilesAfterEnv: ['./jest.setup.ts']
};