module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  roots: ['./src'],
  collectCoverage: true,
  coverageReporters: ['text-summary', 'html', 'lcov'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^franc-min$': '<rootDir>/src/__mocks__/franc-min.ts'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(franc-min|trigram-utils)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}
