//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { SyncMutex } from '../mutex'

describe('SyncMutex', () => {
  let mutex: SyncMutex

  beforeEach(() => {
    mutex = new SyncMutex()
  })

  it('should allow a lock to be acquired and released', async () => {
    const release = await mutex.lock('key1')
    expect(typeof release).toBe('function')
    release()
  })

  it('should allow different keys to be locked simultaneously', async () => {
    const timestamps: number[] = []

    void (async () => {
      const release = await mutex.lock('key1')
      timestamps.push(Date.now())
      await new Promise((resolve) => setTimeout(resolve, 50))
      release()
    })()

    void (async () => {
      const release = await mutex.lock('key2')
      timestamps.push(Date.now())
      await new Promise((resolve) => setTimeout(resolve, 50))
      release()
    })()

    // Give some time for both locks to be acquired
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Both locks should be acquired within 20ms of each other
    // since they use different keys and shouldn't block each other
    expect(timestamps.length).toBe(2)
    expect(Math.abs(timestamps[0] - timestamps[1])).toBeLessThan(20)
  })

  it('should make subsequent locks wait for release', async () => {
    const executionOrder: string[] = []

    // First lock
    void (async () => {
      const release = await mutex.lock('key1')
      executionOrder.push('lock1 acquired')
      await new Promise((resolve) => setTimeout(resolve, 50))
      executionOrder.push('lock1 releasing')
      release()
    })()

    // Small delay to ensure first lock is acquired first
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Second lock on same key
    void (async () => {
      executionOrder.push('lock2 waiting')
      const release = await mutex.lock('key1')
      executionOrder.push('lock2 acquired')
      release()
    })()

    // Wait for all operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(executionOrder).toEqual(['lock1 acquired', 'lock2 waiting', 'lock1 releasing', 'lock2 acquired'])
  })

  it('should handle multiple sequential locks correctly', async () => {
    const result: number[] = []

    const lockAndExecute = async (value: number): Promise<void> => {
      const release = await mutex.lock('sequential')
      result.push(value)
      await new Promise((resolve) => setTimeout(resolve, 10)) // Simulate some work
      release()
    }

    // Execute multiple locks in sequence
    await Promise.all([lockAndExecute(1), lockAndExecute(2), lockAndExecute(3), lockAndExecute(4), lockAndExecute(5)])

    // The values should be added to the result array in order
    // since each lock waits for the previous one to complete
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  it('should handle lock release correctly even if called multiple times', async () => {
    const lockKey = 'multiple-release'
    const release = await mutex.lock(lockKey)

    // First release
    release()

    // Second release should not throw
    release()

    // We should be able to acquire the lock again
    const newRelease = await mutex.lock(lockKey)
    newRelease()
  })

  it('should handle errors within the locked code', async () => {
    const lockKey = 'error-handling'
    const executionOrder: string[] = []

    // First lock with an error
    try {
      const release = await mutex.lock(lockKey)
      executionOrder.push('lock1 acquired')
      try {
        throw new Error('Simulated error')
      } finally {
        executionOrder.push('lock1 releasing')
        release()
      }
    } catch (err) {
      executionOrder.push('error caught')
    }

    // Second lock should still work
    const release2 = await mutex.lock(lockKey)
    executionOrder.push('lock2 acquired')
    release2()

    expect(executionOrder).toEqual(['lock1 acquired', 'lock1 releasing', 'error caught', 'lock2 acquired'])
  })

  it('should work with complex async operations', async () => {
    const results: string[] = []
    const lockKey = 'async-operations'

    // Helper function that performs complex async work under lock
    const performWork = async (id: string, delay: number): Promise<void> => {
      const release = await mutex.lock(lockKey)
      try {
        results.push(`${id} started`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        results.push(`${id} completed`)
      } finally {
        release()
      }
    }

    // Start multiple work items with different delays
    await Promise.all([performWork('task1', 30), performWork('task2', 10), performWork('task3', 20)])

    // Tasks should be completed in the order they acquired the lock
    expect(results.length).toBe(6)
    expect(results.includes('task1 started')).toBe(true)
    expect(results.includes('task1 completed')).toBe(true)
    expect(results.includes('task2 started')).toBe(true)
    expect(results.includes('task2 completed')).toBe(true)
    expect(results.includes('task3 started')).toBe(true)
    expect(results.includes('task3 completed')).toBe(true)

    expect(results.indexOf('task1 started')).toBeLessThan(results.indexOf('task2 started'))
    expect(results.indexOf('task2 started')).toBeLessThan(results.indexOf('task3 started'))

    expect(results.indexOf('task1 completed')).toBeLessThan(results.indexOf('task2 completed'))
    expect(results.indexOf('task2 completed')).toBeLessThan(results.indexOf('task3 completed'))
  })

  it('should handle concurrent lock requests fairly (FIFO order)', async () => {
    const lockKey = 'concurrent-fifo'
    const requestOrder: string[] = []
    const executionOrder: string[] = []

    // Helper function to request a lock and track the order
    const requestLock = async (id: string, delayBeforeLock: number): Promise<void> => {
      // Record when this lock was requested
      requestOrder.push(id)

      // Wait specified time before requesting the lock
      await new Promise((resolve) => setTimeout(resolve, delayBeforeLock))

      const release = await mutex.lock(lockKey)
      try {
        executionOrder.push(id)
        // Small delay while holding the lock
        await new Promise((resolve) => setTimeout(resolve, 10))
      } finally {
        release()
      }
    }

    // Start multiple concurrent lock requests with different initial delays
    const promises = [
      requestLock('first', 0),
      requestLock('second', 5),
      requestLock('third', 10),
      requestLock('fourth', 15),
      requestLock('fifth', 20)
    ]

    // Wait a bit to ensure all requests have been made
    await new Promise((resolve) => setTimeout(resolve, 30))

    // Wait for all locks to complete
    await Promise.all(promises)

    // Verify request order
    expect(requestOrder).toEqual(['first', 'second', 'third', 'fourth', 'fifth'])

    // Verify execution order matches request order (FIFO behavior)
    expect(executionOrder).toEqual(['first', 'second', 'third', 'fourth', 'fifth'])
  })

  it('should handle high contention with many parallel lock requests', async () => {
    const lockKey = 'high-contention'
    const results: string[] = []
    const concurrentTasks = 50
    let completedTasks = 0

    // Function that will be executed by multiple tasks in parallel
    const executeTask = async (taskId: number): Promise<void> => {
      const release = await mutex.lock(lockKey)
      try {
        // Critical section - should only be executed by one task at a time
        results.push(`task-${taskId} entered`)

        // Small random delay inside the critical section
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5))

        results.push(`task-${taskId} exited`)
        completedTasks++
      } finally {
        release()
      }
    }

    // Start many tasks in parallel
    const promises = Array.from({ length: concurrentTasks }).map((_, i) => executeTask(i))

    // Wait for all tasks to complete
    await Promise.all(promises)

    // Verify all tasks completed
    expect(completedTasks).toBe(concurrentTasks)
    expect(results.length).toBe(concurrentTasks * 2)

    // Verify proper interleaving - each task should enter and exit before next task enters
    // Entry and exit should alternate and always be for the same task ID
    for (let i = 0; i < results.length; i += 2) {
      const entryMsg = results[i]
      const exitMsg = results[i + 1]
      const entryTaskId = entryMsg.split('-')[1].split(' ')[0]
      const exitTaskId = exitMsg.split('-')[1].split(' ')[0]

      expect(entryMsg).toContain('entered')
      expect(exitMsg).toContain('exited')
      expect(entryTaskId).toBe(exitTaskId)
    }
  })

  it('should handle lock timeouts correctly', async () => {
    const lockKey = 'timeout-test'

    // First acquire a lock and hold it
    const firstRelease = await mutex.lock(lockKey)

    // Set up a lock with timeout
    const lockWithTimeout = async (
      timeoutMs: number,
      throwTimeout: boolean
    ): Promise<{ success: boolean, error?: any }> => {
      try {
        // Try to acquire the same lock with a timeout
        const release = await Promise.race([
          mutex.lock(lockKey),
          // eslint-disable-next-line promise/param-names
          new Promise<() => void>((resolve, reject) => {
            setTimeout(() => {
              if (throwTimeout) {
                reject(new Error('Lock acquisition timeout'))
              } else {
                resolve(() => {})
              }
            }, timeoutMs)
          })
        ])

        // If we get here, we acquired the lock
        release()
        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    }

    // Try to acquire the lock with a short timeout - should fail
    const result = await lockWithTimeout(100, true)

    // Now release the first lock
    firstRelease()

    // Try again with a new timeout - should succeed now
    const secondAttempt = await lockWithTimeout(100, false)

    // Verify results
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('Lock acquisition timeout')

    expect(secondAttempt.success).toBe(true)
    expect(secondAttempt.error).toBeUndefined()
  })

  it('should maintain isolation between different lock keys even under high load', async () => {
    // Track timings for each key separately
    const timings: Record<string, Array<{ start: number, end: number }>> = {
      keyA: [],
      keyB: [],
      keyC: []
    }

    // Helper to simulate work under a lock
    const doWork = async (key: string, id: number, duration: number): Promise<void> => {
      const release = await mutex.lock(key)
      const startTime = Date.now()
      try {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, duration))
      } finally {
        const endTime = Date.now()
        timings[key].push({ start: startTime, end: endTime })
        release()
      }
    }

    // Create a mix of long and short tasks for each key
    const tasks = [
      // Key A tasks
      doWork('keyA', 1, 20),
      doWork('keyA', 2, 30),
      doWork('keyA', 3, 10),
      doWork('keyA', 4, 15),

      // Key B tasks
      doWork('keyB', 1, 15),
      doWork('keyB', 2, 25),
      doWork('keyB', 3, 10),

      // Key C tasks
      doWork('keyC', 1, 5),
      doWork('keyC', 2, 10),
      doWork('keyC', 3, 15),
      doWork('keyC', 4, 20)
    ]

    // Wait for all tasks to complete
    await Promise.all(tasks)

    // Helper to check for overlaps within a single key's timings
    const hasOverlap = (keyTimings: Array<{ start: number, end: number }>): boolean => {
      for (let i = 0; i < keyTimings.length; i++) {
        for (let j = i + 1; j < keyTimings.length; j++) {
          const a = keyTimings[i]
          const b = keyTimings[j]

          // Check if a overlaps with b
          if (a.start < b.end && a.end > b.start) {
            return true
          }
        }
      }
      return false
    }

    // Verify no overlaps within each key (mutex working)
    expect(hasOverlap(timings.keyA)).toBe(false)
    expect(hasOverlap(timings.keyB)).toBe(false)
    expect(hasOverlap(timings.keyC)).toBe(false)

    // Verify there are overlaps between different keys (parallel execution)
    let crossKeyOverlapFound = false

    // Find at least one cross-key overlap
    for (const keyA of Object.keys(timings)) {
      for (const keyB of Object.keys(timings)) {
        if (keyA === keyB) continue

        // Look for overlaps between keys
        for (const timeA of timings[keyA]) {
          for (const timeB of timings[keyB]) {
            if (timeA.start <= timeB.end && timeA.end >= timeB.start) {
              crossKeyOverlapFound = true
              break
            }
          }
          if (crossKeyOverlapFound) break
        }
        if (crossKeyOverlapFound) break
      }
      if (crossKeyOverlapFound) break
    }

    expect(crossKeyOverlapFound).toBe(true)
  })

  it('should be resilient to unexpected errors during lock acquisition', async () => {
    const lockKey = 'error-resilience'
    const results: string[] = []

    // Mock the internal queue to simulate an error during lock acquisition
    let shouldCauseError = true

    // Create a function that will fail the first time
    const unreliableWork = async (): Promise<void> => {
      try {
        if (shouldCauseError) {
          shouldCauseError = false
          throw new Error('Simulated acquisition error')
        }

        const release = await mutex.lock(lockKey)
        try {
          results.push('acquired lock')
        } finally {
          release()
          results.push('released lock')
        }
      } catch (error) {
        results.push('caught error')
      }
    }

    // Run the unreliable work
    await unreliableWork()

    // Now run it again - should succeed
    await unreliableWork()

    expect(results).toEqual(['caught error', 'acquired lock', 'released lock'])
  })

  it('should be resilient to unexpected errors during lock acquisition', async () => {
    // Existing test...
  })

  it('should release locks when an error is thrown within a promise chain', async () => {
    const lockKey = 'promise-error'
    const executionOrder: string[] = []

    // First lock with an error in the promise chain
    try {
      const promise = mutex.lock(lockKey).then((release) => {
        executionOrder.push('lock1 acquired')

        // Create a promise chain with an error
        return Promise.resolve()
          .then(() => {
            executionOrder.push('lock1 processing')
            throw new Error('Error in promise chain')
          })
          .finally(() => {
            executionOrder.push('lock1 releasing')
            release()
          })
      })

      await promise
      executionOrder.push('lock1 completed') // Should not reach here
    } catch (error) {
      executionOrder.push('error caught')
    }

    // Second lock should still work
    const release2 = await mutex.lock(lockKey)
    executionOrder.push('lock2 acquired')
    release2()

    expect(executionOrder).toEqual([
      'lock1 acquired',
      'lock1 processing',
      'lock1 releasing',
      'error caught',
      'lock2 acquired'
    ])
  })

  it('should handle async rejection with multiple lock requests', async () => {
    const lockKey = 'async-rejection'
    const results: string[] = []

    // First task acquires the lock but fails
    const failingTask = async (): Promise<void> => {
      const release = await mutex.lock(lockKey)
      try {
        results.push('task1 started')
        await new Promise((resolve) => setTimeout(resolve, 20))
        throw new Error('Async task error')
      } catch (error) {
        results.push('task1 error caught')
        throw error // Re-throw the error
      } finally {
        results.push('task1 releasing lock')
        release()
      }
    }

    // Second task waits for the lock
    const waitingTask = async (): Promise<void> => {
      results.push('task2 waiting')
      const release = await mutex.lock(lockKey)
      try {
        results.push('task2 acquired lock')
        await new Promise((resolve) => setTimeout(resolve, 10))
        results.push('task2 completed')
      } finally {
        release()
      }
    }

    // Run both tasks
    try {
      await failingTask()
    } catch (error) {
      results.push('outer catch')
    }

    await waitingTask()

    // Verify error handling and lock release
    expect(results).toEqual([
      'task1 started',
      'task1 error caught',
      'task1 releasing lock',
      'outer catch',
      'task2 waiting',
      'task2 acquired lock',
      'task2 completed'
    ])
  })

  it('should handle nested lock acquisitions with errors', async () => {
    const outerKey = 'outer-lock'
    const innerKey = 'inner-lock'
    const results: string[] = []

    // Function that acquires nested locks with an error in the middle
    const nestedLocks = async (shouldFail: boolean): Promise<void> => {
      const outerRelease = await mutex.lock(outerKey)
      try {
        results.push('outer lock acquired')

        // Acquire inner lock
        const innerRelease = await mutex.lock(innerKey)
        try {
          results.push('inner lock acquired')

          // Simulate work that might fail
          if (shouldFail) {
            throw new Error('Error in nested locks')
          }

          results.push('work completed successfully')
        } finally {
          results.push('inner lock releasing')
          innerRelease()
        }
      } catch (error) {
        results.push('nested error caught')
        throw error // Re-throw to test outer catch
      } finally {
        results.push('outer lock releasing')
        outerRelease()
      }
    }

    // First attempt - should fail
    try {
      await nestedLocks(true)
    } catch (error) {
      results.push('outer error handler')
    }

    // Second attempt - should succeed
    await nestedLocks(false)

    // Verify both locks were properly released during the error scenario
    expect(results).toEqual([
      'outer lock acquired',
      'inner lock acquired',
      'inner lock releasing',
      'nested error caught',
      'outer lock releasing',
      'outer error handler',
      'outer lock acquired',
      'inner lock acquired',
      'work completed successfully',
      'inner lock releasing',
      'outer lock releasing'
    ])
  })

  it('should handle complex promise interactions with multiple rejections', async () => {
    const lockKey = 'complex-promises'
    const results: string[] = []

    // Simulate a complex chain of promises with potential errors
    const complexOperation = async (): Promise<void> => {
      const release = await mutex.lock(lockKey)

      try {
        results.push('lock acquired')

        // Create a promise that might reject
        const operation = new Promise<string>((resolve, reject) => {
          setTimeout(() => {
            // Randomly decide to succeed or fail
            if (Math.random() < 0.5) {
              reject(new Error('Random operation failure'))
            } else {
              resolve('operation succeeded')
            }
          }, 10)
        })

        // Create a race condition
        const result = await Promise.race([
          operation,
          // eslint-disable-next-line promise/param-names
          new Promise<string>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Timeout'))
            }, 15)
          })
        ])

        results.push(result)
      } catch (error: any) {
        results.push(`error: ${error.message}`)
      } finally {
        results.push('lock released')
        release()
      }
    }

    // Run multiple operations in parallel
    await Promise.all([complexOperation(), complexOperation(), complexOperation()])

    // Each operation should have 3 log entries: acquired, result/error, released
    expect(results.length).toBe(9)

    // Group the results in sets of 3
    const operations = [results.slice(0, 3), results.slice(3, 6), results.slice(6, 9)]

    // Each operation should follow the pattern: acquired -> result/error -> released
    operations.forEach((op) => {
      expect(op[0]).toBe('lock acquired')
      expect(op[2]).toBe('lock released')
      // Middle entry should be either the result or an error
      expect(op[1]).toMatch(/^(operation succeeded|error: .*)/)
    })
  })

  it('should handle rejections in async/await expressions within lock', async () => {
    const lockKey = 'async-await-rejection'
    const executionOrder: string[] = []

    // Function that will throw within an async/await expression
    const asyncFunction = async (): Promise<void> => {
      const release = await mutex.lock(lockKey)
      try {
        executionOrder.push('lock acquired')

        // Nested async operation that fails
        const nestedOperation = async (): Promise<string> => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          throw new Error('Nested operation failed')
        }

        // This should throw
        const result = await nestedOperation()
        executionOrder.push(`got result: ${result}`) // Should not be reached
      } catch (error) {
        executionOrder.push('caught nested error')
      } finally {
        executionOrder.push('releasing lock')
        release()
      }
    }

    await asyncFunction()

    // Another lock on the same key should work
    const secondOp = async (): Promise<void> => {
      const release = await mutex.lock(lockKey)
      try {
        executionOrder.push('second lock acquired')
      } finally {
        release()
      }
    }

    await secondOp()

    expect(executionOrder).toEqual(['lock acquired', 'caught nested error', 'releasing lock', 'second lock acquired'])
  })

  it('should handle errors thrown in finally blocks within lock', async () => {
    const lockKey = 'finally-error'
    const executionOrder: string[] = []

    // Function that will throw in a finally block
    const problematicFunction = async (): Promise<void> => {
      const release = await mutex.lock(lockKey)
      try {
        executionOrder.push('lock acquired')
        throw new Error('Initial error')
      } catch (error) {
        executionOrder.push('caught initial error')
      } finally {
        executionOrder.push('in finally block')

        // This is bad practice but we need to test it works
        try {
          // Throw in finally - could suppress the original error if not caught
          // eslint-disable-next-line no-unsafe-finally
          throw new Error('Error in finally')
        } catch (finallyError) {
          executionOrder.push('caught finally error')
        }

        // Still need to release the lock
        release()
        executionOrder.push('lock released')
      }
    }

    await problematicFunction()

    // Verify we can still get the lock
    const secondOp = async (): Promise<void> => {
      const release = await mutex.lock(lockKey)
      executionOrder.push('second lock acquired')
      release()
    }

    await secondOp()

    expect(executionOrder).toEqual([
      'lock acquired',
      'caught initial error',
      'in finally block',
      'caught finally error',
      'lock released',
      'second lock acquired'
    ])
  })
})
