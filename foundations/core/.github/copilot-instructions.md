# GitHub Copilot Instructions - Huly Core

**Type**: Rush monorepo (TypeScript)  
**License**: EPL-2.0  
**Build System**: Rush v5.158.1 + pnpm v10.15.1

## Critical Rules

1. **Always use Rush commands**, never npm/pnpm directly: `rush install`, `rush build`, `rush test`, `rush update`
2. **Internal dependencies must use `workspace:^` protocol** in package.json
3. **All packages extend `@hcengineering/platform-rig`** for tsconfig/eslint - don't override configs
4. **Co-locate tests** in `src/__tests__/` directories (Jest + ts-jest)
5. **Named exports only** - avoid default exports

## Quick Start

```bash
rush install && rush build     # Initial setup
rush build:watch               # Development mode
rush rebuild                   # Force clean rebuild (clears cache)
rush test                      # Run all tests
```

## Package Structure (All packages follow this)

```
packages/<name>/
├── src/index.ts          # Main entry (exports)
├── lib/                  # Compiled JS (gitignored)
├── types/                # TS declarations (gitignored)
├── package.json          # Scope: @hcengineering/, main: lib/index.js
├── tsconfig.json         # Extends platform-rig
└── jest.config.js        # preset: 'ts-jest', roots: ['./src']
```

## Key Architecture Patterns

**Plugin System**: `@hcengineering/platform` provides dependency injection. Packages register resources/services via plugin manifests. Example: `packages/core/src/plugin.ts`

**Data Flow**: `core` → abstract models (Doc, Ref, Class) → `client` → concrete implementations → WebSocket/REST via `api-client`

**Text Processing**: Modular `text-*` packages (core/html/markdown/ydoc) support extensible rich-text editing with Yjs collaboration

**Storage Abstraction**: `storage` package defines interfaces; `storage-client` provides implementations; backends are pluggable

## Common Tasks

**Add a package**: Create under `packages/`, add standard files (see structure above), register in `rush.json` if needed, run `rush update`

**Debug build failures**: Check `<package>/rush-logs/` and `.build/build.tsbuildinfo`; use `rush rebuild` to clear incremental state

**Run single package tests**: `cd packages/<name> && rushx test`

**Update dependencies**: Edit package.json, run `rush update`, verify with `rush build`

## Where to Look

- **Rush config**: `common/config/rush/`, `rush.json`
- **Shared scripts**: `common/scripts/` (coverage merging, install helpers)
- **Core abstractions**: `packages/core/src/` (Doc, Hierarchy, TxOperations)
- **Platform runtime**: `packages/platform/src/` (plugin loader, resources)
- **Client layer**: `packages/client/src/` (LiveQuery, TxOperations client wrapper)

## Watch Out For

- Rush uses **incremental builds** - cached artifacts in `.build/` and `common/temp/`
- **TypeScript strict mode** enabled - type safety enforced
- **platform-rig** centralizes tooling configs (ESLint, Prettier, tsconfig)
- Check `common/temp/rush-recycler/` for moved files during dependency updates
