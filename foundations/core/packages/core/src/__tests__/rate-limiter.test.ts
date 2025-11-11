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

import { RateLimiter } from '../utils'

describe('RateLimiter', () => {
  describe('constructor', () => {
    it('should create limiter with specified rate', () => {
      const limiter = new RateLimiter(5)
      expect(limiter.rate).toBe(5)
      expect(limiter.idCounter).toBe(0)
      expect(limiter.processingQueue.size).toBe(0)
    })

    it('should handle rate of 1', () => {
      const limiter = new RateLimiter(1)
      expect(limiter.rate).toBe(1)
    })

    it('should handle large rates', () => {
      const limiter = new RateLimiter(1000)
      expect(limiter.rate).toBe(1000)
    })
  })

  describe('exec', () => {
    it('should execute single operation immediately', async () => {
      const limiter = new RateLimiter(1)
      const mockFn = jest.fn().mockResolvedValue('result')

      const result = await limiter.exec(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result).toBe('result')
      expect(limiter.processingQueue.size).toBe(0)
    })

    it('should execute operations up to rate limit concurrently', async () => {
      const limiter = new RateLimiter(3)
      let runningCount = 0
      let maxRunning = 0

      const mockFn = jest.fn().mockImplementation(async () => {
        runningCount++
        maxRunning = Math.max(maxRunning, runningCount)
        await new Promise((resolve) => setTimeout(resolve, 10))
        runningCount--
        return 'result'
      })

      const operations = [
        limiter.exec(mockFn),
        limiter.exec(mockFn),
        limiter.exec(mockFn),
        limiter.exec(mockFn),
        limiter.exec(mockFn)
      ]

      await Promise.all(operations)

      expect(mockFn).toHaveBeenCalledTimes(5)
      expect(maxRunning).toBeLessThanOrEqual(3)
    })

    it('should queue operations beyond rate limit', async () => {
      const limiter = new RateLimiter(2)
      const order: number[] = []

      const createOperation = (id: number) => async () => {
        order.push(id)
        await new Promise((resolve) => setTimeout(resolve, 10))
        return id
      }

      const operations = [
        limiter.exec(createOperation(1)),
        limiter.exec(createOperation(2)),
        limiter.exec(createOperation(3)),
        limiter.exec(createOperation(4))
      ]

      await Promise.all(operations)

      expect(order).toEqual([1, 2, 3, 4])
    })

    it('should handle operation errors correctly', async () => {
      const limiter = new RateLimiter(2)
      const mockFn = jest.fn().mockRejectedValue(new Error('Operation failed'))

      await expect(limiter.exec(mockFn)).rejects.toThrow('Operation failed')
      expect(limiter.processingQueue.size).toBe(0)
    })

    it('should continue processing after error', async () => {
      const limiter = new RateLimiter(1)
      const successFn = jest.fn().mockResolvedValue('success')
      const errorFn = jest.fn().mockRejectedValue(new Error('error'))

      await expect(limiter.exec(errorFn)).rejects.toThrow('error')
      const result = await limiter.exec(successFn)

      expect(result).toBe('success')
      expect(successFn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to operations', async () => {
      const limiter = new RateLimiter(1)
      const mockFn = jest.fn().mockImplementation(async (args?: any) => {
        return args?.value
      })

      const result = await limiter.exec(mockFn, { value: 42 })

      expect(result).toBe(42)
      expect(mockFn).toHaveBeenCalledWith({ value: 42 })
    })

    it('should handle operations without arguments', async () => {
      const limiter = new RateLimiter(1)
      const mockFn = jest.fn().mockResolvedValue('no-args')

      const result = await limiter.exec(mockFn)

      expect(result).toBe('no-args')
      expect(mockFn).toHaveBeenCalledWith(undefined)
    })

    it('should increment idCounter for each operation', async () => {
      const limiter = new RateLimiter(10)
      const mockFn = jest.fn().mockResolvedValue('result')

      await limiter.exec(mockFn)
      expect(limiter.idCounter).toBe(1)

      await limiter.exec(mockFn)
      expect(limiter.idCounter).toBe(2)

      await limiter.exec(mockFn)
      expect(limiter.idCounter).toBe(3)
    })

    it('should notify waiting operations when slots become available', async () => {
      const limiter = new RateLimiter(1)
      const order: string[] = []

      const op1 = async (): Promise<string> => {
        order.push('op1-start')
        await new Promise((resolve) => setTimeout(resolve, 20))
        order.push('op1-end')
        return 'op1'
      }

      const op2 = async (): Promise<string> => {
        order.push('op2-start')
        await new Promise((resolve) => setTimeout(resolve, 10))
        order.push('op2-end')
        return 'op2'
      }

      const results = await Promise.all([limiter.exec(op1), limiter.exec(op2)])

      expect(results).toEqual(['op1', 'op2'])
      expect(order).toEqual(['op1-start', 'op1-end', 'op2-start', 'op2-end'])
    })

    it('should handle rapid sequential operations', async () => {
      const limiter = new RateLimiter(2)
      const mockFn = jest.fn().mockResolvedValue('result')
      const results = []

      for (let i = 0; i < 10; i++) {
        results.push(limiter.exec(mockFn))
      }

      await Promise.all(results)
      expect(mockFn).toHaveBeenCalledTimes(10)
    })

    it('should clean up processingQueue after completion', async () => {
      const limiter = new RateLimiter(5)
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return 'result'
      })

      const operations = Array(5)
        .fill(0)
        .map(() => limiter.exec(mockFn))

      await Promise.all(operations)
      expect(limiter.processingQueue.size).toBe(0)
    })
  })

  describe('add', () => {
    it('should add operation without waiting for result', async () => {
      const limiter = new RateLimiter(1)
      let executed = false
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        executed = true
        return 'result'
      })

      await limiter.add(mockFn)

      // add returns immediately, but operation may not be complete
      expect(mockFn).toHaveBeenCalledTimes(1)

      // Wait for operation to complete
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(executed).toBe(true)
    })

    it('should handle errors with error handler', async () => {
      const limiter = new RateLimiter(1)
      const errorHandler = jest.fn()
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'))

      await limiter.add(mockFn, undefined, errorHandler)

      // Wait for operation to execute
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(errorHandler).toHaveBeenCalledWith(new Error('test error'))
    })

    it('should log errors when no error handler provided', async () => {
      const limiter = new RateLimiter(1)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'))

      await limiter.add(mockFn)

      // Wait for operation to execute
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should pass arguments to operation', async () => {
      const limiter = new RateLimiter(1)
      const mockFn = jest.fn().mockResolvedValue('result')

      await limiter.add(mockFn, { test: 'value' })

      // Wait for operation to start
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockFn).toHaveBeenCalledWith({ test: 'value' })
    })

    it('should queue multiple add operations', async () => {
      const limiter = new RateLimiter(1)
      const order: number[] = []

      const createOp = (id: number) => async () => {
        order.push(id)
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      await limiter.add(createOp(1))
      await limiter.add(createOp(2))
      await limiter.add(createOp(3))

      // Wait for all operations to complete
      await limiter.waitProcessing()

      expect(order).toEqual([1, 2, 3])
    })
  })

  describe('waitProcessing', () => {
    it('should wait for all operations to complete', async () => {
      const limiter = new RateLimiter(2)
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return 'result'
      })

      const operations = [limiter.exec(mockFn), limiter.exec(mockFn), limiter.exec(mockFn)]

      expect(limiter.processingQueue.size).toBeGreaterThan(0)

      await limiter.waitProcessing()

      expect(limiter.processingQueue.size).toBe(0)
      await Promise.all(operations)
    })

    it('should resolve immediately when no operations are processing', async () => {
      const limiter = new RateLimiter(1)

      await limiter.waitProcessing()

      expect(limiter.processingQueue.size).toBe(0)
    })

    it('should wait for operations added via add method', async () => {
      const limiter = new RateLimiter(1)
      let completed = false
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        completed = true
      })

      await limiter.add(mockFn)
      expect(completed).toBe(false)

      await limiter.waitProcessing()
      expect(completed).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle zero rate (should not happen but test defensively)', async () => {
      const limiter = new RateLimiter(0)
      const mockFn = jest.fn().mockResolvedValue('result')

      // This will hang forever, so we use Promise.race with timeout
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve('timeout')
        }, 100)
      })
      const result = await Promise.race([limiter.exec(mockFn), timeoutPromise])

      expect(result).toBe('timeout')
    })

    it('should handle very long running operations', async () => {
      const limiter = new RateLimiter(1)
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return 'result'
      })

      const start = Date.now()
      await limiter.exec(mockFn)
      const duration = Date.now() - start

      expect(duration).toBeGreaterThanOrEqual(50)
    })

    it('should handle mixed sync and async operations', async () => {
      const limiter = new RateLimiter(2)
      const syncOp = jest.fn().mockResolvedValue('sync')
      const asyncOp = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'async'
      })

      const results = await Promise.all([limiter.exec(syncOp), limiter.exec(asyncOp)])

      expect(results).toContain('sync')
      expect(results).toContain('async')
    })

    it('should handle operations that throw synchronously', async () => {
      const limiter = new RateLimiter(1)
      const mockFn = jest.fn().mockImplementation(() => {
        throw new Error('Sync error')
      })

      await expect(limiter.exec(mockFn)).rejects.toThrow('Sync error')
      expect(limiter.processingQueue.size).toBe(0)
    })

    it('should handle notify array correctly when multiple operations wait', async () => {
      const limiter = new RateLimiter(1)
      const order: number[] = []

      const createOp = (id: number) => async () => {
        order.push(id)
        await new Promise((resolve) => setTimeout(resolve, 10))
        return id
      }

      // Start multiple operations that will need to wait
      const operations = [
        limiter.exec(createOp(1)),
        limiter.exec(createOp(2)),
        limiter.exec(createOp(3)),
        limiter.exec(createOp(4))
      ]

      await Promise.all(operations)

      expect(order).toEqual([1, 2, 3, 4])
      expect(limiter.notify.length).toBe(0)
    })
  })

  describe('concurrent stress test', () => {
    it('should handle many concurrent operations correctly', async () => {
      const limiter = new RateLimiter(5)
      const mockFn = jest.fn().mockImplementation(async (args?: any) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))
        return args?.id
      })

      const operations = Array(50)
        .fill(0)
        .map((_, i) => limiter.exec(mockFn, { id: i }))

      const results = await Promise.all(operations)

      expect(mockFn).toHaveBeenCalledTimes(50)
      expect(results).toHaveLength(50)
      expect(limiter.processingQueue.size).toBe(0)
    })

    it('should maintain rate limit under heavy load', async () => {
      const limiter = new RateLimiter(3)
      let currentCount = 0
      let maxConcurrent = 0

      const mockFn = jest.fn().mockImplementation(async () => {
        currentCount++
        maxConcurrent = Math.max(maxConcurrent, currentCount)
        await new Promise((resolve) => setTimeout(resolve, 10))
        currentCount--
      })

      const operations = Array(20)
        .fill(0)
        .map(() => limiter.exec(mockFn))

      await Promise.all(operations)

      expect(maxConcurrent).toBeLessThanOrEqual(3)
      expect(currentCount).toBe(0)
    })
  })
})
