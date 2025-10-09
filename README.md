# Huly Server

[![GitHub License](https://img.shields.io/github/license/hcengineering/huly.server?style=for-the-badge)](LICENSE)

⭐️ Your star shines on us. Star us on GitHub!

## About

Huly Server is a collection of server-side packages extracted from the [Huly Platform](https://github.com/hcengineering/platform). This repository contains backend infrastructure components, storage adapters, and server-side utilities that power the Huly ecosystem.

These packages provide essential server-side functionality including database adapters (MongoDB, PostgreSQL, Elasticsearch), storage providers (MinIO, S3), messaging infrastructure (Kafka), and collaborative editing capabilities. They are designed to be modular, scalable, and production-ready for building robust backend services.

## Packages

This repository includes the following server packages:

### Server Core

- [@hcengineering/server-core](packages/core) - Core server infrastructure, adapters, storage management, and server-side utilities
- [@hcengineering/server](packages/server) - Main server implementation and runtime
- [@hcengineering/server-client](packages/client) - Server-side client implementation for inter-service communication
- [@hcengineering/middleware](packages/middleware) - Server middleware components and request processing

### Database Adapters

- [@hcengineering/mongo](packages/mongo) - MongoDB adapter for document storage
- [@hcengineering/postgres](packages/postgres) - PostgreSQL adapter for relational data
- [@hcengineering/elastic](packages/elastic) - Elasticsearch adapter for full-text search and analytics

### Storage Providers

- [@hcengineering/server-storage](packages/server-storage) - Storage abstraction layer and implementations
- [@hcengineering/minio](packages/minio) - MinIO storage provider for object storage
- [@hcengineering/s3](packages/s3) - AWS S3 compatible storage provider
- [@hcengineering/datalake](packages/datalake) - Data lake storage and management
- [@hcengineering/hulylake](packages/hulylake) - Huly lake storage and management

### Infrastructure

- [@hcengineering/kafka](packages/kafka) - Apache Kafka integration for event streaming and messaging
- [@hcengineering/collaboration](packages/collaboration) - Real-time collaborative editing infrastructure

## Pre-requisites

Before proceeding, ensure that your system meets the following requirements:

- [Node.js](https://nodejs.org/en/download/) (v20.11.0 or higher is required)
- [Rush](https://rushjs.io/) - Microsoft's scalable monorepo manager
- [Docker](https://docs.docker.com/get-docker/) - For running development services
- [Docker Compose](https://docs.docker.com/compose/install/) - For orchestrating development environment

## Verification

To verify the installation, perform the following checks in your terminal:

- Ensure that the `docker` commands are available:

```bash
docker --version
docker compose version
```

- Verify Node.js version:

```bash
node --version
```

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

### Running Integration Tests

The repository includes integration tests that require Docker services:

```bash
cd tests
./prepare-tests.sh
rush test
```

### Test Coverage

To generate test coverage reports:

```bash
# Run tests with coverage
rush test

# Merge coverage reports from all packages
node common/scripts/merge-coverage.js

# Generate HTML coverage report
node common/scripts/generate-coverage-html.js

# View coverage summary
sh common/scripts/show-coverage-summary.sh
```

The coverage report will be available in `coverage/html/index.html`.

## Package Publishing

To bump a package version:

```bash
node ./common/scripts/bump.js -p projectName
```

## Development Environment

### Setting Up Services

The repository includes a Docker Compose configuration for development services:

```bash
cd tests
docker compose up -d
```

This will start:

- MongoDB - Document database
- PostgreSQL - Relational database
- Elasticsearch - Search engine
- MinIO - Object storage
- Kafka - Message broker

### Environment Variables

Create a `.env` file in the `tests` directory with the following variables:

```env
MONGO_URL=mongodb://localhost:27017
POSTGRES_URL=postgresql://localhost:5432/huly
ELASTIC_URL=http://localhost:9200
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
KAFKA_BROKERS=localhost:9092
```

## Related Projects

- [Huly Platform](https://github.com/hcengineering/platform) - The main Huly Platform repository
- [Huly Core](https://github.com/hcengineering/huly.core) - Core packages and client libraries
- [Huly Self-Host](https://github.com/hcengineering/huly-selfhost) - Self-hosting solution for Huly
- [Huly Examples](https://github.com/hcengineering/huly-examples) - API usage examples

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Licensed under the [EPL-2.0](LICENSE) license.

## Additional Links

- [Huly Website](https://huly.io/)
- [Documentation](https://docs.huly.io/)
- [Community](https://github.com/hcengineering/platform/discussions)

© 2025 [Hardcore Engineering Inc](https://hardcoreeng.com/).
