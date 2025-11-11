import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import { type ConsumerHandle, type PlatformQueue, type PlatformQueueProducer, type QueueTopic } from './types'

/**
 * A dummy implementation of PlatformQueueProducer for testing and development
 */
class DummyQueueProducer<T> implements PlatformQueueProducer<T> {
  async send (ctx: MeasureContext, id: WorkspaceUuid | string, msgs: T[]): Promise<void> {
    await Promise.resolve()
  }

  async close (): Promise<void> {
    await Promise.resolve()
  }

  getQueue (): PlatformQueue {
    return new DummyQueue()
  }
}

/**
 * A dummy implementation of PlatformQueue for testing and development
 */
export class DummyQueue implements PlatformQueue {
  getProducer<T>(ctx: MeasureContext, topic: QueueTopic | string): PlatformQueueProducer<T> {
    return new DummyQueueProducer<T>()
  }

  getClientId (): string {
    return 'dummy'
  }

  async shutdown (): Promise<void> {}

  async createTopic (topics: string | string[], partitions: number): Promise<void> {}

  createConsumer<T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    groupId: string,
    onMessage: (
      ctx: MeasureContext,
      msg: { workspace: WorkspaceUuid, value: T },
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
export function createDummyQueue (): PlatformQueue {
  return new DummyQueue()
}
