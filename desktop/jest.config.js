const SVELTE_MOCKS_PATH = '<rootDir>/../packages/presentation/src/__mocks__'

module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/src/__test__/main/**/*.test.ts']
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/src/__test__/ui/**/*.test.ts'],
      moduleNameMapper: {
        '^@hcengineering/platform-rig/profiles/ui/svelte$': `${SVELTE_MOCKS_PATH}/svelte-runtime.ts`,
        '^svelte/store$': `${SVELTE_MOCKS_PATH}/svelte-store.ts`,
        '^svelte/transition$': `${SVELTE_MOCKS_PATH}/svelte-transition.ts`,
        '^svelte/animate$': `${SVELTE_MOCKS_PATH}/svelte-animate.ts`,
        '^svelte$': `${SVELTE_MOCKS_PATH}/svelte.ts`,
        '\\.svelte$': `${SVELTE_MOCKS_PATH}/svelte-component.ts`
      },
      setupFilesAfterEnv: [`${SVELTE_MOCKS_PATH}/setup.ts`]
    }
  ],
  roots: ["./src", "./tests"],
  coverageReporters: ["text-summary", "html"],
}
