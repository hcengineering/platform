const node = {
  displayName: 'node',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/copy-dialog.test.ts$'],
  moduleNameMapper: {
    // Map @hcengineering/ui to the pure-TS colors/types sub-module so that
    // tests that only need constants (PaletteColorIndexes, etc.) don't pull
    // in the svelte/store transitive import from the main index.
    // Tests that need richer UI stubs override this via their own jest.mock().
    '^@hcengineering/ui$': '<rootDir>/node_modules/@hcengineering/ui/src/colors.ts'
  }
}

const fixtures = '<rootDir>/src/components/templates/__tests__/fixtures'

module.exports = {
  projects: [
    node,
    {
      displayName: 'copy-dialog',
      testEnvironment: 'jsdom',
      testEnvironmentOptions: { customExportConditions: ['browser'] },
      testMatch: ['**/copy-dialog.test.ts'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.(svelte|js)$': '<rootDir>/svelte-test-transform.cjs'
      },
      // Svelte 4 ships its browser runtime as ESM, including under pnpm's nested paths.
      transformIgnorePatterns: ['node_modules/(?!svelte(?:/|$)|\\.pnpm/svelte@)'],
      moduleNameMapper: {
        '^@hcengineering/ui$': `${fixtures}/ui.ts`,
        '^@hcengineering/presentation$': `${fixtures}/presentation.ts`,
        '^@hcengineering/analytics$': `${fixtures}/analytics.ts`,
        '^@hcengineering/core$': `${fixtures}/core.ts`,
        '^@hcengineering/tracker$': `${fixtures}/tracker.ts`,
        '^@hcengineering/task$': `${fixtures}/task.ts`,
        '^@hcengineering/view$': `${fixtures}/tracker.ts`,
        '^\\.\\./projects/ProjectPresenter\\.svelte$': `${fixtures}/Empty.svelte`,
        '^\\./IssueTemplatePresenter\\.svelte$': `${fixtures}/Empty.svelte`
      }
    }
  ]
}
