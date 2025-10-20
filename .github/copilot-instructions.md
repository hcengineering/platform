# Huly Platform - Copilot Instructions

TypeScript/Svelte 4 monorepo using Rush.js (pnpm 10.15.1), Node >=20 <25, Webpack 5, Electron, Jest.

## Code Style

**TypeScript**: Strict types, interfaces over types, avoid `any`, export types separately
**Svelte**: Script/style/markup order, reactive `$:`, stores for state, small focused components
**Naming**: Files `kebab-case`, Components `PascalCase`, functions `camelCase`, constants `UPPER_SNAKE_CASE`

## Structure

- `models/*` - Shared types/models
- `server-*` - Server packages
- `plugins/*` - Client plugins
- `packages/*` - Reusable utilities
- Projects 2-3 levels deep, each with `package.json`

## Rush Commands

```bash
rush install         # Install deps
rush build           # Build all
rush build --to PKG  # Build specific
rush add -p PKG      # Add dependency
```

## Patterns

- Always handle errors (proper Error subclasses, catch promises)
- Use async/await, Promise.all() for parallel ops
- Svelte stores for shared state, separate business logic
- JSDoc public APIs, tests alongside code
- Run `rushx test` before commit

## Avoid

❌ `any` without reason ❌ console.log() ❌ Mixed concerns ❌ Circular deps ❌ Ignoring TS errors

## When Coding

Infer location from context (models/server/plugins/packages), match existing patterns, include proper imports/types, add error handling, use existing utils first.
