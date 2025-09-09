import type { ContainerUuid } from './api/types'
import type { TickHandler, TickManager } from './api/utils'

export function groupByArray<T, K> (array: T[], keyProvider: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>()

  array.forEach((item) => {
    const key = keyProvider(item)

    if (!result.has(key)) {
      result.set(key, [item])
    } else {
      result.get(key)?.push(item)
    }
  })

  return result
}

/**
 * Handles a time unification and inform about ticks.
 */
export class TickManagerImpl implements TickManager {
  handlers = new Map<number, [TickHandler, number, number]>()

  hashCounter: number = 0

  _tick: number = 0

  tickListeners = new Map<number, (() => void)[]>()

  constructor (readonly tps: number) {
    if (tps > 1000 || tps < 1) {
      throw new Error('Ticks per second has an invalid value: must be >= 1 && <= 1000')
    }
  }

  now (): number {
    // Use performance.now() when available, otherwise fall back to Date.now()
    // performance is available in recent Node versions, but guard for portability.
    return (globalThis as any).performance?.now?.() ?? Date.now()
  }

  register (handler: TickHandler, interval: number): () => void {
    if (!Number.isFinite(interval) || interval < 1) {
      throw new Error('Interval must be a finite number >= 1 (seconds)')
    }
    const handlerId = this.hashCounter++
    this.handlers.set(handlerId, [handler, handlerId % this.tps, interval])
    return () => {
      this.handlers.delete(handlerId)
    }
  }

  async tick (): Promise<void> {
    this._tick++

    // Handle tick listeners
    if (this.tickListeners.size > 0) {
      const listeners = this.tickListeners.get(this._tick) ?? []
      this.tickListeners.delete(this._tick)
      for (const listener of listeners) {
        try {
          listener()
        } catch (err: any) {
          console.error('Error in tick listener:', err)
        }
      }
    }

    for (const [h, hash, interval] of this.handlers.values()) {
      try {
        if (this.isMe(hash, interval)) {
          await h()
        }
      } catch (err: any) {
        console.error(`Error in tick handler for tick ${this._tick}:`, err)
      }
    }
  }

  isMe (tickId: number, seconds: number): boolean {
    if (!Number.isFinite(seconds) || seconds < 1) return false
    // triggers once every (tps * seconds) ticks at the offset `tickId % tps`
    return this._tick % (this.tps * seconds) === tickId % this.tps
  }

  stop: () => void = () => {}

  start (): void {
    const to = setInterval(
      () => {
        this.tick().catch((err) => {
          console.error('Error in tick manager:', err)
        })
      },
      Math.round(1000 / this.tps)
    )
    this.stop = () => {
      clearInterval(to)
    }
  }

  async waitTick (ticks: number): Promise<void> {
    if (ticks < 1) {
      throw new Error('Ticks must be >= 1')
    }
    const targetTick = this._tick + ticks

    await new Promise<void>((resolve) => {
      this.tickListeners.set(targetTick, [...(this.tickListeners.get(targetTick) ?? []), resolve])
    })
  }
}

export function composeCID (prefix: string, id: string): ContainerUuid {
  return `${prefix}_${id}` as ContainerUuid
}
