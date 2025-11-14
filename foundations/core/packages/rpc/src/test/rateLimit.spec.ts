import { SlidingWindowRateLimitter } from '../sliding'

describe('SlidingWindowRateLimitter', () => {
  let clock = 100000

  beforeEach(() => {
    // Mock Date.now to control time
    clock = 100000
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should allow requests within the limit', () => {
    const limiter = new SlidingWindowRateLimitter(5, 60000, () => clock)

    for (let i = 0; i < 5; i++) {
      const result = limiter.checkRateLimit('user1')
      expect(result.remaining).toBe(5 - i - 1)
      expect(result.limit).toBe(5)
    }

    // The next request should hit the limit
    const result = limiter.checkRateLimit('user1')
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeDefined()
  })

  it('should reject requests beyond the limit', () => {
    const limiter = new SlidingWindowRateLimitter(3, 60000, () => clock)

    // Use up the limit
    limiter.checkRateLimit('user1')
    limiter.checkRateLimit('user1')
    limiter.checkRateLimit('user1')

    // This should be limited
    const result = limiter.checkRateLimit('user1')
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeDefined()
  })

  it('should allow new requests as the window slides', () => {
    const limiter = new SlidingWindowRateLimitter(2, 10000, () => clock)

    // Use up the limit
    limiter.checkRateLimit('user1')
    limiter.checkRateLimit('user1')

    // This should be limited
    expect(limiter.checkRateLimit('user1').remaining).toBe(0)

    // Move time forward by 5 seconds (half the window)
    clock += 5 * 1000 // 5 seconds

    // Should still have one request outside the current window
    // and one within, so we can make one more request
    const result = limiter.checkRateLimit('user1')
    expect(result.remaining).toBe(0) // Now at limit again

    // Move time forward by full window
    clock += 11 * 1000 // 1011 seconds

    // All previous requests should be outside the window
    const newResult = limiter.checkRateLimit('user1')
    expect(newResult.remaining).toBe(1) // One request used, one remaining
    expect(limiter.checkRateLimit('user1').remaining).toBe(0) // Now at limit again
  })

  it('should handle different identifiers separately', () => {
    const limiter = new SlidingWindowRateLimitter(2, 60000, () => clock)

    limiter.checkRateLimit('user1')
    limiter.checkRateLimit('user1')

    // User1 should be at limit
    expect(limiter.checkRateLimit('user1').remaining).toBe(0)

    // Different user should have separate limit
    expect(limiter.checkRateLimit('user2').remaining).toBe(1)
    expect(limiter.checkRateLimit('user2').remaining).toBe(0)

    // Both users should be at their limits
    expect(limiter.checkRateLimit('user1').remaining).toBe(0)
    expect(limiter.checkRateLimit('user2').remaining).toBe(0)
  })

  it('should handle sliding window correctly', () => {
    const limiter = new SlidingWindowRateLimitter(10, 60000, () => clock)

    // Use up half the capacity
    for (let i = 0; i < 5; i++) {
      limiter.checkRateLimit('user1')
    }

    // Move halfway through the window
    clock += 30 * 1000 + 1 // 30 seconds

    // Make some more requests
    for (let i = 0; i < 7; i++) {
      const result = limiter.checkRateLimit('user1')
      if (i < 5) {
        expect(result.remaining).toBeGreaterThanOrEqual(0)
      } else {
        expect(result.remaining).toBe(0)
        expect(result.retryAfter).toBeDefined()
        break
      }
    }
  })

  it('check for ban', () => {
    const limiter = new SlidingWindowRateLimitter(10, 10000, () => clock)

    for (let i = 0; i < 50; i++) {
      limiter.checkRateLimit('user1')
    }

    const r1 = limiter.checkRateLimit('user1')
    expect(r1.remaining).toBe(0)
    // Pass all window time.
    clock += 10000

    const r2 = limiter.checkRateLimit('user1')
    expect(r2.remaining).toBe(9)
  })
})
