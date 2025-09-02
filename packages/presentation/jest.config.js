const SVELTE_MOCKS_PATH = '<rootDir>/src/__mocks__'

module.exports = {
  projects: [
    // default configuration for most tests (node environment)
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
      testPathIgnorePatterns: ['.*drawing\\.test\\.ts$']
    },
    // configuration for drawing tests (jsdom environment)
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['**/drawing.test.ts'],
      moduleNameMapper: {
        '^@hcengineering/platform-rig/profiles/ui/svelte$': `${SVELTE_MOCKS_PATH}/svelte-runtime.ts`,
        '^svelte/store$': `${SVELTE_MOCKS_PATH}/svelte-store.ts`,
        '^svelte/transition$': `${SVELTE_MOCKS_PATH}/svelte-transition.ts`,
        '^svelte/animate$': `${SVELTE_MOCKS_PATH}/svelte-animate.ts`,
        '^svelte$': `${SVELTE_MOCKS_PATH}/svelte.ts`,
        '\\.svelte$': `${SVELTE_MOCKS_PATH}/svelte-component.ts`
      },
      // setup files to run before tests
      setupFilesAfterEnv: [`${SVELTE_MOCKS_PATH}/setup.ts`],
      // allow transformation of ES modules in case we encounter them
      transformIgnorePatterns: [
        'node_modules/(?!(svelte|@sveltejs|@testing-library)/)'
      ]
    }
  ]
}
