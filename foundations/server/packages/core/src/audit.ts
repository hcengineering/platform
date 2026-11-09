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

import type { AuditEventName, MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import { createHmac, randomUUID } from 'crypto'
import { QueueTopic, type PlatformQueue } from './queue/types'

export type AuditAttributeValue = string | number | boolean | readonly string[] | null | undefined

/** Explicit domain attributes. Never pass request bodies, credentials or raw errors. */
export interface AuditEvent {
  event: AuditEventName
  outcome?: 'succeeded' | 'denied' | 'failed'
  actorAccountUuid?: string
  actorService?: string
  workspaceUuid?: string | null
  targetType?: string
  targetId?: string
  operationId?: string
  [field: string]: AuditAttributeValue
}

/** Versioned wire record. Additional scalar attributes extend events without changing transport. */
export interface AuditRecord extends AuditEvent {
  schemaVersion: 1
  eventId: string
  occurredAt: number
  sourceService: string
  outcome: 'succeeded' | 'denied' | 'failed'
}

export type AuditEventWriter = (ctx: MeasureContext, event: AuditRecord) => Promise<void>

let auditWriter: AuditEventWriter | undefined
let sourceService = 'unknown'
const pending = new Set<Promise<void>>()

/** Configure once at service startup; callers must explicitly select safe event fields. */
export function setAuditEventWriter (source: string, writer: AuditEventWriter | undefined): void {
  sourceService = source
  auditWriter = writer
}

function reportDeliveryFailure (ctx: MeasureContext, event: AuditEvent, error: unknown): void {
  try {
    ctx.error('Audit delivery failed', {
      event: event.event,
      eventId: event.eventId,
      errorType: error instanceof Error ? error.name : 'UnknownError'
    })
  } catch {
    // Neither transport nor diagnostic failures may change the business outcome.
  }
}

/** Publish after the business action; broker acceptance is not atomic with its transaction. */
export async function recordAuditEvent (ctx: MeasureContext, event: AuditEvent): Promise<void> {
  let diagnosticEvent = event
  try {
    const record: AuditRecord = {
      ...event,
      schemaVersion: 1,
      eventId: randomUUID(),
      occurredAt: Date.now(),
      sourceService,
      outcome: event.outcome ?? 'succeeded'
    }
    diagnosticEvent = record
    const writer = auditWriter
    if (writer === undefined) throw new Error('Audit writer is not configured')
    const delivery = writer(ctx, record)
    pending.add(delivery)
    try {
      await delivery
    } catch (error) {
      reportDeliveryFailure(ctx, record, error)
    } finally {
      pending.delete(delivery)
    }
  } catch (error) {
    reportDeliveryFailure(ctx, diagnosticEvent, error)
  }
}

/** Configure a queue publisher and return a drain/close hook for service shutdown. */
export function startAuditPublisher (ctx: MeasureContext, queue: PlatformQueue, source: string): () => Promise<void> {
  if (queue.getClientId() === 'dummy') {
    setAuditEventWriter(source, undefined)
    ctx.error('Audit delivery unavailable: a real queue is required', { sourceService: source })
    return async () => {}
  }
  const producer = queue.getProducer<AuditRecord>(ctx, QueueTopic.Audit, {
    allowAutoTopicCreation: false,
    idempotent: true,
    maxInFlightRequests: 1,
    retry: { retries: 2, initialRetryTime: 300, maxRetryTime: 1000 },
    acks: -1,
    timeout: 5000
  })
  setAuditEventWriter(source, async (operationCtx, record) => {
    const workspace = record.workspaceUuid as WorkspaceUuid | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        producer.send(
          operationCtx,
          workspace ?? undefined,
          [record],
          record.workspaceUuid ?? record.actorAccountUuid ?? record.eventId
        ),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error('Audit publish timed out'))
          }, 10000)
        })
      ])
    } finally {
      clearTimeout(timer)
    }
  })
  return async () => {
    setAuditEventWriter(source, undefined)
    await Promise.allSettled([...pending])
    await producer.close()
  }
}

/** Preserve the action's result/error even when publishing its settled outcome fails. */
export async function withAuditEvent<T> (ctx: MeasureContext, event: AuditEvent, action: () => Promise<T>): Promise<T> {
  let result: T
  try {
    result = await action()
  } catch (error) {
    await recordAuditEvent(ctx, {
      ...event,
      outcome: 'failed',
      errorType: error instanceof Error ? error.name : undefined
    })
    throw error
  }
  await recordAuditEvent(ctx, { ...event, outcome: 'succeeded' })
  return result
}

/** Hash an explicitly normalized private identifier; omit it when no key is configured. */
export function hashAuditValue (value: string, scope: string, key: string | undefined): string | undefined {
  if (key == null || key === '' || value === '' || value.length > 4096) return undefined
  return createHmac('sha256', key).update('tracex-audit:v1\0').update(scope).update('\0').update(value).digest('hex')
}
