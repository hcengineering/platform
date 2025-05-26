# Retry Utility

A comprehensive TypeScript utility for handling transient failures with exponential backoff, jitter, and customizable retry conditions.

## Features

- ✅ **Exponential backoff** with configurable parameters
- ✅ **Jitter support** to prevent thundering herd problems
- ✅ **Customizable retry conditions** to control which errors should be retried
- ✅ **TypeScript decorators** for clean, declarative retry logic
- ✅ **Function wrappers** for retrofitting existing code with retry capabilities
- ✅ **Comprehensive logging** of retry attempts and failures

## Usage

### Basic Usage

Wrap any async operation with the `withRetry` function:

```typescript
import { withRetry } from '@hcengineering/retry'

async function fetchData() {
  const data = await withRetry(
    async () => {
      // Your async operation that might fail transiently
      return await api.getData()
    },
    { maxRetries: 3 }
  )
  return data
}
```

### Using Decorators

For class methods, you can use the `@Retryable` decorator for clean, declarative retry logic:

```typescript
import { Retryable } from '@hcengineering/retry'

class UserService {
  @Retryable({ maxRetries: 5 })
  async getUserProfile(userId: string): Promise<UserProfile> {
    // This method will automatically retry on failure
    return await this.api.fetchUserProfile(userId)
  }
}
```

### Delay Strategies

The package provides several delay strategies to control the timing between retry attempts:

Exponential Backoff
Increases the delay exponentially between retries, which is ideal for backing off from overloaded services:

```
import { withRetry, DelayStrategyFactory } from '@hcengineering/retry'

await withRetry(
  async () => await api.getData(),
  {
    maxRetries: 5,
    delayStrategy: DelayStrategyFactory.exponentialBackoff({
      initialDelayMs: 100,  // Start with 100ms
      maxDelayMs: 10000,    // Cap at 10 seconds
      backoffFactor: 2,     // Double the delay each time (100, 200, 400, 800, 1600)
      jitter: 0.2           // Add ±20% randomness
    })
  }
)
```

Fixed Delay
Uses the same delay for all retry attempts, useful when retrying after a fixed cooldown period:
```
import { withRetry, DelayStrategyFactory } from '@hcengineering/retry'

await withRetry(
  async () => await api.getData(),
  {
    maxRetries: 3,
    delayStrategy: DelayStrategyFactory.fixed({
      delayMs: 1000,        // Always wait 1 second between retries
      jitter: 0.1           // Optional: add ±10% randomness
    })
  }
)
```
Fibonacci Delay
Uses the Fibonacci sequence to calculate delays, providing a more moderate growth rate than exponential backoff:
```
import { withRetry, DelayStrategyFactory } from '@hcengineering/retry'

await withRetry(
  async () => await api.getData(),
  {
    maxRetries: 6,
    delayStrategy: DelayStrategyFactory.fibonacci({
      baseDelayMs: 100,     // Base unit for Fibonacci sequence
      maxDelayMs: 10000,    // Maximum delay cap
      jitter: 0.2           // Add ±20% randomness
    })
  }
)
// Delays follow Fibonacci sequence: 100ms, 200ms, 300ms, 500ms, 800ms, ...
```

### Custom Retry Conditions

You can specify which errors should trigger retries:

```typescript
import { withRetry, retryNetworkErrors } from '@platform/utils/retry'

async function fetchData() {
  return await withRetry(
    async () => await api.getData(),
    {
      // Only retry network-related errors
      isRetryable: retryNetworkErrors,
      maxRetries: 5
    }
  )
}
```

Create your own custom retry condition:

```typescript
import { type IsRetryable } from '@platform/utils/retry'

// Custom retry condition
const retryDatabaseErrors: IsRetryable = (error: unknown): boolean => {
  if (error instanceof DatabaseError) {
    // Only retry specific database errors
    return error.code === 'CONNECTION_LOST' || 
           error.code === 'DEADLOCK' || 
           error.code === 'TIMEOUT'
  }
  return false
}

// Use it
await withRetry(
  async () => await db.query('SELECT * FROM users'),
  { isRetryable: retryDatabaseErrors }
)
```

## API Reference

### `withRetry<T>(operation, options?, operationName?): Promise<T>`

Executes an async operation with retry logic.

- `operation`: `() => Promise<T>` - The async operation to execute
- `options`: `Partial<RetryOptions>` - Retry configuration (optional)
- `operationName`: `string` - Name for logging (optional)
- Returns: `Promise<T>` - The result of the operation

### `createRetryableFunction<T>(fn, options?, operationName?): T`

Creates a retryable function from an existing function.

- `fn`: `T extends (...args: any[]) => Promise<any>` - The function to make retryable
- `options`: `Partial<RetryOptions>` - Retry configuration (optional)
- `operationName`: `string` - Name for logging (optional)
- Returns: `T` - A wrapped function with retry logic

### `@Retryable(options?)`

Method decorator for adding retry functionality to class methods.

- `options`: `Partial<RetryOptions>` - Retry configuration (optional)

### RetryOptions

Configuration options for the retry mechanism:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialDelayMs` | `number` | `1000` | Initial delay between retries in milliseconds |
| `maxDelayMs` | `number` | `30000` | Maximum delay between retries in milliseconds |
| `maxRetries` | `number` | `5` | Maximum number of retry attempts |
| `backoffFactor` | `number` | `1.5` | Backoff factor for exponential delay increase |
| `jitter` | `number` | `0.2` | Jitter factor (0-1) to add randomness to delay times |
| `isRetryable` | `IsRetryable` | `retryAllErrors` | Function to determine if an error is retriable |
| `logger` | `Logger` | `defaultLogger` | Logger to use |

### Retry Condition Functions

| Function | Description |
|----------|-------------|
| `retryAllErrors` | Retry on any error (default) |
| `retryNetworkErrors` | Retry only on network-related errors |

## Examples

### Basic Retry with Custom Options

```typescript
import { withRetry } from '@platform/utils/retry'

async function fetchDataWithRetry() {
  return await withRetry(
    async () => {
      const response = await fetch('https://api.example.com/data')
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      return await response.json()
    },
    {
      initialDelayMs: 300,   // Start with 300ms delay
      maxDelayMs: 10000,     // Max delay of 10 seconds
      maxRetries: 4,         // Try up to 4 times (1 initial + 3 retries)
      backoffFactor: 2,      // Double the delay each time
      jitter: 0.25           // Add 25% randomness to delay
    },
    'fetchApiData'           // Name for logging
  )
}
```

### Class with Multiple Retryable Methods

```typescript
import { Retryable, retryNetworkErrors } from '@platform/utils/retry'

class DataService {
  @Retryable({
    maxRetries: 3,
    initialDelayMs: 200
  })
  async fetchUsers(): Promise<User[]> {
    // Will retry up to 3 times with initial 200ms delay
    return await this.api.getUsers()
  }

  @Retryable({
    maxRetries: 5,
    initialDelayMs: 1000,
    isRetryable: retryNetworkErrors
  })
  async uploadFile(file: File): Promise<string> {
    // Will retry up to 5 times, but only for network errors
    return await this.api.uploadFile(file)
  }
}
```
