# GitHub Copilot Memory - Huly Core Repository

## Project Overview

**Repository**: huly.core  
**Organization**: hcengineering  
**License**: EPL-2.0  
**Type**: Monorepo (Rush-based)  
**Primary Language**: TypeScript  
**Main Branch**: main

Huly Core is a collection of core packages extracted from the Huly Platform. It contains fundamental building blocks and libraries that power the Huly ecosystem, including core data models, client libraries, text processing engines, and platform utilities. These packages are designed to be reusable, modular, and framework-agnostic.

## Architecture & Structure

### Monorepo Setup

- **Build System**: Microsoft Rush (v5.158.1)
- **Package Manager**: pnpm (v10.15.1)
- **Node Version**: >=18.20.3 <19.0.0 || >=20.14.0 <25.0.0
- **TypeScript**: v5.9.3

### Project Structure

```text
/
├── common/               # Rush configuration and shared scripts
│   ├── config/rush/     # Rush and pnpm configurations
│   ├── scripts/         # Build and installation scripts
│   └── temp/            # Rush temporary files
├── packages/            # All package sources
│   ├── core/           # Core data models and abstractions
│   ├── platform/       # Platform runtime and plugin system
│   ├── model/          # Data model definitions
│   ├── client/         # Client-side data access layer
│   ├── client-resources/ # Shared client resources
│   ├── api-client/     # API client (WebSocket/REST)
│   ├── account-client/ # Account management
│   ├── collaborator-client/ # Real-time collaboration
│   ├── hulylake-client/ # Data warehouse client
│   ├── analytics/      # Analytics and tracking
│   ├── analytics-service/ # Analytics service
│   ├── text/           # Text processing utilities
│   ├── text-core/      # Core text processing engine
│   ├── text-html/      # HTML rendering/parsing
│   ├── text-markdown/  # Markdown support
│   ├── text-ydoc/      # Yjs collaborative editing
│   ├── query/          # Query language and execution
│   ├── storage/        # Storage abstractions
│   ├── storage-client/ # Storage client
│   ├── rank/           # Ranking and ordering utilities
│   ├── retry/          # Retry logic patterns
│   ├── rpc/            # RPC communication layer
│   ├── token/          # Token management
│   └── theme/          # Theme utilities
└── rush.json           # Rush monorepo configuration
```

## Development Workflow

### Essential Commands

**Initial Setup:**

```bash
rush install    # Install all dependencies
rush build      # Build all packages
```

**Development:**

```bash
rush build:watch    # Build and watch for changes
rush rebuild        # Rebuild all packages (no cache)
```

**Package Management:**

```bash
rush update         # Update package dependencies
rush purge          # Clean all packages
```

**Quality Checks:**

```bash
rush test          # Run all tests
rush format        # Format code
rush validate      # Validate code
```

### Build Phases

Each package supports these phases (via Rush):

- `_phase:build` - Compile TypeScript
- `_phase:test` - Run Jest tests with coverage
- `_phase:format` - Format source code
- `_phase:validate` - Validate code structure

## Package Standards

### Common Structure for Each Package

```text
package-name/
├── src/               # TypeScript source files
│   ├── index.ts      # Main entry point
│   └── __tests__/    # Test files (co-located)
├── lib/              # Compiled JavaScript (output)
├── types/            # TypeScript declarations (output)
├── config/           # Package-specific configs
├── coverage/         # Test coverage reports
├── package.json      # Package manifest
├── tsconfig.json     # TypeScript configuration
├── jest.config.js    # Jest test configuration
└── .eslintrc.js      # ESLint configuration
```

### Package.json Standards

All packages follow this pattern:

- **Scope**: `@hcengineering/`
- **Version**: Semantic versioning (currently 0.7.x range)
- **Main Entry**: `lib/index.js`
- **Types Entry**: `types/index.d.ts`
- **Source Entry**: `src/index.ts` (via `svelte` field)
- **Workspace Dependencies**: Use `workspace:^` protocol
- **Repository**: `https://github.com/hcengineering/huly.core`
- **Access**: Public (via publishConfig)

### TypeScript Configuration

All packages extend from `@hcengineering/platform-rig`:

```json
{
  "extends": "./node_modules/@hcengineering/platform-rig/profiles/default/tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./lib",
    "declarationDir": "./types",
    "tsBuildInfoFile": ".build/build.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "lib", "dist", "types", "bundle"]
}
```

### Testing Configuration

**Framework**: Jest with ts-jest
**Configuration** (jest.config.js):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  roots: ['./src'],
  coverageReporters: ['text-summary', 'html', 'lcov']
}
```

**Test Location**: Co-located with source in `__tests__/` directories
**Coverage**: HTML and LCOV reports generated in `coverage/` directory

### Linting Configuration

All packages use ESLint with TypeScript:

```javascript
module.exports = {
  extends: ['./node_modules/@hcengineering/platform-rig/profiles/default/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
}
```

**Key Plugins**:

- `@typescript-eslint/eslint-plugin` (v6.21.0)
- `@typescript-eslint/parser` (v6.21.0)
- `eslint-config-standard-with-typescript` (v40.0.0)
- `eslint-plugin-import` (v2.26.0)
- `eslint-plugin-promise` (v6.1.1)
- `eslint-plugin-n` (v15.4.0)
- `eslint-plugin-svelte` (v2.35.1)

## Core Package Details

### @hcengineering/core

**Purpose**: Core data models, types, and fundamental platform abstractions  
**Key Exports**: Classes, interfaces, functions for document management, hierarchy, transactions, queries, storage abstractions, and backup functionality  
**Dependencies**: platform, analytics, measurements

### @hcengineering/platform

**Purpose**: Platform runtime, plugin system, and dependency injection  
**Dependencies**: analytics

### @hcengineering/client

**Purpose**: Client-side data access and synchronization layer  
**Key Features**: WebSocket communication, client factory, filter modes  
**Dependencies**: core, platform, rpc

### @hcengineering/text-\*

**Purpose**: Text processing ecosystem  
**Packages**:

- `text`: High-level utilities
- `text-core`: Core processing engine
- `text-html`: HTML rendering/parsing
- `text-markdown`: Markdown support
- `text-ydoc`: Yjs collaborative editing integration

## Dependencies Management

### Internal Dependencies

All internal package dependencies use the `workspace:^` protocol:

```json
"dependencies": {
  "@hcengineering/core": "workspace:^0.7.7",
  "@hcengineering/platform": "workspace:^0.7.5"
}
```

### External Dependencies

Key external dependencies:

- `fast-equals` (v5.2.2) - Deep equality checks
- `@hcengineering/measurements` (v0.7.13) - Performance measurements
- Yjs ecosystem for collaborative editing
- Jest ecosystem for testing

## File Exclusions

When publishing packages, exclude:

- `lib/**/__test__/**`
- `types/**/__test__/**`
- `src/**/__test__/**`
- Test files and coverage reports
- Build artifacts and temporary files

## Coding Conventions

### File Organization

- **Source**: All source in `src/` directory
- **Tests**: Co-located in `src/__tests__/` or next to source files
- **Exports**: Main exports through `src/index.ts`
- **Types**: TypeScript for all code

### Naming Conventions

- **Packages**: Kebab-case (`@hcengineering/package-name`)
- **Files**: Kebab-case for files, PascalCase for classes
- **Exports**: Named exports preferred over default exports

### Code Style

- **Formatting**: Prettier (v3.1.0)
- **Linting**: ESLint with TypeScript Standard config
- **Line Width**: Defined by Prettier config
- **Semicolons**: Enforced by ESLint

## Common Tasks

### Adding a New Package

1. Create package directory under `packages/`
2. Add package.json with standard structure
3. Add tsconfig.json extending from platform-rig
4. Add jest.config.js and .eslintrc.js
5. Create src/index.ts entry point
6. Register in rush.json (if needed)
7. Run `rush update` to link dependencies

### Updating Dependencies

1. Modify package.json in specific package
2. Run `rush update` to sync lockfiles
3. Run `rush build` to verify changes

### Running Tests

```bash
# All packages
rush test

# Single package (from package directory)
rushx test
```

### Debugging Build Issues

1. Check `rush-logs/` directory in affected package
2. Review `.build/build.tsbuildinfo` for incremental build state
3. Use `rush rebuild` to force clean rebuild
4. Check `common/temp/rush-recycler/` for moved files

## Integration Points

### Platform Integration

- Packages integrate via the plugin system (`@hcengineering/platform`)
- Dependency injection for loose coupling
- Resource-based identification system

### Client-Server Architecture

- WebSocket-based real-time communication
- REST API through `api-client`
- Collaborative editing via Yjs and `collaborator-client`

### Data Flow

- Core defines abstract data models
- Client packages provide concrete implementations
- Storage abstraction allows pluggable backends
- Query system provides unified data access

## Important Notes for AI Agents

1. **Always use Rush commands** for package operations, not npm/pnpm directly
2. **Workspace protocol** is mandatory for internal dependencies
3. **Co-located tests** are the standard - place tests near source code
4. **Build phases** are automated via Rush - use the defined scripts
5. **Platform-rig** provides shared configurations - don't override unless necessary
6. **TypeScript strict mode** is enabled - type safety is critical
7. **Coverage reports** are expected for all packages
8. **EPL-2.0 license** must be respected in all contributions
9. **Version consistency** - check rush.json for approved versions
10. **Incremental builds** - Rush uses caching, understand the build graph

## Useful Links

- [Rush Documentation](https://rushjs.io/)
- [Huly Platform](https://github.com/hcengineering/platform)
- [Repository](https://github.com/hcengineering/huly.core)
- [Node.js LTS Releases](https://nodejs.org/en/about/releases/)

## Last Updated

October 14, 2025
