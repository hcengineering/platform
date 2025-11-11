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

import { DelayStrategyFactory, ExponentialBackoffStrategy, FibonacciDelayStrategy, FixedDelayStrategy } from '../delay'

describe('Delay Strategies', () => {
  // Mock Math.random to return fixed values in tests
  let randomMock: jest.SpyInstance

  beforeEach(() => {
    // Default mock returns 0.5 for Math.random, which creates 0 jitter effect
    randomMock = jest.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    randomMock.mockRestore()
  })

  describe('FixedDelayStrategy', () => {
    it('should return the same delay for all attempts without jitter', () => {
      const delay = 1000
      const strategy = new FixedDelayStrategy({ delayMs: delay })

      expect(strategy.getDelay(1)).toBe(delay)
      expect(strategy.getDelay(2)).toBe(delay)
      expect(strategy.getDelay(5)).toBe(delay)
      expect(strategy.getDelay(10)).toBe(delay)
    })

    it('should apply jitter correctly', () => {
      const delay = 1000
      const jitter = 0.2 // 20% jitter
      const strategy = new FixedDelayStrategy({ delayMs: delay, jitter })

      // Mock random to return different values
      randomMock.mockReturnValueOnce(0.6) // => +0.2 * delay
      randomMock.mockReturnValueOnce(0.4) // => -0.2 * delay
      randomMock.mockReturnValueOnce(1.0) // => +1.0 * delay

      // With 0.6 random value, jitter effect is (0.6-0.5)*2*0.2 = +0.04 => 4% increase
      expect(strategy.getDelay(1)).toBe(delay + delay * 0.2 * 0.2)

      // With 0.4 random value, jitter effect is (0.4-0.5)*2*0.2 = -0.04 => 4% decrease
      expect(strategy.getDelay(2)).toBe(delay - delay * 0.2 * 0.2)

      // With 1.0 random value, jitter effect is (1.0-0.5)*2*0.2 = +0.2 => 20% increase
      expect(strategy.getDelay(3)).toBe(delay + delay * 0.2 * 1.0)
    })

    it('should never return negative values even with high jitter', () => {
      const delay = 100
      const jitter = 1.0 // 100% jitter, extreme case
      const strategy = new FixedDelayStrategy({ delayMs: delay, jitter })

      // Mock random to return min value (full negative jitter)
      randomMock.mockReturnValue(0) // => -1.0 * delay

      // With 0 random value and 1.0 jitter, the effect would be -100%, but should be capped at 0
      expect(strategy.getDelay(1)).toBe(0)
    })

    it('should be creatable through factory method', () => {
      const strategy = DelayStrategyFactory.fixed({
        delayMs: 1000,
        jitter: 0.1
      })
      expect(strategy).toBeInstanceOf(FixedDelayStrategy)
      expect(strategy.getDelay(1)).toBe(1000) // With 0.5 mock random, no jitter effect
    })
  })

  describe('ExponentialBackoffStrategy', () => {
    it('should increase delay exponentially without jitter', () => {
      const initial = 1000
      const max = 60000
      const factor = 2
      const strategy = new ExponentialBackoffStrategy({
        initialDelayMs: initial,
        maxDelayMs: max,
        backoffFactor: factor
      })

      expect(strategy.getDelay(1)).toBe(initial) // 1000
      expect(strategy.getDelay(2)).toBe(initial * factor) // 2000
      expect(strategy.getDelay(3)).toBe(initial * Math.pow(factor, 2)) // 4000
      expect(strategy.getDelay(4)).toBe(initial * Math.pow(factor, 3)) // 8000
    })

    it('should respect maximum delay', () => {
      const strategy = new ExponentialBackoffStrategy({
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffFactor: 2
      })

      expect(strategy.getDelay(1)).toBe(1000)
      expect(strategy.getDelay(2)).toBe(2000)
      expect(strategy.getDelay(3)).toBe(4000)
      // Should be capped at 5000
      expect(strategy.getDelay(4)).toBe(5000)
      expect(strategy.getDelay(5)).toBe(5000)
    })

    it('should apply jitter correctly', () => {
      const strategy = new ExponentialBackoffStrategy({
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffFactor: 2,
        jitter: 0.2
      })

      // Mock random to return different values
      randomMock.mockReturnValueOnce(0.6) // => +0.2 * delay
      randomMock.mockReturnValueOnce(0.4) // => -0.2 * delay

      // First attempt: 1000ms with jitter +4%
      expect(strategy.getDelay(1)).toBe(1000 + 1000 * 0.2 * 0.2)

      // Second attempt: 2000ms with jitter -4%
      expect(strategy.getDelay(2)).toBe(2000 - 2000 * 0.2 * 0.2)
    })

    it('should be creatable through factory method', () => {
      const strategy = DelayStrategyFactory.exponentialBackoff({
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffFactor: 2,
        jitter: 0.1
      })
      expect(strategy).toBeInstanceOf(ExponentialBackoffStrategy)
      expect(strategy.getDelay(1)).toBe(1000) // With 0.5 mock random, no jitter effect
      expect(strategy.getDelay(2)).toBe(2000)
    })
  })

  describe('FibonacciDelayStrategy', () => {
    it('should follow Fibonacci sequence without jitter', () => {
      const baseDelay = 100
      const maxDelay = 10000
      const strategy = new FibonacciDelayStrategy({
        baseDelayMs: baseDelay,
        maxDelayMs: maxDelay
      })

      expect(strategy.getDelay(1)).toBe(baseDelay * 1)
      expect(strategy.getDelay(2)).toBe(baseDelay * 2)
      expect(strategy.getDelay(3)).toBe(baseDelay * 3)
      expect(strategy.getDelay(4)).toBe(baseDelay * 5)
      expect(strategy.getDelay(5)).toBe(baseDelay * 8)
      expect(strategy.getDelay(6)).toBe(baseDelay * 13)
    })

    it('should respect maximum delay', () => {
      const strategy = new FibonacciDelayStrategy({
        baseDelayMs: 100,
        maxDelayMs: 500
      })

      expect(strategy.getDelay(1)).toBe(100)
      expect(strategy.getDelay(2)).toBe(200)
      expect(strategy.getDelay(3)).toBe(300)
      expect(strategy.getDelay(4)).toBe(500)
      expect(strategy.getDelay(5)).toBe(500) // Capped at maxDelayMs
      expect(strategy.getDelay(6)).toBe(500) // Capped at maxDelayMs
    })

    it('should cache Fibonacci calculations for performance', () => {
      const strategy = new FibonacciDelayStrategy({
        baseDelayMs: 100,
        maxDelayMs: 10000
      })

      // Access private cache to verify it's working
      const fibCache = (strategy as any).fibCache
      expect(fibCache.size).toBe(2) // Initial cache has 0->0 and 1->1

      strategy.getDelay(7) // Should calculate fib(8) = 21

      expect(fibCache.size).toBeGreaterThan(2)
      expect(fibCache.get(8)).toBe(21)
    })

    it('should apply jitter correctly', () => {
      const strategy = new FibonacciDelayStrategy({
        baseDelayMs: 100,
        maxDelayMs: 10000,
        jitter: 0.2
      })

      // Mock random to return different values
      randomMock.mockReturnValueOnce(0.6) // => +0.2 * delay
      randomMock.mockReturnValueOnce(0.4) // => -0.2 * delay

      // First attempt: 100ms (fib(2)=1 * 100) with jitter +4%
      expect(strategy.getDelay(1)).toBe(100 + 100 * 0.2 * 0.2)

      // Second attempt: 100ms (fib(3)=1 * 100) with jitter -4%
      expect(strategy.getDelay(2)).toBe(200 - 200 * 0.2 * 0.2)
    })

    it('should handle large Fibonacci numbers efficiently', () => {
      const strategy = new FibonacciDelayStrategy({
        baseDelayMs: 1,
        maxDelayMs: Number.MAX_SAFE_INTEGER
      })

      // This would be extremely slow without memoization
      const start = performance.now()
      const delay = strategy.getDelay(40) // fib(41) = 165580141
      const duration = performance.now() - start

      // Should be much faster than calculating naively
      expect(duration).toBeLessThan(100)
      expect(delay).toBe(165580141) // fib(41) * 1
    })

    it('should be creatable through factory method', () => {
      const strategy = DelayStrategyFactory.fibonacci({
        baseDelayMs: 100,
        maxDelayMs: 10000,
        jitter: 0.1
      })
      expect(strategy).toBeInstanceOf(FibonacciDelayStrategy)
      expect(strategy.getDelay(1)).toBe(100)
      expect(strategy.getDelay(2)).toBe(200)
      expect(strategy.getDelay(3)).toBe(300)
      expect(strategy.getDelay(4)).toBe(500)
    })
  })

  describe('DelayStrategyFactory', () => {
    it('should create strategies with correct types', () => {
      expect(
        DelayStrategyFactory.fixed({
          delayMs: 1000
        })
      ).toBeInstanceOf(FixedDelayStrategy)

      expect(
        DelayStrategyFactory.exponentialBackoff({
          initialDelayMs: 1000,
          maxDelayMs: 60000,
          backoffFactor: 2
        })
      ).toBeInstanceOf(ExponentialBackoffStrategy)

      expect(
        DelayStrategyFactory.fibonacci({
          baseDelayMs: 100,
          maxDelayMs: 10000
        })
      ).toBeInstanceOf(FibonacciDelayStrategy)
    })

    it('should pass parameters correctly to strategies', () => {
      const fixed = DelayStrategyFactory.fixed({
        delayMs: 1000,
        jitter: 0.1
      }) as FixedDelayStrategy
      expect((fixed as any).delayMs).toBe(1000)
      expect((fixed as any).jitter).toBe(0.1)

      const exponential = DelayStrategyFactory.exponentialBackoff({
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffFactor: 2.5,
        jitter: 0.2
      }) as ExponentialBackoffStrategy
      expect((exponential as any).initialDelayMs).toBe(1000)
      expect((exponential as any).maxDelayMs).toBe(60000)
      expect((exponential as any).backoffFactor).toBe(2.5)
      expect((exponential as any).jitter).toBe(0.2)

      const fibonacci = DelayStrategyFactory.fibonacci({
        baseDelayMs: 100,
        maxDelayMs: 10000,
        jitter: 0.15
      }) as FibonacciDelayStrategy
      expect((fibonacci as any).baseDelayMs).toBe(100)
      expect((fibonacci as any).maxDelayMs).toBe(10000)
      expect((fibonacci as any).jitter).toBe(0.15)
    })
  })
})
