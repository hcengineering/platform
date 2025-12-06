# Huly Platform - Copilot Instructions

TypeScript/Svelte 4 monorepo using Rush.js (pnpm 10.15.1), Node >=20 <25, Webpack 5, Electron, Jest.

## Interaction preferences

Respond to user using Russian language, all comments should be in English.

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

## Debugging Workflow

When debugging issues:
1. **Add comprehensive logging first** - use `console.log` with structured objects showing state, parameters, IDs
2. **Test and analyze logs** - let user run the app and provide actual console output
3. **Identify root cause** from logs - trace the flow, compare expected vs actual values
4. **Fix the issue** based on findings
5. **Remove all logging** after fix is confirmed - keep production code clean

Logging format:
```typescript
console.log('[ComponentName.methodName] Description', {
  key1: value1,
  key2: value2,
  objectId: object?._id  // Use optional chaining for safety
})
```

## Avoid

❌ `any` without reason ❌ `console.log()` in production ❌ Mixed concerns ❌ Circular deps ❌ Ignoring TS errors

## When Coding

- Infer location from context (models/server/plugins/packages)
- Match existing patterns in codebase
- Include proper imports/types
- Add error handling
- Use existing utils first
- When fixing bugs:
  - Read existing code thoroughly before changing
  - Use logging to understand actual runtime behavior
  - Trace data flow through components
  - Verify assumptions with logs before implementing fixes
  - Test incrementally, remove debug code when done

## Navigation & Selection Architecture

The app uses a provider-based selection/focus system:
- `focusStore` - global focus state
- `selectionStore` - global selection state  
- `ListSelectionProvider` - manages list navigation, delegates to view-specific handlers
- `SelectDirection` - `'vertical'` (up/down) or `'horizontal'` (left/right in tables, first/last in lists)

Key principles:
- Navigation uses **actual displayed order** (from `getLimited()`) not projection order
- Focus changes propagate through `updateFocus()` 
- Selection follows focus via provider delegation
- Scroll happens automatically via `scrollIntoView()` on navigation
