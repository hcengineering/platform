import { TokenBucketLimiter } from '../util/rateLimiter'

describe('TokenBucketLimiter', () => {
  it('allows up to N requests in a window', () => {
    const l = new TokenBucketLimiter({ max: 3, windowMs: 60_000 })
    expect(l.allow('tok-a', 0)).toBe(true)
    expect(l.allow('tok-a', 1)).toBe(true)
    expect(l.allow('tok-a', 2)).toBe(true)
    expect(l.allow('tok-a', 3)).toBe(false)
  })

  it('refills after the window passes', () => {
    const l = new TokenBucketLimiter({ max: 2, windowMs: 1_000 })
    expect(l.allow('tok-a', 0)).toBe(true)
    expect(l.allow('tok-a', 100)).toBe(true)
    expect(l.allow('tok-a', 500)).toBe(false)
    // After windowMs from the FIRST request, capacity restores.
    expect(l.allow('tok-a', 1_100)).toBe(true)
  })

  it('tracks separate buckets per token', () => {
    const l = new TokenBucketLimiter({ max: 1, windowMs: 60_000 })
    expect(l.allow('tok-a', 0)).toBe(true)
    expect(l.allow('tok-b', 0)).toBe(true)
    expect(l.allow('tok-a', 100)).toBe(false)
    expect(l.allow('tok-b', 100)).toBe(false)
  })

  it('does not grow unbounded — gc evicts stale buckets', () => {
    const l = new TokenBucketLimiter({ max: 1, windowMs: 1_000 })
    for (let i = 0; i < 100; i++) l.allow(`tok-${i}`, 0)
    l.gc(10_000) // 10s later
    expect(l.size()).toBe(0)
  })
})
