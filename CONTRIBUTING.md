# Contributing to Huly Virtual Network

First off, thank you for considering contributing to Huly Virtual Network! It's people like you that make this project such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, test cases)
- **Describe the behavior you observed** and what you expected
- **Include logs and error messages**
- **Specify your environment** (Node.js version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Issue your pull request!

## Development Setup

### Prerequisites

- **Node.js**: 22.0.0 or higher
- **PNPM**: 10.15.1 or higher (installed automatically via Rush)
- **ZeroMQ**: Native dependencies (libzmq)

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/huly.net.git
cd huly.net

# Install dependencies
node common/scripts/install-run-rush.js install

# Build all packages
node common/scripts/install-run-rush.js build
```

### Project Structure

```
huly.net/
├── packages/
│   ├── core/          # Core network implementation
│   ├── backrpc/       # ZeroMQ RPC layer
│   ├── client/        # Client libraries
│   └── server/        # Server implementation
├── pods/
│   └── network-pod/   # Docker deployment
├── tests/             # Integration tests
├── examples/          # Example code
└── docs/              # Documentation
```

### Development Workflow

```bash
# Run tests
node common/scripts/install-run-rush.js test

# Run tests for a specific package
cd packages/core && npm test

# Build with watch mode (during development)
node common/scripts/install-run-rush.js build:watch

# Format code
node common/scripts/install-run-rush.js format

# Validate TypeScript
node common/scripts/install-run-rush.js validate
```

## Pull Request Process

1. **Update Documentation**: Ensure any new features or changes are documented
2. **Add Tests**: Include tests for new functionality
3. **Update CHANGELOG**: Add your changes to the appropriate package CHANGELOG.md
4. **Pass CI**: Ensure all tests pass in CI
5. **Request Review**: Tag relevant maintainers for review
6. **Sign Commits**: Use `git commit -s` to sign off on your commits

### PR Title Format

Use descriptive PR titles that follow this format:

```
[Package] Brief description of changes

Examples:
[core] Add support for custom container timeouts
[client] Fix reconnection logic for dropped connections
[docs] Update production deployment guide
```

## Coding Standards

### TypeScript Style

- **Use TypeScript strict mode**: All code must pass strict type checking
- **Prefer interfaces over types** for object shapes
- **Use async/await** over raw Promises
- **Document public APIs** with JSDoc comments
- **Use descriptive variable names**: No single-letter variables except in loops

### Code Organization

```typescript
// 1. Imports (grouped: external, internal, types)
import { EventEmitter } from 'events'
import { NetworkImpl } from '../network'
import type { Container, ContainerUuid } from '../types'

// 2. Types and interfaces
interface MyOptions {
  timeout: number
}

// 3. Class implementation
export class MyClass {
  // Private fields first
  private readonly config: MyOptions

  // Constructor
  constructor(options: MyOptions) {
    this.config = options
  }

  // Public methods
  async doSomething(): Promise<void> {
    // Implementation
  }

  // Private methods
  private helper(): void {
    // Implementation
  }
}
```

### Error Handling

- **Always handle errors explicitly**: No silent failures
- **Use typed errors**: Create custom error classes when needed
- **Provide context**: Include relevant information in error messages

```typescript
// Good
try {
  await operation()
} catch (error: any) {
  throw new Error(`Failed to perform operation: ${error.message}`)
}

// Bad
try {
  await operation()
} catch (error) {
  // Silent failure
}
```

## Testing Guidelines

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should behave correctly under normal conditions', async () => {
      // Arrange
      const component = new ComponentName()

      // Act
      const result = await component.methodName()

      // Assert
      expect(result).toBe(expected)
    })

    it('should handle error conditions', async () => {
      // Test error cases
    })
  })
})
```

### Test Coverage

- **Aim for 80%+ coverage**: All new code should have tests
- **Test edge cases**: Don't just test the happy path
- **Test error conditions**: Verify error handling works correctly
- **Integration tests**: Add tests that verify component interaction

### Running Tests

```bash
# Run all tests
node common/scripts/install-run-rush.js test

# Run tests for a specific package
cd packages/core
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Commit Message Guidelines

We follow conventional commits for clear git history:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

### Examples

```
feat(core): add support for custom container timeouts

Adds a new timeout parameter to the Network constructor that allows
customizing how long containers stay alive when unreferenced.

Closes #123

---

fix(client): prevent memory leak in connection pool

The connection pool was not properly cleaning up closed connections,
leading to memory growth over time.

---

docs(readme): update quick start guide

Add more detailed examples for common use cases.
```

### Signing Commits

All commits must be signed off:

```bash
git commit -s -m "Your commit message"
```

This adds a "Signed-off-by" line indicating you agree to the [Developer Certificate of Origin](https://developercertificate.org/).

## Documentation

- **Update README.md** for significant changes
- **Add JSDoc comments** for public APIs
- **Create examples** for new features
- **Update relevant docs/** files

## Questions?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the [docs](docs/) directory

## License

By contributing, you agree that your contributions will be licensed under the Eclipse Public License 2.0.

---

Thank you for contributing to Huly Virtual Network! 🚀
