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

import { withRetry, createRetryableFunction, type RetryOptions } from '../retry'
import { type IsRetryable, retryAllErrors } from '../retryable'

// Mock the sleep function to speed up tests
jest.mock('../retry', () => {
  const originalModule = jest.requireActual('../retry')
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

  const mockOptions: RetryOptions = {
    initialDelayMs: 10,
    maxDelayMs: 100,
    maxRetries: 3,
    backoffFactor: 2,
    jitter: 0,
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

    expect(mockOperation).toHaveBeenCalledTimes(mockOptions.maxRetries)
    expect(mockLogger.warn).toHaveBeenCalledTimes(mockOptions.maxRetries - 1)
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

    await withRetry(mockOperation, { ...mockOptions, jitter: 0.2 })

    // With Math.random = 0.5, jitter should be 0
    // (since 0.5 * 2 - 1 = 0)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ delayMs: 10 }) // Should still be the initial delay
    )

    mockRandom.mockRestore()
  })

  it('should cap delay at maxDelayMs', async () => {
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockRejectedValueOnce(new Error('failure 3'))
      // Reduce the number of failures since we're only testing the delay calculation
      // and not the full retry count
      .mockResolvedValueOnce('success')

    // Set a very high backoff factor to test capping
    await withRetry(mockOperation, {
      ...mockOptions,
      initialDelayMs: 50,
      maxDelayMs: 1000,
      maxRetries: 4,
      backoffFactor: 10 // Would normally go 50 -> 500 -> 5000, but should cap at 100
    })

    // First retry delay calculation: 50ms * 10 = 500ms (capped at 100ms)
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      1, // First warning call (for first retry)
      expect.any(String),
      expect.objectContaining({ delayMs: 50 }) // Should be capped at maxDelayMs
    )

    // Second retry delay would also be capped at 100ms
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      2, // Second warning call (for second retry)
      expect.any(String),
      expect.objectContaining({ delayMs: 500 })
    )

    expect(mockLogger.warn).toHaveBeenNthCalledWith(3, expect.any(String), expect.objectContaining({ delayMs: 1000 }))

    // Function should have been called 4 times total
    expect(mockOperation).toHaveBeenCalledTimes(4)
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
    const mockError = new Error('persistent failure')
    const mockFn = jest.fn().mockRejectedValue(mockError)

    const retryableFn = createRetryableFunction(mockFn, mockOptions)

    await expect(retryableFn()).rejects.toThrow('persistent failure')

    expect(mockOptions.maxRetries).toBeDefined()
    expect(mockFn).toHaveBeenCalledTimes(mockOptions.maxRetries ?? -1)
  })
})

// Test for real-world timing scenarios
describe('withRetry timing', () => {
  // Restore original implementation for these tests
  jest.unmock('../retry')

  it('should respect actual delays between retries', async () => {
    const startTime = Date.now()

    const mockOperation = jest.fn().mockRejectedValueOnce(new Error('first failure')).mockResolvedValueOnce('success')

    // Use smaller delays for faster tests
    await withRetry(mockOperation, {
      initialDelayMs: 50, // Start with 50ms
      maxDelayMs: 1000,
      maxRetries: 2,
      backoffFactor: 2,
      jitter: 0 // Disable jitter for predictable timing
    })

    const duration = Date.now() - startTime

    // Should have waited approximately initialDelayMs
    // Adding some margin for test environment variations
    expect(duration).toBeGreaterThanOrEqual(40) // slightly less than initialDelayMs
    expect(mockOperation).toHaveBeenCalledTimes(2)
  }, 1000) // Timeout after 1 second
})

// Test with a decorated class
describe('Using retry in class methods', () => {
  class TestService {
    counter = 0

    async unstableFunction (): Promise<string> {
      this.counter++
      if (this.counter < 3) {
        throw new Error(`Failure attempt ${this.counter}`)
      }
      return 'success'
    }
  }

  it('should work with instance methods', async () => {
    const service = new TestService()

    // Create a retryable version of the method that's bound to the service
    const retryableMethod = createRetryableFunction(service.unstableFunction.bind(service), { maxRetries: 3 })

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
    const customRetriableCheck: IsRetryable = (err: any) => {
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
      isRetryable: customRetriableCheck
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

    jest
      .fn()
      .mockRejectedValueOnce(networkError) // Should retry
      .mockRejectedValueOnce(validationError) // Should not retry
      .mockResolvedValueOnce('success')

    // First test with network error - should be retried
    const mockNetworkOp = jest.fn().mockRejectedValueOnce(networkError).mockResolvedValueOnce('network success')

    const result1 = await withRetry(mockNetworkOp, {
      maxRetries: 3,
      logger: mockLogger,
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
        isRetryable: retryOnlyNetworkErrors
      })
    ).rejects.toThrow('Validation failed')

    expect(mockValidationOp).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('non-retriable error'), expect.any(Object))
  })

  it('should use the default retryAllErrors if isRetryable is not provided', async () => {
    // All errors should be retried by default
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockResolvedValueOnce('success')

    const result = await withRetry(mockOperation, {
      maxRetries: 5,
      logger: mockLogger
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
        isRetryable: customRetriable
      },
      'custom-operation'
    )

    const result = await retryableFunction()
    expect(result).toBe('success')
  })
})
