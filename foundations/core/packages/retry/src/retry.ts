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
import { type IsRetryable, retryNetworkErrors } from './retryable'
import { type DelayStrategy, DelayStrategyFactory, sleep } from './delay'

/**
 * Configuration options for the retry mechanism
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Function to determine if an error is retriable */
  isRetryable: IsRetryable
  /** Strategy for calculating delay between retries */
  delayStrategy: DelayStrategy
  /** Logger to use (defaults to console logger) */
  logger?: Logger
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  isRetryable: retryNetworkErrors,
  delayStrategy: DelayStrategyFactory.exponentialBackoff({
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffFactor: 1.5,
    jitter: 0.2
  }),
  logger: defaultLogger
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
  let attempt = 1
  let lastError: Error | undefined

  while (attempt <= config.maxRetries) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      const isLastAttempt = attempt >= config.maxRetries

      if (isLastAttempt) {
        logger.error(`${operationName} failed after ${attempt} attempts`, {
          error,
          attempt,
          maxRetries: config.maxRetries
        })
        throw error
      }
      if (!config.isRetryable(error)) {
        logger.error(`${operationName} failed with non-retriable error`, {
          error,
          attempt,
          maxRetries: config.maxRetries
        })
        throw error
      }

      // Get delay for next attempt from strategy
      const delayMs = Math.round(config.delayStrategy.getDelay(attempt))

      logger.warn(`${operationName} failed, retrying in ${delayMs}ms`, {
        error,
        attempt,
        nextAttempt: attempt + 1,
        delayMs
      })

      // Wait before retry
      await sleep(delayMs)
      attempt++
    }
  }

  // This should not be reached due to the throw in the last iteration
  throw lastError ?? new Error(`${operationName} failed for unknown reason`)
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
