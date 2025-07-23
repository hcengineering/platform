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
      testMatch: ['<rootDir>/src/__test__/ui/**/*.test.ts']
    }
  ],
  roots: ["./src", "./tests"],
  coverageReporters: ["text-summary", "html"],
}
