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
import { QueueProducerRegistry } from '@hcengineering/mail-common'
import { PlatformQueueProducer } from '@hcengineering/server-core'
import { RequestEvent as CommunicationEvent } from '@hcengineering/communication-sdk-types'

let queueRegistry: QueueProducerRegistry | undefined

export function initQueue (ctx: MeasureContext, queueRegion: string): void {
  if (queueRegistry !== undefined) {
    throw new Error('Queue already initialized')
  }
  queueRegistry = new QueueProducerRegistry(ctx, 'gmailSync', queueRegion)
  ctx.info('Queue initialized', { clientId: queueRegistry.getClientId() })
}

export async function closeQueue (): Promise<void> {
  if (queueRegistry !== undefined) {
    await queueRegistry.close()
  }
}

export function getProducer (topic: string): PlatformQueueProducer<CommunicationEvent> {
  if (queueRegistry === undefined) {
    throw new Error('Queue not initialized')
  }
  return queueRegistry.getProducer<CommunicationEvent>(topic)
}
