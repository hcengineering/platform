//
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import {
  type ConsumerHandle,
  type PlatformQueue,
  type PlatformQueueProducer,
  type QueueTopic,
  type QueueProducerOptions,
  type QueueConsumerOptions
} from './types'

/**
 * A dummy implementation of PlatformQueueProducer for testing and development
 */
class DummyQueueProducer<T> implements PlatformQueueProducer<T> {
  async send (ctx: MeasureContext, id: WorkspaceUuid | string | undefined, msgs: T[]): Promise<void> {
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
  getProducer<T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    options?: QueueProducerOptions
  ): PlatformQueueProducer<T> {
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
    options?: QueueConsumerOptions
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
