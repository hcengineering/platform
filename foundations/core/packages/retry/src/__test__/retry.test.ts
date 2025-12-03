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
import { withRetry, createRetryableFunction, type RetryOptions } from '../retry'
import { type IsRetryable, retryAllErrors } from '../retryable'

// Mock the sleep function to speed up tests
jest.mock('../delay', () => {
  const originalModule = jest.requireActual('../delay')
  return {
    ...originalModule,
    // Override the internal sleep function to resolve immediately
    sleep: jest.fn().mockImplementation(() => Promise.resolve())
  }
})

describe('withRetry', () => {
  // Create a mock logger to capture logs
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }

  // Use the new delayStrategy option
  const mockOptions: Partial<RetryOptions> = {
    maxRetries: 3,
    delayStrategy: DelayStrategyFactory.exponentialBackoff({
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffFactor: 2,
      jitter: 0
    }),
    logger: mockLogger,
    isRetryable: retryAllErrors
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return the result when operation succeeds on first try', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success')

    const result = await withRetry(mockOperation, mockOptions)

    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn).not.toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('should retry when operation fails and eventually succeed', async () => {
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockRejectedValueOnce(new Error('second failure'))
      .mockResolvedValueOnce('success after retries')

    const result = await withRetry(mockOperation, mockOptions)

    expect(result).toBe('success after retries')
    expect(mockOperation).toHaveBeenCalledTimes(3)
    expect(mockLogger.warn).toHaveBeenCalledTimes(2)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('should throw an error after maximum retries are exhausted', async () => {
    const mockError = new Error('persistent failure')
    const mockOperation = jest.fn().mockRejectedValue(mockError)

    await expect(withRetry(mockOperation, mockOptions)).rejects.toThrow('persistent failure')

    expect(mockOperation).toHaveBeenCalledTimes(mockOptions.maxRetries ?? -1)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
  })

  it('should use default options when none are provided', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success')

    const result = await withRetry(mockOperation)

    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalledTimes(1)
  })

  it('should use provided operation name in log messages', async () => {
    const mockOperation = jest.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValueOnce('success')

    await withRetry(mockOperation, mockOptions, 'custom-operation')

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('custom-operation failed'), expect.any(Object))
  })

  it('should apply jitter to delay calculation', async () => {
    const mockOperation = jest.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValueOnce('success')

    // Use Math.random mock to make jitter predictable
    const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5)

    // Create options with jitter enabled
    const jitterOptions = {
      ...mockOptions,
      delayStrategy: DelayStrategyFactory.exponentialBackoff({
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffFactor: 2,
        jitter: 0.2
      })
    }

    await withRetry(mockOperation, jitterOptions)

    // With Math.random = 0.5, jitter should be 0
    // (since 0.5 * 2 - 1 = 0)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ delayMs: 10 }) // Should still be the initial delay
    )

    mockRandom.mockRestore()
  })

  it('should respect maximum delay', async () => {
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockRejectedValueOnce(new Error('failure 3'))
      .mockResolvedValueOnce('success')

    // Use high backoff factor to test maximum delay cap
    const maxDelayOptions = {
      maxRetries: 4,
      delayStrategy: DelayStrategyFactory.exponentialBackoff({
        initialDelayMs: 50,
        maxDelayMs: 1000,
        backoffFactor: 10 // Would normally go 50 -> 500 -> 5000, but should cap at 1000
      }),
      isRetryable: retryAllErrors,
      logger: mockLogger
    }

    await withRetry(mockOperation, maxDelayOptions)

    // Check that delays are correctly calculated and capped
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ delayMs: expect.any(Number) })
    )

    // Second retry delay
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ delayMs: 500 }) // 50 * 10 = 500
    )

    // Third retry delay (should be capped)
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      3,
      expect.any(String),
      expect.objectContaining({ delayMs: 1000 }) // 500 * 10 = 5000, capped at 1000
    )

    // Function should have been called 4 times total
    expect(mockOperation).toHaveBeenCalledTimes(4)
  })

  it('should work with different delay strategies', async () => {
    // Test with fixed delay
    const fixedDelayOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockResolvedValueOnce('success')

    const fixedDelayOptions = {
      maxRetries: 3,
      delayStrategy: DelayStrategyFactory.fixed({
        delayMs: 200,
        jitter: 0
      }),
      isRetryable: retryAllErrors,
      logger: mockLogger
    }

    await withRetry(fixedDelayOperation, fixedDelayOptions)

    // Both retries should have the same delay
    expect(mockLogger.warn).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ delayMs: 200 }))
    expect(mockLogger.warn).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ delayMs: 200 }))

    // Clear mocks for next test
    jest.clearAllMocks()

    // Test with Fibonacci delay
    const fibonacciDelayOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockResolvedValueOnce('success')

    const fibonacciDelayOptions = {
      maxRetries: 3,
      delayStrategy: DelayStrategyFactory.fibonacci({
        baseDelayMs: 100,
        maxDelayMs: 10000,
        jitter: 0
      }),
      isRetryable: retryAllErrors,
      logger: mockLogger
    }

    await withRetry(fibonacciDelayOperation, fibonacciDelayOptions)

    // Delays should follow Fibonacci sequence
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ delayMs: 100 }) // fib(2) = 1 * 100
    )
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ delayMs: 200 }) // fib(3) = 2 * 100
    )
  })
})

describe('createRetryableFunction', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }

  const mockOptions: Partial<RetryOptions> = {
    maxRetries: 2,
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

  it('should create a function that applies retry logic', async () => {
    const mockFn = jest.fn().mockRejectedValueOnce(new Error('first failure')).mockResolvedValueOnce('success')

    const retryableFn = createRetryableFunction(mockFn, mockOptions)

    const result = await retryableFn('arg1', 123)

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).toHaveBeenCalledWith('arg1', 123)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
  })

  it('should pass through function parameters correctly', async () => {
    const mockFn = jest.fn().mockResolvedValue('success')

    const retryableFn = createRetryableFunction(mockFn, mockOptions)

    await retryableFn('arg1', 123, { complex: true })

    expect(mockFn).toHaveBeenCalledWith('arg1', 123, { complex: true })
  })

  it('should use custom operation name in logs', async () => {
    const mockFn = jest.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValueOnce('success')

    const retryableFn = createRetryableFunction(mockFn, mockOptions, 'custom-function')

    await retryableFn()

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('custom-function failed'), expect.any(Object))
  })

  it('should propagate the final error if all retries fail', async () => {
    const mockError = new Error('network error')
    const mockFn = jest.fn().mockRejectedValue(mockError)

    const retryableFn = createRetryableFunction(mockFn, mockOptions)

    await expect(retryableFn()).rejects.toThrow('network error')

    expect(mockOptions.maxRetries).toBeDefined()
    expect(mockFn).toHaveBeenCalledTimes(mockOptions.maxRetries ?? -1)
  })
})

// Test with a decorated class
describe('Using retry in class methods', () => {
  class TestService {
    counter = 0

    async unstableFunction (): Promise<string> {
      this.counter++
      if (this.counter < 3) {
        throw new Error(`network error ${this.counter}`)
      }
      return 'success'
    }
  }

  it('should work with instance methods', async () => {
    const service = new TestService()

    // Create a retryable version of the method that's bound to the service
    const retryableMethod = createRetryableFunction(service.unstableFunction.bind(service), {
      maxRetries: 3,
      delayStrategy: DelayStrategyFactory.fixed({
        delayMs: 10
      })
    })

    const result = await retryableMethod()

    expect(result).toBe('success')
    expect(service.counter).toBe(3)
  })
})

describe('withRetry with isRetryable option', () => {
  // Create a mock logger to capture logs
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock the sleep function to speed up tests
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn()
      return 1 as any
    })
  })

  it('should retry errors that are marked as retriable', async () => {
    // Custom isRetryable function that only retries certain errors
    const customRetriable: IsRetryable = (err: any) => {
      return err.message.includes('retriable')
    }

    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('This is a retriable error'))
      .mockRejectedValueOnce(new Error('This is a retriable error again'))
      .mockResolvedValueOnce('success')

    const result = await withRetry(mockOperation, {
      maxRetries: 5,
      logger: mockLogger,
      delayStrategy: DelayStrategyFactory.fixed({
        delayMs: 10
      }),
      isRetryable: customRetriable
    })

    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalledTimes(3)
    expect(mockLogger.warn).toHaveBeenCalledTimes(2)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('should not retry errors that are not marked as retriable', async () => {
    // Custom isRetryable function that never retries
    const neverRetry: IsRetryable = (_err: any) => {
      return false
    }

    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('This error should not be retried'))
      .mockResolvedValueOnce('success')

    await expect(
      withRetry(mockOperation, {
        maxRetries: 5,
        logger: mockLogger,
        delayStrategy: DelayStrategyFactory.fixed({
          delayMs: 10
        }),
        isRetryable: neverRetry
      })
    ).rejects.toThrow('This error should not be retried')

    expect(mockOperation).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('failed with non-retriable error'),
      expect.any(Object)
    )
  })

  it('should have different behavior for different error types', async () => {
    // Custom isRetryable function that retries only NetworkErrors
    const retryOnlyNetworkErrors: IsRetryable = (err: any) => {
      return err.name === 'NetworkError'
    }

    // Create different error types
    const networkError = new Error('Network failed')
    networkError.name = 'NetworkError'

    const validationError = new Error('Validation failed')
    validationError.name = 'ValidationError'

    // First test with network error - should be retried
    const mockNetworkOp = jest.fn().mockRejectedValueOnce(networkError).mockResolvedValueOnce('network success')

    const result1 = await withRetry(mockNetworkOp, {
      maxRetries: 3,
      logger: mockLogger,
      delayStrategy: DelayStrategyFactory.fixed({
        delayMs: 10
      }),
      isRetryable: retryOnlyNetworkErrors
    })

    expect(result1).toBe('network success')
    expect(mockNetworkOp).toHaveBeenCalledTimes(2)

    // Reset mocks
    jest.clearAllMocks()

    // Then test with validation error - should not be retried
    const mockValidationOp = jest.fn().mockRejectedValueOnce(validationError)

    await expect(
      withRetry(mockValidationOp, {
        maxRetries: 3,
        logger: mockLogger,
        delayStrategy: DelayStrategyFactory.fixed({
          delayMs: 10
        }),
        isRetryable: retryOnlyNetworkErrors
      })
    ).rejects.toThrow('Validation failed')

    expect(mockValidationOp).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('non-retriable error'), expect.any(Object))
  })

  it('should use the default retryNetworkErrors if isRetryable is not provided', async () => {
    // All errors should be retried by default
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('unreachable'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce('success')

    const result = await withRetry(mockOperation, {
      maxRetries: 5,
      logger: mockLogger,
      delayStrategy: DelayStrategyFactory.fixed({
        delayMs: 10
      })
      // isRetryable not provided, should use default
    })

    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalledTimes(3)
    expect(mockLogger.warn).toHaveBeenCalledTimes(2)
  })

  it('should pass the error to isRetryable function', async () => {
    // Mock isRetryable function to track calls
    const mockisRetryable = jest.fn().mockReturnValue(true)

    const testError = new Error('test error')
    const mockOperation = jest.fn().mockRejectedValueOnce(testError).mockResolvedValueOnce('success')

    await withRetry(mockOperation, {
      maxRetries: 3,
      logger: mockLogger,
      delayStrategy: DelayStrategyFactory.fixed({
        delayMs: 10
      }),
      isRetryable: mockisRetryable
    })

    // Verify isRetryable was called with the actual error
    expect(mockisRetryable).toHaveBeenCalledTimes(1)
    expect(mockisRetryable).toHaveBeenCalledWith(testError)
  })
})

describe('createRetryableFunction with isRetryable', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock the sleep function to speed up tests
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn()
      return 1 as any
    })
  })

  it('should respect isRetryable when applied to a function', async () => {
    // Function to wrap
    const unstableFunction = jest
      .fn()
      .mockRejectedValueOnce(new Error('retriable network error'))
      .mockRejectedValueOnce(new Error('retriable network error'))
      .mockResolvedValueOnce('success')

    // Custom isRetryable that only retries network errors
    const customRetriable: IsRetryable = (err: any) => {
      return err.message.includes('network')
    }

    // Create retryable version with custom isRetryable
    const retryableFunction = createRetryableFunction(
      unstableFunction,
      {
        maxRetries: 3,
        logger: mockLogger,
        delayStrategy: DelayStrategyFactory.exponentialBackoff({
          initialDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2
        }),
        isRetryable: customRetriable
      },
      'custom-operation'
    )

    const result = await retryableFunction()
    expect(result).toBe('success')
  })
})
