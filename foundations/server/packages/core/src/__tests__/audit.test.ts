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

import type { MeasureContext } from '@hcengineering/core'
import { hashAuditValue, recordAuditEvent, setAuditEventWriter, startAuditPublisher, withAuditEvent } from '../audit'
import type { AuditRecord } from '../audit'
import type { PlatformQueue, PlatformQueueProducer } from '../queue/types'

const logs: Pick<MeasureContext, 'info' | 'warn' | 'error'> = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
const ctx = logs as MeasureContext
const write = jest.fn<Promise<void>, [MeasureContext, AuditRecord]>()

beforeEach(() => {
  jest.resetAllMocks()
  write.mockResolvedValue(undefined)
  setAuditEventWriter('test', write)
})
afterEach(() => {
  setAuditEventWriter('test', undefined)
  jest.useRealTimers()
})

test('publishes versioned catalog events with distinct stable identities and explicit fields', async () => {
  await recordAuditEvent(ctx, { event: 'document.publish', actorAccountUuid: 'actor', documentId: 'document' })
  await recordAuditEvent(ctx, { event: 'document.publish', actorAccountUuid: 'actor', documentId: 'document' })
  const records = write.mock.calls.map(([, record]) => record)
  expect(records[0]).toMatchObject({
    schemaVersion: 1,
    sourceService: 'test',
    outcome: 'succeeded',
    documentId: 'document'
  })
  expect(records[0].eventId).not.toBe(records[1].eventId)
  expect(logs.info).not.toHaveBeenCalled()
})

test.each(['denied', 'failed'] as const)('publishes the %s business outcome', async (outcome) => {
  await recordAuditEvent(ctx, { event: 'document.publish', outcome })
  expect(write).toHaveBeenCalledWith(ctx, expect.objectContaining({ outcome }))
})

test('waits for the action and publication without exposing the returned credentials', async () => {
  let finish: (value: string) => void = () => {}
  const action = new Promise<string>((resolve) => {
    finish = resolve
  })
  const pending = withAuditEvent(ctx, { event: 'document.publish' }, async () => await action)
  expect(write).not.toHaveBeenCalled()
  finish('private-token')
  expect(await pending).toBe('private-token')
  expect(write).toHaveBeenCalledTimes(1)
  expect(JSON.stringify(write.mock.calls)).not.toContain('private-token')
})

test('preserves action errors and exports only their type', async () => {
  const error = new TypeError('private database credentials')
  await expect(
    withAuditEvent(ctx, { event: 'workspace.data.cleanup' }, async () => {
      throw error
    })
  ).rejects.toBe(error)
  expect(write).toHaveBeenCalledWith(ctx, expect.objectContaining({ outcome: 'failed', errorType: 'TypeError' }))
  expect(JSON.stringify(write.mock.calls)).not.toContain(error.message)
})

test('transport and diagnostic failures neither replace results nor invent failed actions', async () => {
  write.mockRejectedValue(new Error('private broker details'))
  ;(logs.error as jest.Mock).mockImplementation(() => {
    throw new Error('logger unavailable')
  })
  await expect(withAuditEvent(ctx, { event: 'document.publish' }, async () => 42)).resolves.toBe(42)
  expect(write).toHaveBeenCalledTimes(1)
  expect(write.mock.calls[0][1].outcome).toBe('succeeded')
  const error = new Error('original action error')
  await expect(
    withAuditEvent(ctx, { event: 'document.publish' }, async () => {
      throw error
    })
  ).rejects.toBe(error)
})

test('reports an unconfigured writer without treating technical logs as saved audit', async () => {
  setAuditEventWriter('test', undefined)
  await recordAuditEvent(ctx, { event: 'document.publish' })
  expect(logs.error).toHaveBeenCalledWith(
    'Audit delivery failed',
    expect.objectContaining({ event: 'document.publish' })
  )
  expect(write).not.toHaveBeenCalled()
})

function publisherQueue (send: jest.Mock, close: jest.Mock): PlatformQueue {
  const producer: Partial<PlatformQueueProducer<AuditRecord>> = { send, close }
  const queue: Partial<PlatformQueue> = {
    getClientId: () => 'test',
    getProducer: jest.fn().mockReturnValue(producer)
  }
  return queue as PlatformQueue
}

test('publishes instance events without a fabricated workspace and drains before closing', async () => {
  let finish: () => void = () => {}
  const send = jest.fn().mockImplementation(async () => {
    await new Promise<void>((resolve) => {
      finish = resolve
    })
  })
  const close = jest.fn().mockResolvedValue(undefined)
  const stop = startAuditPublisher(ctx, publisherQueue(send, close), 'account')
  const delivery = recordAuditEvent(ctx, { event: 'account.login' })
  const shutdown = stop()
  expect(close).not.toHaveBeenCalled()
  expect(send).toHaveBeenCalledWith(
    ctx,
    undefined,
    [expect.objectContaining({ sourceService: 'account' })],
    expect.any(String)
  )
  finish()
  await delivery
  await shutdown
  expect(close).toHaveBeenCalledTimes(1)
})

test('bounds broker wait without changing the action result or leaking timer rejections', async () => {
  jest.useFakeTimers()
  const send = jest.fn().mockImplementation(async () => {
    await new Promise<void>(() => {})
  })
  const close = jest.fn().mockResolvedValue(undefined)
  const stop = startAuditPublisher(ctx, publisherQueue(send, close), 'account')
  const result = withAuditEvent(ctx, { event: 'document.publish' }, async () => 42)
  await jest.advanceTimersByTimeAsync(10000)
  await expect(result).resolves.toBe(42)
  expect(logs.error).toHaveBeenCalledWith(
    'Audit delivery failed',
    expect.objectContaining({ eventId: expect.any(String) })
  )
  await stop()
})

test('hashes explicit identifiers with a key and scope, omitting values without a key', () => {
  const hash = hashAuditValue('private@example.com', 'email', 'test-key')
  expect(hash).toMatch(/^[a-f0-9]{64}$/)
  expect(hash).toBe(hashAuditValue('private@example.com', 'email', 'test-key'))
  expect(hash).not.toBe(hashAuditValue('private@example.com', 'email', 'other-key'))
  expect(hash).not.toBe(hashAuditValue('private@example.com', 'other-scope', 'test-key'))
  expect(hashAuditValue('private@example.com', 'email', undefined)).toBeUndefined()
})
