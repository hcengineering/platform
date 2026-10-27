module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': '<rootDir>/test/svelte-transform.cjs',
    '^.+\\.svelte$': '<rootDir>/test/svelte-transform.cjs'
  },
  // Svelte 4 ships an ESM runtime, including in pnpm's real package paths.
  transformIgnorePatterns: ['/node_modules/(?!.*svelte/)'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node', 'svelte'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  roots: ["./src"],
  coverageReporters: ["text-summary", "html"]
}
