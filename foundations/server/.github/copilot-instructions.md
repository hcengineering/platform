# Huly Server - Copilot Context

## Project Overview

**Monorepo**: Rush-managed backend infrastructure for Huly Platform  
**Stack**: TypeScript, Node.js v20.11.0+, pnpm 10.15.1, Rush 5.158.1, Jest  
**License**: Eclipse Public License 2.0 (Hardcore Engineering Inc.)

## Package Categories

- **Core**: core, server, client, middleware
- **Database**: mongo, postgres, elastic
- **Storage**: server-storage, minio, s3, datalake, hulylake
- **Infrastructure**: kafka, collaboration

Standard structure: `src/` → `lib/` (compiled), `tsconfig.json`, `jest.config.js`, `package.json` with `@hcengineering/` scope

## Essential Commands

**Setup & Build:**

```bash
rush install              # Install dependencies
rush build                # Build all packages
cd packages/<pkg> && rushx build  # Build specific package
```

**Testing:**

```bash
cd tests && ./prepare-tests.sh  # First time: start Docker services (Elasticsearch, MongoDB, CockroachDB, Redpanda)
rush test                        # Run all tests
npm run test:coverage            # With coverage
```

**Common Tasks:**

- New package: Create dir in `packages/`, add to `rush.json`, run `rush update`
- Update deps: Edit `package.json`, run `rush update`, verify with `rush build`
- Troubleshoot: Check `packages/<pkg>/rush-logs/` for build errors, `coverage/` for test results

## Key Concepts

- **Domain Model**: WorkspaceIds (multi-tenant), Transactions (Tx), Documents (Doc), Domains, Permissions
- **Architecture**: Pluggable adapters, middleware pipeline, abstract storage, Kafka messaging, CRDT collaboration
- **Testing**: Docker Compose integration tests in `tests/`, `prepare-tests.sh` auto-detects running containers

## Coding Standards

- TypeScript strict mode, Prettier formatting
- Imports: `@hcengineering/` namespace, named imports, grouped (external/internal/types)
- Errors: `PlatformError` from `@hcengineering/platform`, `unknownError` wrapper
- Async: `async/await`, `MeasureContext` for cancellation, cleanup in finally blocks
- Security: No secrets in code, validate inputs, prepared statements, rate limiting

## Quick Reference

- Config: `rush.json`, `.nvmrc`, `common/config/rush/`
- Logs: `packages/<pkg>/rush-logs/`, `coverage/html/`
- Docs: `docs/tx-ordering-middleware-implementation.md`
- Tests: Force restart with `docker compose -p sanity down`
