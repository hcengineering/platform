# Huly Core

[![GitHub License](https://img.shields.io/github/license/hcengineering/huly.core?style=for-the-badge)](LICENSE)

⭐️ Your star shines on us. Star us on GitHub!

## About

Huly Core is a collection of core packages extracted from the [Huly Platform](https://github.com/hcengineering/platform). This repository contains fundamental building blocks and libraries that power the Huly ecosystem, including core data models, client libraries, text processing engines, and platform utilities.

These packages are designed to be reusable, modular, and framework-agnostic, making them suitable for building custom applications on top of the Huly Platform or integrating Huly functionality into existing projects.

## Packages

This repository includes the following core packages:

### Core Packages

- **[@hcengineering/core](packages/core)** - Core data models, types, and fundamental platform abstractions
- **[@hcengineering/platform](packages/platform)** - Platform runtime, plugin system, and dependency injection
- **[@hcengineering/model](packages/model)** - Data model definitions and schema management

### Client Libraries

- **[@hcengineering/client](packages/client)** - Client-side data access and synchronization layer
- **[@hcengineering/client-resources](packages/client-resources)** - Shared client resources and utilities
- **[@hcengineering/api-client](packages/api-client)** - API client for programmatic access to Huly Platform (WebSocket and REST)
- **[@hcengineering/account-client](packages/account-client)** - Account management client
- **[@hcengineering/collaborator-client](packages/collaborator-client)** - Real-time collaboration client
- **[@hcengineering/hulylake-client](packages/hulylake-client)** - HulyLake data warehouse client
- **[@hcengineering/analytics](packages/analytics)** - Analytics and tracking
- **[@hcengineering/analytics-service](packages/analytics-service)** - Analytics service implementation

### Text Processing

- **[@hcengineering/text](packages/text)** - High-level text processing utilities
- **[@hcengineering/text-core](packages/text-core)** - Core text processing engine
- **[@hcengineering/text-html](packages/text-html)** - HTML text rendering and parsing
- **[@hcengineering/text-markdown](packages/text-markdown)** - Markdown support
- **[@hcengineering/text-ydoc](packages/text-ydoc)** - Yjs document integration for collaborative editing

### Utilities

- **[@hcengineering/query](packages/query)** - Query language and execution engine
- **[@hcengineering/storage](packages/storage)** - Storage abstractions and implementations
- **[@hcengineering/rank](packages/rank)** - Ranking and ordering utilities
- **[@hcengineering/retry](packages/retry)** - Retry logic and resilience patterns
- **[@hcengineering/rpc](packages/rpc)** - RPC communication layer
- **[@hcengineering/token](packages/token)** - Token management and authentication utilities

## Pre-requisites

Before proceeding, ensure that your system meets the following requirements:

- [Node.js](https://nodejs.org/en/download/) (v20.11.0 or higher is required)
- [Rush](https://rushjs.io/) - Microsoft's scalable monorepo manager

## Installation

You need Microsoft's [rush](https://rushjs.io/) to install the application.

1. Install Rush globally using the command:

```bash
npm install -g @microsoft/rush
```

1. Navigate to the repository root and run the following commands:

```bash
rush install
rush build
```

## Build

To build all packages:

```bash
rush build
```

To rebuild (ignoring cache):

```bash
rush rebuild
```

## Build & Watch

For development purposes, `rush build:watch` action could be used:

```bash
rush build:watch
```

It includes build and validate phases in watch mode.

## Update project structure

If the project's structure is updated, it may be necessary to relink and rebuild the projects:

```bash
rush update
rush build
```

## Troubleshooting

If a build fails, but the code is correct, try to delete the [build cache](https://rushjs.io/pages/maintainer/build_cache/) and retry:

```bash
rm -rf common/temp/build-cache
rush rebuild
```

## Tests

To execute all tests:

```bash
rush test
```

For individual test execution inside a package directory:

```bash
rushx test
```

## Package Publishing

To bump a package version:

```bash
node ./common/scripts/bump.js -p projectName
```

## API Client Usage

If you want to interact with Huly programmatically, check out the [API Client](packages/api-client/README.md) documentation. The API client provides a typed interface for all Huly operations and can be used to build integrations and custom applications.

You can find API usage examples in the [Huly examples](https://github.com/hcengineering/huly-examples) repository.

## Related Projects

- **[Huly Platform](https://github.com/hcengineering/platform)** - The main Huly Platform repository
- **[Huly Self-Host](https://github.com/hcengineering/huly-selfhost)** - Self-hosting solution for Huly
- **[Huly Examples](https://github.com/hcengineering/huly-examples)** - API usage examples

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Licensed under the [EPL-2.0](LICENSE) license.

## Additional Links

- [Huly Website](https://huly.io/)
- [Documentation](https://docs.huly.io/)
- [Community](https://github.com/hcengineering/platform/discussions)

---

© 2025 [Hardcore Engineering Inc](https://hardcoreeng.com/).
