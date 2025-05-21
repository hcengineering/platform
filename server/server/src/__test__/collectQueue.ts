import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import type { ConsumerHandle, PlatformQueue, PlatformQueueProducer, QueueTopic } from '@hcengineering/server-core'

/**
 * A dummy implementation of PlatformQueueProducer for testing and development
 */
class CollectQueueProducer<T> implements PlatformQueueProducer<T> {
  constructor (readonly topic: QueueTopic | string) {}
  entries: { id: WorkspaceUuid | string, value: T }[] = []
  async send (id: WorkspaceUuid | string, msgs: T[]): Promise<void> {
    this.entries.push(...msgs.map((it) => ({ id, value: it })))
  }

  async close (): Promise<void> {
    await Promise.resolve()
  }

  getQueue (): PlatformQueue {
    return new CollectQueue()
  }
}

/**
 * A dummy implementation of PlatformQueue for testing and development
 */
export class CollectQueue implements PlatformQueue {
  producers: PlatformQueueProducer<any>[] = []
  getProducer<T>(ctx: MeasureContext, topic: QueueTopic | string): PlatformQueueProducer<T> {
    const p = new CollectQueueProducer<T>(topic)
    this.producers.push(p)
    return p
  }

  getClientId (): string {
    return 'collect'
  }

  async shutdown (): Promise<void> {}

  createConsumer<T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    groupId: string,
    onMessage: (
      msg: { id: WorkspaceUuid | string, value: T }[],
      queue: {
        pause: () => void
        heartbeat: () => Promise<void>
      }
    ) => Promise<void>,
    options?: {
      bulkSize?: number
      fromBegining?: boolean
    }
  ): ConsumerHandle {
    return {
      close: async (): Promise<void> => {
        await Promise.resolve()
      },
      isConnected: (): boolean => {
        return false
      }
    }
  }

  async createTopics (tx: number): Promise<void> {
    await Promise.resolve()
  }

  async deleteTopics (topics?: (QueueTopic | string)[]): Promise<void> {}
}

/**
 * Creates a new instance of the dummy queue implementation
 */
export function createCollectQueue (): PlatformQueue {
  return new CollectQueue()
}
