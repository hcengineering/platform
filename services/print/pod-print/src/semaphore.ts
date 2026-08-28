//
// Copyright © 2026 Hardcore Engineering Inc.
//

export class Semaphore {
  private active = 0
  private readonly queue: Array<() => void> = []

  constructor (private readonly limit: number) {}

  async acquire (): Promise<() => void> {
    if (this.active < this.limit) {
      this.active++
      return () => {
        this.release()
      }
    }

    await new Promise<void>((resolve) => {
      this.queue.push(resolve)
    })
    return () => {
      this.release()
    }
  }

  private release (): void {
    const next = this.queue.shift()
    if (next !== undefined) {
      next()
      return
    }
    this.active--
  }
}
