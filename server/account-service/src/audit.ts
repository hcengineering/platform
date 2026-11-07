//
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

import type { AuditEventStore } from '@hcengineering/account'
import type { MeasureContext } from '@hcengineering/core'
import {
  type AuditRecord,
  QueueTopic,
  type ConsumerHandle,
  type ConsumerMessage,
  type PlatformQueue
} from '@hcengineering/server-core'

/** Propagate storage errors so the queue retries without advancing. */
export function createAuditHandler (
  store: AuditEventStore
): (ctx: MeasureContext, message: ConsumerMessage<AuditRecord>) => Promise<void> {
  return async (_ctx, message) => {
    await store.insert(message.value)
  }
}

/** All account-service replicas share a group; a fresh installation reads retained events. */
export function startAuditConsumer (ctx: MeasureContext, queue: PlatformQueue, store: AuditEventStore): ConsumerHandle {
  return queue.createConsumer<AuditRecord>(
    ctx,
    QueueTopic.Audit,
    'account-service-audit-v1',
    createAuditHandler(store),
    {
      fromBegining: true,
      allowAutoTopicCreation: false,
      partitionsConsumedConcurrently: 3
    }
  )
}
