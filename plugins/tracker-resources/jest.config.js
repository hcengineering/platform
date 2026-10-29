module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    // Map @hcengineering/ui to the pure-TS colors/types sub-module so that
    // tests that only need constants (PaletteColorIndexes, etc.) don't pull
    // in the svelte/store transitive import from the main index.
    // Tests that need richer UI stubs override this via their own jest.mock().
    '^@hcengineering/ui$': '<rootDir>/node_modules/@hcengineering/ui/src/colors.ts'
  }
}
