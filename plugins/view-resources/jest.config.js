module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  // stores.ts (exercised by the result-count owner-token test) imports
  // `svelte/store`, which ships as ESM and cannot be required under the ts-jest
  // CommonJS runtime with the repo's pnpm layout. Map it to a faithful local
  // stand-in, mirroring the @hcengineering/presentation package.
  moduleNameMapper: {
    '^svelte/store$': '<rootDir>/src/__mocks__/svelte-store.ts'
  }
}
