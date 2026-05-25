//
// Copyright © 2026 Hardcore Engineering Inc.
//

interface BucketState {
  count: number
  windowStartMs: number
}

export interface RateLimiterOpts {
  max: number // max requests per window
  windowMs: number // rolling window length in ms
}

/**
 * Minimal in-memory token-bucket limiter. Per-key counters reset N ms
 * after their first request. Scoped to a single account-service
 * process — sufficient for a per-pod admin export endpoint, not
 * meant for distributed enforcement.
 */
export class TokenBucketLimiter {
  private readonly buckets = new Map<string, BucketState>()
  constructor (private readonly opts: RateLimiterOpts) {}

  allow (key: string, nowMs: number): boolean {
    const b = this.buckets.get(key)
    if (b == null || nowMs - b.windowStartMs >= this.opts.windowMs) {
      this.buckets.set(key, { count: 1, windowStartMs: nowMs })
      return true
    }
    if (b.count >= this.opts.max) return false
    b.count += 1
    return true
  }

  /** Drop bucket entries older than 2× the window. Call periodically. */
  gc (nowMs: number): void {
    const stale = nowMs - 2 * this.opts.windowMs
    for (const [k, b] of this.buckets) {
      if (b.windowStartMs < stale) this.buckets.delete(k)
    }
  }

  size (): number {
    return this.buckets.size
  }
}
