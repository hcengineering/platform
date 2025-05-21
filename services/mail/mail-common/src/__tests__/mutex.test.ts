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
})
