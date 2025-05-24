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
import { defaultLogger, type Logger } from './logger'
import { type IsRetryable, retryAllErrors } from './retryable'

/**
 * Configuration options for the retry mechanism
 */
export interface RetryOptions {
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Backoff factor for exponential delay increase */
  backoffFactor: number
  /** Function to determine if an error is retriable */
  isRetryable: IsRetryable
  /** Optional jitter factor (0-1) to add randomness to delay times */
  jitter?: number
  /** Logger to use (defaults to console logger) */
  logger?: Logger
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxRetries: 5,
  backoffFactor: 1.5,
  jitter: 0.2,
  logger: defaultLogger,
  isRetryable: retryAllErrors
}

/**
 * Executes an operation with exponential backoff retry
 *
 * @param operation - Async operation to execute
 * @param options - Retry configuration options
 * @param operationName - Name of the operation for logging
 * @returns The result of the operation
 * @throws The last error encountered after all retries have been exhausted
 */
export async function withRetry<T> (
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  operationName: string = 'operation'
): Promise<T> {
  const config: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options }
  const logger = config.logger ?? defaultLogger
  let delayMs = config.initialDelayMs
  let attempt = 1
  let lastError: Error | undefined

  while (attempt <= config.maxRetries) {
    try {
      return await operation()
    } catch (err: any) {
      lastError = err
      const isLastAttempt = attempt >= config.maxRetries

      if (isLastAttempt) {
        logger.error(`${operationName} failed after ${attempt} attempts`, {
          error: err.message,
          attempt,
          maxRetries: config.maxRetries
        })
        throw err
      }
      if (!config.isRetryable(err)) {
        logger.error(`${operationName} failed with non-retriable error`, {
          error: err.message,
          attempt,
          maxRetries: config.maxRetries
        })
        throw err
      }

      // Calculate next delay with jitter
      let jitterAmount = 0
      if (config.jitter != null && config.jitter > 0) {
        jitterAmount = delayMs * config.jitter * (Math.random() * 2 - 1)
      }
      const actualDelay = Math.min(delayMs + jitterAmount, config.maxDelayMs)

      logger.warn(`${operationName} failed, retrying in ${Math.round(actualDelay)}ms`, {
        error: err.message,
        attempt,
        nextAttempt: attempt + 1,
        delayMs: Math.round(actualDelay)
      })

      // Wait before retry
      await sleep(actualDelay)

      // Increase delay for next attempt (exponential backoff)
      delayMs = Math.min(delayMs * config.backoffFactor, config.maxDelayMs)
      attempt++
    }
  }

  // This should not be reached due to the throw in the last iteration
  throw lastError ?? new Error(`${operationName} failed for unknown reason`)
}

/**
 * Promise-based sleep function
 */
function sleep (ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a retryable function from a base function
 * Returns a wrapped function that will apply retry logic automatically
 *
 * @param fn - The function to make retryable
 * @param options - Retry configuration options
 * @param operationName - Name of the operation for logging
 * @returns A wrapped function that applies retry logic
 */
export function createRetryableFunction<T extends (...args: any[]) => Promise<any>> (
  fn: T,
  options: Partial<RetryOptions> = {},
  operationName: string = 'operation'
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return await (withRetry(() => fn(...args), options, operationName) as Promise<ReturnType<T>>)
  }) as T
}
