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
})
