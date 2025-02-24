export class RateLimiter {
  private tokens: number
  private lastRefillTime: number

  constructor (
    private readonly refillInterval: number,
    private readonly maxTokens: number
  ) {
    this.tokens = maxTokens
    this.lastRefillTime = Date.now()
  }

  private refillTokens (): void {
    const now = Date.now()
    const elapsedTime = now - this.lastRefillTime
    const tokensToAdd = (elapsedTime / this.refillInterval) * this.maxTokens

    this.tokens = Math.min(this.tokens + tokensToAdd, this.maxTokens)
    this.lastRefillTime = now
  }

  public async take (count: number): Promise<void> {
    if (count > this.maxTokens) throw new Error('Cannot take more tokens than the maximum allowed')
    this.refillTokens()

    while (this.tokens < count) {
      // Wait for the next refill
      await new Promise((resolve) => setTimeout(resolve, this.refillInterval))
      this.refillTokens()
    }

    this.tokens -= count
  }
}
