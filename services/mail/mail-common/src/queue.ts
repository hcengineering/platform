//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { MeasureContext } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { PlatformQueue, PlatformQueueProducer } from '@hcengineering/server-core'

export class QueueProducerRegistry {
  private readonly queue: PlatformQueue
  private readonly producers = new Map<string, PlatformQueueProducer<any>>()

  constructor (
    private readonly ctx: MeasureContext,
    queueName: string,
    queueRegion: string
  ) {
    this.queue = getPlatformQueue(queueName, queueRegion)
    ctx.info('Queue created', { clientId: this.queue.getClientId() })
  }

  public getProducer<T>(topic: string): PlatformQueueProducer<T> {
    let producer = this.producers.get(topic) as PlatformQueueProducer<T> | undefined

    if (producer === undefined) {
      producer = this.queue.getProducer<T>(this.ctx, topic)
      this.producers.set(topic, producer)
      this.ctx.info('Created new producer', { topic })
    }

    return producer
  }

  public getClientId (): string {
    return this.queue.getClientId()
  }

  public async close (): Promise<void> {
    for (const [topic, producer] of this.producers.entries()) {
      try {
        await producer.close()
        this.ctx.info('Producer closed', { topic })
      } catch (err) {
        this.ctx.error('Failed to close producer', { topic, error: err })
      }
    }

    this.producers.clear()
    this.ctx.info('QueueProducerRegistry closed')
  }
}
