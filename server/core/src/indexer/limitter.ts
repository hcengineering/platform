/**
 * @public
 */

export class RateLimitter {
  idCounter: number = 0
  processingQueue = new Map<string, Promise<void>>()

  queue: (() => Promise<void>)[] = []

  constructor (readonly config: () => { rate: number }) {}

  async exec<T, B extends Record<string, any> = {}>(op: (args?: B) => Promise<T>, args?: B): Promise<T> {
    const processingId = `${this.idCounter++}`

    if (this.processingQueue.size > this.config().rate) {
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
    if (this.processingQueue.size < this.config().rate) {
      void this.exec(op, args)
    } else {
      await this.exec(op, args)
    }
  }

  async waitProcessing (): Promise<void> {
    await await Promise.race(this.processingQueue.values())
  }
}
