module.exports = {
  projects: [
    // Default configuration for most tests (node environment)
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
      testPathIgnorePatterns: ['.*drawing\\.test\\.ts$']
    },
    // Configuration for drawing tests (jsdom environment)
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['**/drawing.test.ts']
    }
  ]
}
