/**
 * @public
 */

export class RateLimitter {
  idCounter: number = 0
  processingQueue = new Map<string, Promise<void>>()
  last: number = 0

  queue: (() => Promise<void>)[] = []

  constructor (readonly config: () => { rate: number, perSecond?: number }) {}

  async exec<T, B extends Record<string, any> = {}>(op: (args?: B) => Promise<T>, args?: B): Promise<T> {
    const processingId = `${this.idCounter++}`
    const cfg = this.config()

    while (this.processingQueue.size > cfg.rate) {
      await Promise.race(this.processingQueue.values())
    }
    try {
      const p = op(args)
      this.processingQueue.set(processingId, p as Promise<void>)
      return await p
    } finally {
      this.processingQueue.delete(processingId)
    }
  }

  async add<T, B extends Record<string, any> = {}>(op: (args?: B) => Promise<T>, args?: B): Promise<void> {
    const cfg = this.config()

    if (this.processingQueue.size < cfg.rate) {
      void this.exec(op, args)
    } else {
      await this.exec(op, args)
    }
  }

  async waitProcessing (): Promise<void> {
    await await Promise.race(this.processingQueue.values())
  }
}
