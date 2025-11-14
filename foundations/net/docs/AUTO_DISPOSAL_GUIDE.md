# Auto-Disposal Guide for Network Clients

This guide explains how to properly use auto-disposal with the `createNetworkClient()` function.

## Overview

The `NetworkClientWithAgents` class implements JavaScript's explicit resource management proposal via `Symbol.dispose` and `Symbol.asyncDispose`. This provides automatic cleanup of resources when clients go out of scope.

## When to Use `await using`

### ✅ Use `await using` for:

1. **Short-lived scripts and examples** that complete and exit
2. **Test cases** where cleanup is needed after each test
3. **Client-only applications** that don't serve agents or containers
4. **Request-response patterns** where the client is used temporarily

```typescript
// Example: Simple client usage with auto-disposal
async function fetchData() {
  await using client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)

  const container = await client.get('my-service' as ContainerKind, {})
  const result = await container.request('getData')

  return result
  // Client automatically disposed here
}
```

### ❌ Do NOT use `await using` for:

1. **Long-running services** that need to stay connected
2. **Applications hosting agents and containers** via `serveAgent()`
3. **Production servers** that should run indefinitely
4. **Background workers** that process jobs continuously

```typescript
// Example: Long-running service (DON'T use 'await using')
class MyService {
  private client: ReturnType<typeof createNetworkClient> | null = null

  async start() {
    // Keep strong reference - NO 'await using'
    this.client = createNetworkClient('localhost:3737')
    await this.client.waitConnection(5000)

    // Serve containers
    await this.client.serveAgent('localhost:3738', {
      'my-container': myContainerFactory
    })

    console.log('Service started - will run indefinitely')
  }

  async stop() {
    // Manual cleanup when ready
    if (this.client) {
      await this.client.close()
      this.client = null
    }
  }
}

// Usage
const service = new MyService()
await service.start()

// Graceful shutdown
process.on('SIGTERM', () => service.stop())
process.on('SIGINT', () => service.stop())

// Keep running
await new Promise(() => {})
```

## Auto-Disposal Behavior

When you use `await using`, the client will be automatically disposed:

1. **At the end of the block** where it was declared
2. **On exception/error** (ensures cleanup even on failures)
3. **On early return** from the function

```typescript
async function example() {
  await using client = createNetworkClient('localhost:3737')

  // If an error occurs here...
  throw new Error('Something went wrong')

  // ...client.close() is still called automatically
}
```

## Manual Disposal

For long-running services, manage the lifecycle manually:

```typescript
// Create without auto-disposal
const client = createNetworkClient('localhost:3737')

// Use the client...
await client.waitConnection(5000)

// Manual cleanup when done
await client.close()
```

## Best Practices

### For Examples and Demos

All example scripts should use `await using` for automatic cleanup:

```typescript
async function main() {
  // Setup infrastructure (servers, agents)
  const server = new NetworkServer(...)
  const agent = new AgentImpl(...)

  // Client with auto-disposal
  await using client = createNetworkClient('localhost:3737')
  await client.register(agent)

  // Do work...

  // Manual cleanup of infrastructure
  await server.close()
}
```

### For Production Services

Production services should use manual lifecycle management:

```typescript
class ProductionService {
  private client: NetworkClient | null = null

  async start() {
    this.client = createNetworkClient(config.networkUrl)
    await this.client.waitConnection()
    await this.setupContainers()

    // Setup signal handlers
    process.on('SIGTERM', () => this.shutdown())
    process.on('SIGINT', () => this.shutdown())
  }

  async shutdown() {
    console.log('Graceful shutdown initiated...')
    if (this.client) {
      await this.client.close()
    }
    process.exit(0)
  }
}
```

## Migration from Old Code

If you have existing code using manual `client.close()`:

### Before (manual cleanup):

```typescript
const client = createNetworkClient('localhost:3737')
try {
  await client.waitConnection(5000)
  // ... use client ...
} finally {
  await client.close()
}
```

### After (auto-disposal):

```typescript
await using client = createNetworkClient('localhost:3737')
await client.waitConnection(5000)
// ... use client ...
// Automatically closed
```

## Common Pitfalls

### ❌ Wrong: Using `await using` in long-running services

```typescript
// BAD: Service will stop when function returns!
async function startService() {
  await using client = createNetworkClient('localhost:3737')
  await client.serveAgent('localhost:3738', factories)
  // Client disposed when function returns - service stops!
}
```

### ✅ Correct: Keep reference for long-running services

```typescript
// GOOD: Service keeps running
let client: NetworkClient | null = null

async function startService() {
  client = createNetworkClient('localhost:3737')
  await client.serveAgent('localhost:3738', factories)
  // Service continues running
}

async function stopService() {
  if (client) {
    await client.close()
    client = null
  }
}
```

## Summary

- **Short-lived operations**: Use `await using` for automatic cleanup
- **Long-running services**: Use regular assignment and manual cleanup
- **Hosting agents/containers**: Always use manual lifecycle management
- **Examples and tests**: Prefer `await using` for cleaner code

The auto-disposal feature makes resource management simpler and safer for temporary client usage while still allowing full control for production services.
