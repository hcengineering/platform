module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  roots: ['./src'],
  coverageReporters: ['text-summary', 'html', 'lcov'],
  testTimeout: 10000, // 10 seconds timeout for all tests
  forceExit: true // Force exit after tests complete to handle lingering timers
}
