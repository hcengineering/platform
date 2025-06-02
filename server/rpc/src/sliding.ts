import type { RateLimitInfo } from './rpc'

export class SlidingWindowRateLimitter {
  private readonly rateLimits = new Map<
  string,
  {
    requests: number[]
    rejectedRequests: number // Counter for rejected requests
    resetTime: number
  }
  >()

  constructor (
    readonly rateLimitMax: number,
    readonly rateLimitWindow: number,
    readonly now: () => number = Date.now
  ) {
    this.rateLimitMax = rateLimitMax
    this.rateLimitWindow = rateLimitWindow
  }

  public checkRateLimit (groupId: string): RateLimitInfo {
    const now = this.now()
    const windowStart = now - this.rateLimitWindow

    let rateLimit = this.rateLimits.get(groupId)
    if (rateLimit == null) {
      rateLimit = { requests: [], resetTime: now + this.rateLimitWindow, rejectedRequests: 0 }
      this.rateLimits.set(groupId, rateLimit)
    }

    // Remove requests outside the current window
    rateLimit.requests = rateLimit.requests.filter((time) => time > windowStart)

    // Reset rejected requests counter when window changes
    if (rateLimit.requests.length === 0) {
      rateLimit.rejectedRequests = 0
    }

    // Update reset time
    rateLimit.resetTime = now + this.rateLimitWindow

    if (rateLimit.requests.length <= this.rateLimitMax) {
      rateLimit.requests.push(now + (rateLimit.rejectedRequests > this.rateLimitMax * 2 ? this.rateLimitWindow * 5 : 0))
    }

    if (rateLimit.requests.length >= this.rateLimitMax) {
      rateLimit.rejectedRequests++

      // Find when the oldest request will exit the window
      const nextAvailableTime = rateLimit.requests[0] + this.rateLimitWindow

      return {
        remaining: 0,
        limit: this.rateLimitMax,
        current: rateLimit.requests.length,
        reset: rateLimit.resetTime,
        retryAfter: Math.max(1, nextAvailableTime - now + 1)
      }
    }

    return {
      remaining: this.rateLimitMax - rateLimit.requests.length,
      current: rateLimit.requests.length,
      limit: this.rateLimitMax,
      reset: rateLimit.resetTime
    }
  }

  // Add a reset method for testing purposes
  public reset (): void {
    this.rateLimits.clear()
  }
}
