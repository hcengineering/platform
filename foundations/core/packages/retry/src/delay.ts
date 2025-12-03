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

export const DelayStrategyFactory = {
  /**
   * Create a fixed delay strategy
   */
  fixed (options: FixedDelayOptions): DelayStrategy {
    return new FixedDelayStrategy(options)
  },

  /**
   * Create an exponential backoff delay strategy
   */
  exponentialBackoff (options: ExponentialBackoffOptions): DelayStrategy {
    return new ExponentialBackoffStrategy(options)
  },

  /**
   * Create a Fibonacci delay strategy
   */
  fibonacci (options: FibonacciDelayOptions): DelayStrategy {
    return new FibonacciDelayStrategy(options)
  }
}

export interface DelayStrategy {
  getDelay: (attempt: number) => number
}

export interface FixedDelayOptions {
  /** Delay between retries in milliseconds */
  delayMs: number
  /** Optional jitter factor (0-1) to add randomness to delay times */
  jitter?: number
}

/**
 * Fixed delay strategy - uses the same delay for all retry attempts
 */
export class FixedDelayStrategy implements DelayStrategy {
  private readonly delayMs: number
  private readonly jitter: number

  constructor (options: FixedDelayOptions) {
    this.delayMs = options.delayMs
    this.jitter = options.jitter ?? 0
  }

  getDelay (_attempt: number): number {
    if (this.jitter > 0) {
      const jitterAmount = this.delayMs * this.jitter * (Math.random() * 2 - 1)
      return Math.max(0, this.delayMs + jitterAmount)
    }
    return this.delayMs
  }
}

export interface ExponentialBackoffOptions {
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number
  /** Backoff factor for exponential delay increase */
  backoffFactor: number
  /** Optional jitter factor (0-1) to add randomness to delay times */
  jitter?: number
}

/**
 * Exponential backoff delay strategy - increases delay exponentially with each attempt
 */
export class ExponentialBackoffStrategy implements DelayStrategy {
  private readonly initialDelayMs: number
  private readonly maxDelayMs: number
  private readonly backoffFactor: number
  private readonly jitter: number

  constructor (options: ExponentialBackoffOptions) {
    this.initialDelayMs = options.initialDelayMs
    this.maxDelayMs = options.maxDelayMs
    this.backoffFactor = options.backoffFactor
    this.jitter = options.jitter ?? 0
  }

  getDelay (attempt: number): number {
    const baseDelay = Math.min(this.initialDelayMs * Math.pow(this.backoffFactor, attempt - 1), this.maxDelayMs)

    if (this.jitter > 0) {
      const jitterAmount = baseDelay * this.jitter * (Math.random() * 2 - 1)
      return Math.min(Math.max(0, baseDelay + jitterAmount), this.maxDelayMs)
    }

    return baseDelay
  }
}

export interface FibonacciDelayOptions {
  /** Base unit for calculating Fibonacci sequence in milliseconds */
  baseDelayMs: number
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number
  /** Optional jitter factor (0-1) to add randomness to delay times */
  jitter?: number
}

export class FibonacciDelayStrategy implements DelayStrategy {
  private readonly baseDelayMs: number
  private readonly maxDelayMs: number
  private readonly jitter: number

  // Cache for Fibonacci numbers to improve performance
  private readonly fibCache: Map<number, number>

  constructor (options: FibonacciDelayOptions) {
    this.baseDelayMs = options.baseDelayMs
    this.maxDelayMs = options.maxDelayMs
    this.jitter = options.jitter ?? 0
    this.fibCache = new Map<number, number>([
      [0, 0],
      [1, 1]
    ])
  }

  private fibonacci (n: number): number {
    // Return from cache if available
    if (this.fibCache.has(n)) {
      return this.fibCache.get(n) as number
    }

    if (n <= 1) {
      return n
    }

    // Calculate using recursion with memoization
    const result = this.fibonacci(n - 1) + this.fibonacci(n - 2)
    this.fibCache.set(n, result)
    return result
  }

  getDelay (attempt: number): number {
    const fibNumber = this.fibonacci(attempt + 1)
    const baseDelay = Math.min(fibNumber * this.baseDelayMs, this.maxDelayMs)

    if (this.jitter > 0) {
      const jitterAmount = baseDelay * this.jitter * (Math.random() * 2 - 1)
      return Math.min(Math.max(0, baseDelay + jitterAmount), this.maxDelayMs)
    }

    return baseDelay
  }
}

/**
 * Promise-based sleep function
 */
export function sleep (ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
