//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { TimeRateLimiter } from '../utils'

describe('TimeRateLimiter', () => {
  it('should limit rate of executions', async () => {
    jest.useFakeTimers()
    const limiter = new TimeRateLimiter(2, 1000) // 2 executions per second
    const mockFn = jest.fn().mockResolvedValue('result')
    const operations: Promise<string>[] = []

    // Try to execute 4 operations
    for (let i = 0; i < 4; i++) {
      operations.push(limiter.exec(mockFn))
    }

    // First 2 should execute immediately
    expect(mockFn).toHaveBeenCalledTimes(2)

    // Advance time by 1 second
    jest.advanceTimersByTime(1001)
    await Promise.resolve()

    // Next 2 should execute after time advance
    expect(mockFn).toHaveBeenCalledTimes(4)

    await Promise.all(operations)
  })

  it('should cleanup old executions', async () => {
    jest.useFakeTimers()
    const limiter = new TimeRateLimiter(2, 1000)
    const mockFn = jest.fn().mockResolvedValue('result')

    // Execute first operation
    await limiter.exec(mockFn)
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(limiter.executions.length).toBe(1)

    // Advance time past period
    jest.advanceTimersByTime(1001)

    // Execute another operation
    await limiter.exec(mockFn)
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(limiter.executions.length).toBe(1) // Old execution should be cleaned up
  })

  it('should handle concurrent operations', async () => {
    jest.useFakeTimers()
    const limiter = new TimeRateLimiter(2, 1000)
    const mockFn = jest.fn().mockImplementation(async () => {
      console.log('start#')
      await new Promise((resolve) => setTimeout(resolve, 450))
      console.log('finished#')
      return 'result'
    })

    const operations = Promise.all([limiter.exec(mockFn), limiter.exec(mockFn), limiter.exec(mockFn)])

    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(limiter.processingQueue.size).toBe(2)

    jest.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()
    jest.advanceTimersByTime(1000)
    await Promise.resolve()

    jest.advanceTimersByTime(2001)
    await Promise.resolve()
    await Promise.resolve()

    expect(limiter.processingQueue.size).toBe(0)

    expect(mockFn).toHaveBeenCalledTimes(3)

    await operations
  })

  it('should wait for processing to complete', async () => {
    jest.useFakeTimers()
    const limiter = new TimeRateLimiter(2, 1000)
    const mockFn = jest.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return 'result'
    })

    const operation = limiter.exec(mockFn)
    const waitPromise = limiter.waitProcessing().then(() => {
      console.log('wait complete')
    })

    expect(limiter.processingQueue.size).toBe(1)

    jest.advanceTimersByTime(1001)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    await waitPromise
    await operation
    expect(limiter.processingQueue.size).toBe(0)
  })
})
