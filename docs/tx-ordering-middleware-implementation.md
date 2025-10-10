# TxOrderingMiddleware Implementation

## Overview

The `TxOrderingMiddleware` ensures that transactions for the same document are broadcasted to clients in the correct order, preventing race conditions that cause unnecessary `getCurrentDoc` calls.

## Problem Description

### The Race Condition

When multiple transactions for the same document are processed concurrently:

1. **Transaction 1** arrives with `modifiedOn=101`
2. **Transaction 2** arrives with `modifiedOn=102`
3. Due to network/processing delays, tx2's `handleBroadcast()` might complete before tx1's
4. Client receives tx2 first, then tx1
5. Client's LiveQuery sees out-of-order transactions and calls `getCurrentDoc` unnecessarily

This was confirmed in the unit test `liveQuery.race.test.ts`.

## Solution Design

### Key Insights from `client.ts`

Looking at how transactions flow in `client.ts`:

```typescript
async txRaw(ctx: ClientSessionCtx, tx: Tx): Promise<{...}> {
  // 1. Process transaction
  result = await ctx.pipeline.tx(ctx.ctx, [tx])

  // 2. Send result to client
  await ctx.sendResponse(ctx.requestId, result)

  // 3. Broadcast to other clients (returns promise)
  const broadcastPromise = ctx.pipeline.handleBroadcast(ctx.ctx)

  return { result, broadcastPromise, asyncsPromise }
}
```

The critical observation: Multiple `txRaw()` calls can be in-flight simultaneously, and their `handleBroadcast()` promises may resolve out-of-order.

### Two-Phase Approach

#### Phase 1: `tx()` - Record Transaction Order

When a transaction is processed:

1. Extract the target document ID from the transaction
2. Create a promise that will be resolved when this tx's broadcast completes
3. Store the transaction entry in a queue: `Map<docId, TxOrderEntry[]>`

```typescript
interface TxOrderEntry {
  txId: string
  modifiedOn: number
  broadcastPromise?: Promise<void>
  broadcastResolve?: () => void
}
```

#### Phase 2: `handleBroadcast()` - Wait Before Broadcasting

When broadcasting transactions:

1. For each transaction in the broadcast, find all previous transactions for the same document
2. Wait for all previous broadcasts to complete: `await Promise.all(waitPromises)`
3. Call the next middleware's `handleBroadcast()` to perform actual broadcast
4. Resolve this transaction's promise to signal completion
5. Remove the transaction from the queue

### Example Scenario

```
Time  | Thread 1 (tx1, modifiedOn=101)      | Thread 2 (tx2, modifiedOn=102)
------|-------------------------------------|-----------------------------------
T1    | tx() called                         |
      | - Create promise1                   |
      | - Queue: [tx1]                      |
------|-------------------------------------|-----------------------------------
T2    |                                     | tx() called
      |                                     | - Create promise2
      |                                     | - Queue: [tx1, tx2]
------|-------------------------------------|-----------------------------------
T3    |                                     | handleBroadcast() called
      |                                     | - Find tx1 before tx2
      |                                     | - await promise1 (BLOCKS)
------|-------------------------------------|-----------------------------------
T4    | handleBroadcast() called            |
      | - No previous txes                  | (still waiting on promise1)
      | - Broadcast tx1                     |
      | - Resolve promise1                  |
      | - Remove tx1 from queue             |
------|-------------------------------------|-----------------------------------
T5    |                                     | promise1 resolved, continues
      |                                     | - Broadcast tx2
      |                                     | - Resolve promise2
      |                                     | - Remove tx2 from queue
```

## Implementation Details

### Data Structure

```typescript
private readonly docTxQueue = new Map<Ref<Doc>, TxOrderEntry[]>()
```

- **Key**: Document ID
- **Value**: Array of transaction entries in order of arrival
- Automatically cleaned up when queues are empty

### Memory Management

To prevent memory leaks:

1. Remove transactions from queue after broadcast completes
2. Delete empty queues
3. If a queue grows beyond 1000 entries, remove oldest entries (with safety resolution)

### Key Methods

#### `tx(ctx, txes)`

Records transaction order:

```typescript
for (const tx of txes) {
  const docId = this.getTargetDocId(tx)
  if (docId !== undefined) {
    let queue = this.docTxQueue.get(docId)
    if (queue === undefined) {
      queue = []
      this.docTxQueue.set(docId, queue)
    }

    // Create promise for this transaction's broadcast
    let broadcastResolve
    const broadcastPromise = new Promise<void>((resolve) => {
      broadcastResolve = resolve
    })

    queue.push({
      txId: tx._id,
      modifiedOn: tx.modifiedOn,
      broadcastPromise,
      broadcastResolve
    })
  }
}
```

#### `handleBroadcast(ctx)`

Enforces order and waits:

```typescript
const waitPromises: Promise<void>[] = []

for (const tx of txes) {
  const queue = this.docTxQueue.get(docId)
  const txIndex = queue.findIndex((entry) => entry.txId === tx._id)

  // Wait for all previous transactions
  for (let i = 0; i < txIndex; i++) {
    const prevEntry = queue[i]
    if (prevEntry.broadcastPromise !== undefined) {
      waitPromises.push(prevEntry.broadcastPromise)
    }
  }
}

// Block until all previous broadcasts complete
await Promise.all(waitPromises)

// Now broadcast this transaction
await this.next?.handleBroadcast(ctx)

// Mark as complete
for (const tx of txes) {
  // Resolve promise and remove from queue
  entry.broadcastResolve()
  queue.splice(txIndex, 1)
}
```

## Testing

### Unit Tests (`txOrdering.test.ts`)

1. **Basic ordering**: Verify out-of-order transactions are broadcasted in correct sequence
2. **Multiple documents**: Ensure independent ordering per document
3. **Concurrent broadcasts**: Test that later transactions wait for earlier ones
4. **Statistics tracking**: Verify queue size monitoring
5. **Memory cleanup**: Confirm transactions removed after broadcast

### Integration Test

Simulates the full pipeline flow with mocked next middleware.

## Performance Considerations

### Overhead

- **Memory**: O(N) where N is number of in-flight transactions per document
- **CPU**: O(M) where M is position in queue (typically small)

### Benefits

- Prevents unnecessary `getCurrentDoc` calls on client
- Reduces database load
- Improves client-side responsiveness

### Scalability

- Independent ordering per document (no global locks)
- Automatic cleanup prevents memory leaks
- Works with any number of concurrent transactions

## Deployment

### Adding to Pipeline

In your middleware configuration:

```typescript
import { TxOrderingMiddleware } from '@hcengineering/middleware'

const pipeline = [
  // ... other middleware
  TxOrderingMiddleware.create()
  // ... more middleware
]
```

### Monitoring

Use `getStats()` to monitor:

```typescript
const stats = middleware.getStats()
console.log('Tracked documents:', stats.trackedDocuments)
console.log('Queued transactions:', stats.totalTrackedTransactions)
```

## Future Enhancements

1. **Configurable queue size limit**: Currently hardcoded to 1000
2. **Metrics integration**: Export stats to monitoring system
3. **Timeout handling**: Add timeout for stuck broadcasts
4. **Priority-based ordering**: Allow high-priority transactions to bypass queue

## Related Documents

- `/docs/livequery-race-condition-analysis.md` - Detailed problem analysis
- `/packages/middleware/src/tests/liveQuery.race.test.ts` - Original race condition test
- `/packages/middleware/src/tests/txOrdering.test.ts` - Middleware unit tests
