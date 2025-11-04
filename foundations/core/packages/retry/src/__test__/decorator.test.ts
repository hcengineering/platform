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

import { DelayStrategyFactory } from '../delay'
import { Retryable } from '../decorator'
import { type RetryOptions } from '../retry'
import { retryAllErrors } from '../retryable'

// Instead of mocking withRetry, we'll mock setTimeout to avoid waiting in tests
jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
  fn()
  return 1 as any
})

describe('Retryable decorator', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }

  // Update the mock options to use delay strategy
  const mockOptions: Partial<RetryOptions> = {
    maxRetries: 3,
    delayStrategy: DelayStrategyFactory.exponentialBackoff({
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffFactor: 2
    }),
    isRetryable: retryAllErrors,
    logger: mockLogger
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should retry failed operations', async () => {
    // Create a test class with decorated method that fails initially then succeeds
    const error = new Error('First attempt failed')
    class TestService {
      callCount = 0

      @Retryable(mockOptions)
      async testMethod (param1: string, param2: number): Promise<string> {
        this.callCount++
        if (this.callCount === 1) {
          throw error
        }
        return `${param1}-${param2}`
      }
    }

    const service = new TestService()
    const result = await service.testMethod('test', 123)

    // Check results
    expect(result).toBe('test-123')
    expect(service.callCount).toBe(2) // Called once, failed, then succeeded on retry

    // Check logs
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('testMethod failed'),
      expect.objectContaining({
        error,
        attempt: 1
      })
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('should work with default options', async () => {
    class TestService {
      callCount = 0

      @Retryable()
      async testMethod (): Promise<string> {
        this.callCount++
        if (this.callCount === 1) {
          throw new Error('network error')
        }
        return 'success'
      }
    }

    const service = new TestService()
    const result = await service.testMethod()

    expect(result).toBe('success')
    expect(service.callCount).toBe(2) // Should have retried once
  })

  it('should preserve class instance context (this)', async () => {
    class TestService {
      private counter = 0

      @Retryable(mockOptions)
      async incrementAndGet (): Promise<number> {
        if (this.counter === 0) {
          this.counter++
          throw new Error('network error')
        }
        this.counter++
        return this.counter
      }

      getCounter (): number {
        return this.counter
      }
    }

    const service = new TestService()
    const result = await service.incrementAndGet()

    // Check that the class context was preserved across retries
    expect(result).toBe(2)
    expect(service.getCounter()).toBe(2) // Incremented once per attempt
  })

  it('should throw after max retries are exhausted', async () => {
    class TestService {
      @Retryable({
        maxRetries: 2, // Only try twice total (initial + 1 retry)
        delayStrategy: DelayStrategyFactory.fixed({
          delayMs: 10
        }),
        logger: mockLogger,
        isRetryable: retryAllErrors
      })
      async alwaysFailingMethod (): Promise<string> {
        throw new Error('Persistent failure')
      }
    }

    const service = new TestService()
    await expect(service.alwaysFailingMethod()).rejects.toThrow('Persistent failure')

    // Should have tried twice in total (initial + 1 retry)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('alwaysFailingMethod failed after 2 attempts'),
      expect.any(Object)
    )
  })

  it('should handle async methods correctly', async () => {
    let resolutionCount = 0

    // Create a class with an async method that fails then resolves
    class TestService {
      @Retryable(mockOptions)
      async delayedMethod (): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
          resolutionCount++
          if (resolutionCount === 1) {
            reject(new Error('Delayed error'))
          } else {
            resolve('delayed success')
          }
        })
      }
    }

    const service = new TestService()
    const result = await service.delayedMethod()

    expect(result).toBe('delayed success')
    expect(resolutionCount).toBe(2)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
  })

  it('should retry according to the specified retry count', async () => {
    let callCount = 0

    class TestService {
      @Retryable({
        maxRetries: 5, // Should try up to 5 times total
        delayStrategy: DelayStrategyFactory.fixed({
          delayMs: 10
        }),
        logger: mockLogger,
        isRetryable: retryAllErrors
      })
      async unstableMethod (): Promise<string> {
        callCount++
        if (callCount < 4) {
          // Succeed on the 4th attempt
          throw new Error(`Failure #${callCount}`)
        }
        return 'success after retries'
      }
    }

    const service = new TestService()
    const result = await service.unstableMethod()

    expect(result).toBe('success after retries')
    expect(callCount).toBe(4) // Initial attempt + 3 retries = 4 total calls
    expect(mockLogger.warn).toHaveBeenCalledTimes(3) // Should have logged 3 warnings
  })

  it('should respect different delay strategies', async () => {
    // Override the setTimeout mock to capture delay values
    const delayValues: number[] = []
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay: number | undefined) => {
      delayValues.push(delay ?? 0)
      fn()
      return 1 as any
    })

    let callCount = 0

    class TestService {
      @Retryable({
        maxRetries: 4,
        delayStrategy: DelayStrategyFactory.exponentialBackoff({
          initialDelayMs: 100,
          maxDelayMs: 500,
          backoffFactor: 2,
          jitter: 0 // Disable jitter for predictable tests
        }),
        isRetryable: retryAllErrors
      })
      async delayingMethod (): Promise<string> {
        callCount++
        if (callCount < 4) {
          throw new Error(`Attempt ${callCount} failed`)
        }
        return 'success'
      }
    }

    const service = new TestService()
    await service.delayingMethod()

    // Should have recorded 3 delays: initial, 2x initial, 4x initial (capped at maxDelayMs)
    expect(delayValues).toHaveLength(3)
    expect(delayValues[0]).toBe(100) // initial delay
    expect(delayValues[1]).toBe(200) // 2x initial
    expect(delayValues[2]).toBe(400) // 4x initial
  })

  it('should test various delay strategies', async () => {
    // Override the setTimeout mock to capture delay values
    const delayValues: number[] = []
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay: number | undefined) => {
      delayValues.push(delay ?? 0)
      fn()
      return 1 as any
    })

    // Test Fixed strategy
    let callCount = 0
    class FixedTestService {
      @Retryable({
        maxRetries: 3,
        delayStrategy: DelayStrategyFactory.fixed({
          delayMs: 100,
          jitter: 0 // Disable jitter for predictable tests
        }),
        isRetryable: retryAllErrors
      })
      async method (): Promise<string> {
        callCount++
        if (callCount < 3) {
          throw new Error(`Attempt ${callCount} failed`)
        }
        return 'success'
      }
    }

    delayValues.length = 0 // Reset captured delays
    await new FixedTestService().method()
    expect(delayValues).toEqual([100, 100]) // Should be constant

    // Test Fibonacci strategy
    callCount = 0
    class FibonacciTestService {
      @Retryable({
        maxRetries: 4,
        delayStrategy: DelayStrategyFactory.fibonacci({
          baseDelayMs: 100,
          maxDelayMs: 1000,
          jitter: 0 // Disable jitter for predictable tests
        }),
        isRetryable: retryAllErrors
      })
      async method (): Promise<string> {
        callCount++
        if (callCount < 4) {
          throw new Error(`Attempt ${callCount} failed`)
        }
        return 'success'
      }
    }

    delayValues.length = 0 // Reset captured delays
    await new FibonacciTestService().method()
    // Fibonacci sequence delay pattern
    expect(delayValues).toEqual([100, 200, 300]) // fib(2)=1, fib(3)=2, fib(4)=3 multiplied by baseDelayMs
  })

  it('should handle methods returning non-promises', async () => {
    let callCount = 0

    class TestService {
      @Retryable(mockOptions)
      nonAsyncMethod (input: string): string {
        callCount++
        if (callCount === 1) {
          throw new Error('Sync error')
        }
        return `processed-${input}`
      }
    }

    const service = new TestService()
    // Even though the original method is not async, the decorated method returns a Promise
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const result = await service.nonAsyncMethod('test')

    expect(result).toBe('processed-test')
    expect(callCount).toBe(2) // Should have retried once
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
  })

  it('should handle static methods', async () => {
    let callCount = 0

    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class TestService {
      @Retryable(mockOptions)
      static async staticMethod (input: string): Promise<string> {
        callCount++
        if (callCount === 1) {
          throw new Error('Static method error')
        }
        return `static-${input}`
      }
    }

    const result = await TestService.staticMethod('test')

    expect(result).toBe('static-test')
    expect(callCount).toBe(2) // Should have retried once
  })

  it('should respect isRetryable option', async () => {
    class TestService {
      callCount = 0

      @Retryable({
        maxRetries: 3,
        delayStrategy: DelayStrategyFactory.fixed({ delayMs: 10 }),
        logger: mockLogger,
        isRetryable: (err) => {
          // Only retry errors with "retry" in the message
          return err instanceof Error && err.message.includes('Please retry')
        }
      })
      async conditionalRetryMethod (): Promise<string> {
        this.callCount++
        if (this.callCount === 1) {
          throw new Error('Please retry this') // should be retried
        }
        if (this.callCount === 2) {
          throw new Error('Do not retry this') // should not be retried
        }
        return 'success'
      }
    }

    const service = new TestService()
    // Should fail with the second error since it won't be retried
    await expect(service.conditionalRetryMethod()).rejects.toThrow('Do not retry this')

    expect(service.callCount).toBe(2) // Should have called twice (original + 1 retry)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1) // Only first error logged as warning
    expect(mockLogger.error).toHaveBeenCalledTimes(1) // Second error logged as error
  })
})
