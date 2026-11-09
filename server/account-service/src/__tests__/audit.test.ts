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
import { type AuditRecord, type ConsumerMessage, type PlatformQueue, QueueTopic } from '@hcengineering/server-core'
import { createAuditHandler, startAuditConsumer } from '../audit'

const ctxFields: Partial<MeasureContext> = {}
const ctx = ctxFields as MeasureContext
const record: AuditRecord = {
  schemaVersion: 1,
  eventId: '03e64d21-5bda-4b9c-b7ee-5411bc911ecb',
  occurredAt: 1,
  sourceService: 'account',
  event: 'account.login',
  outcome: 'succeeded'
}
const message: Partial<ConsumerMessage<AuditRecord>> = { value: record }
const insert = jest.fn()
const store: AuditEventStore = { insert, findWorkspace: jest.fn() }

beforeEach(() => {
  jest.resetAllMocks()
})

test('does not complete the handler before the database commit resolves', async () => {
  let commit: () => void = () => {}
  insert.mockImplementation(async () => {
    await new Promise<void>((resolve) => {
      commit = resolve
    })
  })
  let completed = false
  const delivery = createAuditHandler(store)(ctx, message as ConsumerMessage<AuditRecord>).then(() => {
    completed = true
  })
  await Promise.resolve()
  expect(completed).toBe(false)
  commit()
  await delivery
  expect(completed).toBe(true)
})

test('propagates database errors to the queue and accepts subsequent redelivery', async () => {
  const error = new Error('database unavailable')
  insert.mockRejectedValueOnce(error).mockResolvedValue(undefined)
  const handler = createAuditHandler(store)
  await expect(handler(ctx, message as ConsumerMessage<AuditRecord>)).rejects.toBe(error)
  await handler(ctx, message as ConsumerMessage<AuditRecord>)
  expect(insert).toHaveBeenNthCalledWith(1, record)
  expect(insert).toHaveBeenNthCalledWith(2, record)
})

test('uses a stable shared group and replays retained events on first startup', () => {
  const createConsumer = jest.fn()
  const queue: Partial<PlatformQueue> = { createConsumer }
  startAuditConsumer(ctx, queue as PlatformQueue, store)
  expect(createConsumer).toHaveBeenCalledWith(ctx, QueueTopic.Audit, 'account-service-audit-v1', expect.any(Function), {
    fromBegining: true,
    allowAutoTopicCreation: false,
    partitionsConsumedConcurrently: 3
  })
})
