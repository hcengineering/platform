module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  roots: ['./src'],
  collectCoverage: true,
  coverageReporters: ['text-summary', 'html', 'lcov'],
  coverageDirectory: 'coverage'
}
