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
  describe('constructor', () => {
    it('should initialize with correct rate and period', () => {
      const limiter = new TimeRateLimiter(5, 2000)
      expect(limiter.rate).toBe(5)
      expect(limiter.period).toBe(2000)
      expect(limiter.active).toBe(0)
      expect(limiter.executions).toEqual([])
    })

    it('should use default period of 1000ms', () => {
      const limiter = new TimeRateLimiter(3)
      expect(limiter.period).toBe(1000)
    })
  })

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
    jest.useRealTimers()
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
    jest.useRealTimers()
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
    expect(limiter.active).toBe(2)

    jest.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()
    jest.advanceTimersByTime(1000)
    await Promise.resolve()

    jest.advanceTimersByTime(2001)
    await Promise.resolve()
    await Promise.resolve()

    expect(limiter.active).toBe(0)

    expect(mockFn).toHaveBeenCalledTimes(3)

    await operations
    jest.useRealTimers()
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

    expect(limiter.active).toBe(1)

    jest.advanceTimersByTime(1001)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    await waitPromise
    await operation
    expect(limiter.active).toBe(0)
    jest.useRealTimers()
  })

  describe('execution tracking', () => {
    it('should track running executions correctly', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(3, 1000)
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return 'result'
      })

      const op1 = limiter.exec(mockFn)
      expect(limiter.executions.length).toBe(1)
      expect(limiter.executions[0].running).toBe(true)

      const op2 = limiter.exec(mockFn)
      expect(limiter.executions.length).toBe(2)

      jest.advanceTimersByTime(101)
      await Promise.resolve()
      await Promise.resolve()

      await op1
      expect(limiter.executions[0].running).toBe(false)

      await op2
      jest.useRealTimers()
    })

    it('should mark executions as not running after completion', async () => {
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'result'
      })

      await limiter.exec(mockFn)

      const execution = limiter.executions[0]
      expect(execution.running).toBe(false)
    })

    it('should mark executions as not running even on error', async () => {
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'))

      await expect(limiter.exec(mockFn)).rejects.toThrow('test error')

      const execution = limiter.executions[0]
      expect(execution.running).toBe(false)
    })
  })

  describe('cleanup behavior', () => {
    it('should cleanup executions older than period', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(3, 1000)
      const mockFn = jest.fn().mockResolvedValue('result')

      await limiter.exec(mockFn)
      expect(limiter.executions.length).toBe(1)

      jest.advanceTimersByTime(1100)

      await limiter.exec(mockFn)
      // After cleanup, only the new execution should remain
      expect(limiter.executions.length).toBe(1)
      jest.useRealTimers()
    })

    it('should keep running executions regardless of time', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(2, 1000)
      let resolveOp: any
      const mockFn = jest.fn().mockImplementation(
        async () =>
          await new Promise((resolve) => {
            resolveOp = resolve
          })
      )

      const op = limiter.exec(mockFn)
      expect(limiter.executions.length).toBe(1)

      jest.advanceTimersByTime(2000)

      // Start another operation to trigger cleanup
      const mockFn2 = jest.fn().mockResolvedValue('result')
      await limiter.exec(mockFn2)

      // The first operation should still be tracked because it's running
      const runningExecution = limiter.executions.find((e) => e.running)
      expect(runningExecution).toBeDefined()

      resolveOp('done')
      await op
      jest.useRealTimers()
    })
  })

  describe('rate limiting behavior', () => {
    it('should allow executions up to rate within period', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(3, 1000)
      const mockFn = jest.fn().mockResolvedValue('result')

      const ops = [limiter.exec(mockFn), limiter.exec(mockFn), limiter.exec(mockFn)]

      expect(mockFn).toHaveBeenCalledTimes(3)
      await Promise.all(ops)
      jest.useRealTimers()
    })

    it('should delay 4th execution when rate is 3', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(3, 1000)
      const mockFn = jest.fn().mockResolvedValue('result')

      void limiter.exec(mockFn)
      void limiter.exec(mockFn)
      void limiter.exec(mockFn)
      const fourthOp = limiter.exec(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(3)

      jest.advanceTimersByTime(1001)
      await Promise.resolve()
      await Promise.resolve()

      await fourthOp
      expect(mockFn).toHaveBeenCalledTimes(4)
      jest.useRealTimers()
    })

    it('should respect period for rate limiting', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(2, 2000) // 2 per 2 seconds
      const mockFn = jest.fn().mockResolvedValue('result')

      void limiter.exec(mockFn)
      void limiter.exec(mockFn)
      const thirdOp = limiter.exec(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(2)

      // 1 second should not be enough
      jest.advanceTimersByTime(1001)
      await Promise.resolve()
      expect(mockFn).toHaveBeenCalledTimes(2)

      // 2 seconds should allow the third
      jest.advanceTimersByTime(1001)
      await Promise.resolve()
      await Promise.resolve()

      await thirdOp
      expect(mockFn).toHaveBeenCalledTimes(3)
      jest.useRealTimers()
    })
  })

  describe('error handling', () => {
    it('should handle operation errors and continue', async () => {
      const limiter = new TimeRateLimiter(2, 1000)
      const errorFn = jest.fn().mockRejectedValue(new Error('operation error'))
      const successFn = jest.fn().mockResolvedValue('success')

      await expect(limiter.exec(errorFn)).rejects.toThrow('operation error')
      expect(limiter.active).toBe(0)

      const result = await limiter.exec(successFn)
      expect(result).toBe('success')
    })

    it('should decrement active counter on error', async () => {
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'))

      expect(limiter.active).toBe(0)
      await expect(limiter.exec(mockFn)).rejects.toThrow('test error')
      expect(limiter.active).toBe(0)
    })

    it('should handle synchronous throws', async () => {
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockImplementation(() => {
        throw new Error('sync error')
      })

      await expect(limiter.exec(mockFn)).rejects.toThrow('sync error')
      expect(limiter.active).toBe(0)
    })
  })

  describe('waitProcessing', () => {
    it('should resolve immediately when no operations are active', async () => {
      const limiter = new TimeRateLimiter(2, 1000)

      await limiter.waitProcessing()
      expect(limiter.active).toBe(0)
    })

    it('should wait for all active operations to complete', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(2, 1000)
      let completed = false
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        completed = true
        return 'result'
      })

      void limiter.exec(mockFn)
      expect(limiter.active).toBe(1)

      const waitPromise = limiter.waitProcessing()

      jest.advanceTimersByTime(101)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      await waitPromise
      expect(completed).toBe(true)
      expect(limiter.active).toBe(0)
      jest.useRealTimers()
    })
  })

  describe('arguments passing', () => {
    it('should pass arguments to operation', async () => {
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockImplementation(async (args?: any) => {
        return args?.value
      })

      const result = await limiter.exec(mockFn, { value: 42 })

      expect(result).toBe(42)
      expect(mockFn).toHaveBeenCalledWith({ value: 42 })
    })

    it('should handle operations without arguments', async () => {
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockResolvedValue('no-args')

      const result = await limiter.exec(mockFn)

      expect(result).toBe('no-args')
      expect(mockFn).toHaveBeenCalledWith(undefined)
    })
  })

  describe('edge cases', () => {
    it('should handle rate of 1 correctly', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(1, 1000)
      const mockFn = jest.fn().mockResolvedValue('result')

      void limiter.exec(mockFn)
      expect(mockFn).toHaveBeenCalledTimes(1)

      const secondOp = limiter.exec(mockFn)
      expect(mockFn).toHaveBeenCalledTimes(1) // Should wait

      jest.advanceTimersByTime(1001)
      await Promise.resolve()
      await Promise.resolve()

      await secondOp
      expect(mockFn).toHaveBeenCalledTimes(2)
      jest.useRealTimers()
    })

    it('should handle very short period', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(2, 10) // 2 per 10ms
      const mockFn = jest.fn().mockResolvedValue('result')

      void limiter.exec(mockFn)
      void limiter.exec(mockFn)
      const thirdOp = limiter.exec(mockFn)

      jest.advanceTimersByTime(11)
      await Promise.resolve()

      await thirdOp
      expect(mockFn).toHaveBeenCalledTimes(3)
      jest.useRealTimers()
    })

    it('should handle large rate', async () => {
      const limiter = new TimeRateLimiter(100, 1000)
      const mockFn = jest.fn().mockResolvedValue('result')

      const operations = Array(50)
        .fill(0)
        .map(() => limiter.exec(mockFn))

      await Promise.all(operations)
      expect(mockFn).toHaveBeenCalledTimes(50)
    })
  })

  describe('stress test', () => {
    it('should handle many operations correctly', async () => {
      const limiter = new TimeRateLimiter(10, 100)
      const results: number[] = []

      const mockFn = jest.fn().mockImplementation(async (args?: any) => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        results.push(args?.id)
        return args?.id
      })

      const operations = Array(30)
        .fill(0)
        .map((_, i) => limiter.exec(mockFn, { id: i }))

      await Promise.all(operations)

      expect(mockFn).toHaveBeenCalledTimes(30)
      expect(results).toHaveLength(30)
      expect(limiter.active).toBe(0)
    })
  })
})
