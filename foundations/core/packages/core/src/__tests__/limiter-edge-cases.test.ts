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

import { RateLimiter, TimeRateLimiter } from '../utils'

describe('RateLimiter and TimeRateLimiter - Advanced Edge Cases', () => {
  describe('RateLimiter - Memory and Resource Management', () => {
    it('should not leak memory in notify array', async () => {
      const limiter = new RateLimiter(1)
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'result'
      })

      // Execute multiple operations that will queue
      const operations = Array(10)
        .fill(0)
        .map(() => limiter.exec(mockFn))

      await Promise.all(operations)

      // notify array should be empty after all operations complete
      expect(limiter.notify.length).toBe(0)
    })

    it('should clean up processingQueue correctly after many operations', async () => {
      const limiter = new RateLimiter(5)
      const mockFn = jest.fn().mockImplementation(async (args?: any) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10))
        return args?.id
      })

      for (let batch = 0; batch < 5; batch++) {
        const operations = Array(20)
          .fill(0)
          .map((_, i) => limiter.exec(mockFn, { id: batch * 20 + i }))

        await Promise.all(operations)
        expect(limiter.processingQueue.size).toBe(0)
      }

      expect(mockFn).toHaveBeenCalledTimes(100)
    })

    it('should handle interleaved exec and add operations', async () => {
      const limiter = new RateLimiter(2)
      const results: string[] = []

      const execOp = async (id: string): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        results.push(id)
        return id
      }

      const addOp = async (id: string): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        results.push(id)
      }

      await Promise.all([
        limiter.exec(async () => await execOp('exec1')),
        limiter.add(async () => {
          await addOp('add1')
        }),
        limiter.exec(async () => await execOp('exec2')),
        limiter.add(async () => {
          await addOp('add2')
        })
      ])

      await limiter.waitProcessing()

      expect(results).toHaveLength(4)
      expect(results).toContain('exec1')
      expect(results).toContain('exec2')
      expect(results).toContain('add1')
      expect(results).toContain('add2')
    })

    it('should handle rapid creation and destruction of operations', async () => {
      const limiter = new RateLimiter(3)
      let successCount = 0
      let errorCount = 0

      const operations = Array(30)
        .fill(0)
        .map(async (_, i) => {
          const mockFn = jest.fn().mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5))
            if (i % 5 === 0) {
              throw new Error(`Error ${i}`)
            }
            return `Result ${i}`
          })

          try {
            await limiter.exec(mockFn)
            successCount++
          } catch (err) {
            errorCount++
          }
        })

      await Promise.all(operations)

      expect(successCount).toBe(24)
      expect(errorCount).toBe(6)
      expect(limiter.processingQueue.size).toBe(0)
    })
  })

  describe('TimeRateLimiter - Memory and Resource Management', () => {
    it('should not leak memory in notify array', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'result'
      })

      // Execute operations that will need to wait
      const operations = [limiter.exec(mockFn), limiter.exec(mockFn), limiter.exec(mockFn), limiter.exec(mockFn)]

      jest.advanceTimersByTime(20)
      await Promise.resolve()
      await Promise.resolve()

      jest.advanceTimersByTime(1001)
      await Promise.resolve()
      await Promise.resolve()

      jest.advanceTimersByTime(20)
      await Promise.resolve()
      await Promise.resolve()

      await Promise.all(operations)

      // notify array should be empty after all operations complete
      expect(limiter.notify.length).toBe(0)
      jest.useRealTimers()
    }, 10000)

    it('should not accumulate executions indefinitely', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(5, 1000)
      const mockFn = jest.fn().mockResolvedValue('result')

      // Execute many batches
      for (let batch = 0; batch < 10; batch++) {
        const operations = Array(5)
          .fill(0)
          .map(() => limiter.exec(mockFn))

        await Promise.all(operations)

        jest.advanceTimersByTime(1100)
      }

      // Executions should be cleaned up
      // Only the most recent batch should remain (or less)
      expect(limiter.executions.length).toBeLessThanOrEqual(5)
      jest.useRealTimers()
    })

    it('should handle operations that never resolve gracefully', async () => {
      const limiter = new TimeRateLimiter(2, 1000)

      const normalOp = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'result'
      })

      // Note: We can't actually test hanging operations without causing issues
      // Instead, test that slow operations don't block faster ones
      const slowOp = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return 'slow'
      })

      void limiter.exec(slowOp)
      expect(limiter.active).toBe(1)

      // Other operations should still work
      const result = await limiter.exec(normalOp)
      expect(result).toBe('result')
      expect(normalOp).toHaveBeenCalledTimes(1)
    }, 10000)
  })

  describe('RateLimiter - Boundary Conditions', () => {
    it('should handle operations that complete immediately', async () => {
      const limiter = new RateLimiter(3)
      const mockFn = jest.fn().mockResolvedValue('instant')

      const results = await Promise.all([limiter.exec(mockFn), limiter.exec(mockFn), limiter.exec(mockFn)])

      expect(results).toEqual(['instant', 'instant', 'instant'])
      expect(limiter.processingQueue.size).toBe(0)
    })

    it('should maintain correct state when operations fail at different stages', async () => {
      const limiter = new RateLimiter(2)
      const errors: string[] = []

      const operations = [
        limiter
          .exec(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            throw new Error('error1')
          })
          .catch((e) => {
            errors.push(e.message)
          }),

        limiter.exec(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return 'success1'
        }),

        limiter
          .exec(async () => {
            throw new Error('error2')
          })
          .catch((e) => {
            errors.push(e.message)
          }),

        limiter.exec(async () => {
          await new Promise((resolve) => setTimeout(resolve, 15))
          return 'success2'
        })
      ]

      const results = await Promise.all(operations)

      expect(errors).toHaveLength(2)
      expect(errors).toContain('error1')
      expect(errors).toContain('error2')
      expect(results.filter(Boolean)).toContain('success1')
      expect(results.filter(Boolean)).toContain('success2')
      expect(limiter.processingQueue.size).toBe(0)
    }, 10000)
  })

  describe('TimeRateLimiter - Boundary Conditions', () => {
    it('should handle operations completing in reverse order', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(3, 1000)
      const completionOrder: number[] = []

      const createOp = (id: number, delay: number) => async (): Promise<number> => {
        await new Promise((resolve) => setTimeout(resolve, delay))
        completionOrder.push(id)
        return id
      }

      const operations = [limiter.exec(createOp(1, 30)), limiter.exec(createOp(2, 20)), limiter.exec(createOp(3, 10))]

      jest.advanceTimersByTime(11)
      await Promise.resolve()

      jest.advanceTimersByTime(10)
      await Promise.resolve()

      jest.advanceTimersByTime(10)
      await Promise.resolve()

      await Promise.all(operations)

      // Operations should complete in reverse order of their delays
      expect(completionOrder).toEqual([3, 2, 1])
      jest.useRealTimers()
    })

    it('should handle rate limit at exact boundaries', async () => {
      jest.useFakeTimers()
      const limiter = new TimeRateLimiter(2, 1000)
      const mockFn = jest.fn().mockResolvedValue('result')

      // Execute exactly at the rate
      void limiter.exec(mockFn)
      void limiter.exec(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(limiter.active).toBe(2)

      // One more should wait
      const thirdOp = limiter.exec(mockFn)
      expect(mockFn).toHaveBeenCalledTimes(2)

      // Advance to exactly the period
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
      await Promise.resolve()

      await thirdOp
      expect(mockFn).toHaveBeenCalledTimes(3)
      jest.useRealTimers()
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle mixed RateLimiter operations with varying complexities', async () => {
      const limiter = new RateLimiter(3)
      const results: Array<string | number> = []

      const stringOp = async (val: string): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        results.push(val)
        return val
      }

      const numberOp = async (val: number): Promise<number> => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        results.push(val)
        return val
      }

      const objectOp = async (obj: { id: number }): Promise<{ id: number }> => {
        await new Promise((resolve) => setTimeout(resolve, 7))
        results.push(obj.id)
        return obj
      }

      await Promise.all([
        limiter.exec(async () => await stringOp('a')),
        limiter.exec(async () => await numberOp(1)),
        limiter.exec(async () => await objectOp({ id: 100 })),
        limiter.exec(async () => await stringOp('b')),
        limiter.exec(async () => await numberOp(2))
      ])

      expect(results).toHaveLength(5)
      expect(results).toContain('a')
      expect(results).toContain('b')
      expect(results).toContain(1)
      expect(results).toContain(2)
      expect(results).toContain(100)
    })

    it('should handle nested rate limiters', async () => {
      const outerLimiter = new RateLimiter(2)
      const innerLimiter = new RateLimiter(1)

      let executionCount = 0

      const nestedOp = async (id: number): Promise<number> => {
        return await innerLimiter.exec(async () => {
          executionCount++
          await new Promise((resolve) => setTimeout(resolve, 5))
          return id
        })
      }

      const results = await Promise.all([
        outerLimiter.exec(async () => await nestedOp(1)),
        outerLimiter.exec(async () => await nestedOp(2)),
        outerLimiter.exec(async () => await nestedOp(3)),
        outerLimiter.exec(async () => await nestedOp(4))
      ])

      expect(results).toEqual([1, 2, 3, 4])
      expect(executionCount).toBe(4)
      expect(outerLimiter.processingQueue.size).toBe(0)
      expect(innerLimiter.processingQueue.size).toBe(0)
    })
  })
})
