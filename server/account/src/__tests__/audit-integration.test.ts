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

import { randomUUID } from 'crypto'
import postgres from 'postgres'
import { MeasureMetricsContext } from '@hcengineering/core'
import {
  recordAuditEvent,
  startAuditPublisher,
  type AuditRecord,
  type AuditEventWriter,
  QueueTopic,
  type PlatformQueue
} from '@hcengineering/server-core'
import { createPlatformQueue } from '@hcengineering/kafka'
import { PostgresAuditEventStore } from '../collections/postgres/audit-store'
import { getMigrations } from '../collections/postgres/migrations'

// Opt in: creates and removes only a randomly named schema and broker topic.
const integration =
  process.env.AUDIT_POSTGRES_URL !== undefined && process.env.AUDIT_BROKERS !== undefined ? describe : describe.skip
integration('audit PostgreSQL/Redpanda delivery', () => {
  jest.setTimeout(60000)

  test('replays retained events across regions, retries database failure and deduplicates after consumer restart', async () => {
    const suffix = randomUUID().replace(/-/g, '')
    const ns = `audit_test_${suffix}`
    const sql = postgres(process.env.AUDIT_POSTGRES_URL ?? '', { max: 1, connection: { search_path: ns } })
    let producerQueue: PlatformQueue | undefined
    let consumerQueue: PlatformQueue | undefined
    let closePublisher: (() => Promise<void>) | undefined
    const ctx = new MeasureMetricsContext('audit-integration', {})
    const postfix = `-test-${suffix}`
    const brokers = (process.env.AUDIT_BROKERS ?? '').split(',')
    const received: AuditRecord[] = []
    let failedOnce = false
    const waitFor = async (predicate: () => Promise<boolean>): Promise<void> => {
      const deadline = Date.now() + 20000
      while (!(await predicate())) {
        if (Date.now() >= deadline) throw new Error('Audit integration timed out')
        await new Promise<void>((resolve) => setTimeout(resolve, 100))
      }
    }
    try {
      await sql.unsafe(`CREATE SCHEMA ${ns}`)
      await sql.unsafe(
        `CREATE FUNCTION ${ns}.current_epoch_ms() RETURNS BIGINT LANGUAGE SQL AS 'SELECT (extract(epoch from current_timestamp) * 1000)::bigint'`
      )
      const migration = getMigrations(ns).find(([name]) => name === 'account_db_v35_audit_events')
      if (migration === undefined) throw new Error('Audit migration missing')
      await sql.unsafe(migration[1])
      await sql.unsafe(migration[1])
      const store = new PostgresAuditEventStore(sql, ns)
      producerQueue = createPlatformQueue({ clientId: 'audit-test-source', brokers, postfix, region: 'source-region' })
      await producerQueue.createTopic(QueueTopic.Audit, 1)
      closePublisher = startAuditPublisher(ctx, producerQueue, 'workspace')
      // Publish before the consumer exists: first startup must read retained events.
      await recordAuditEvent(ctx, {
        event: 'workspace.data.cleanup',
        workspaceUuid: 'deleted-workspace',
        actorAccountUuid: 'deleted-account'
      })
      await sql.unsafe(`ALTER TABLE ${ns}.audit_events RENAME TO audit_events_unavailable`)
      consumerQueue = createPlatformQueue({ clientId: 'audit-test-sink', brokers, postfix, region: 'sink-region' })
      const consume: AuditEventWriter = async (_operationCtx, record) => {
        try {
          await store.insert(record)
          received.push(record)
        } catch (error) {
          failedOnce = true
          throw error
        }
      }
      consumerQueue.createConsumer<AuditRecord>(
        ctx,
        QueueTopic.Audit,
        'audit-test-group',
        async (operationCtx, message) => {
          await consume(operationCtx, message.value)
        },
        { fromBegining: true, retryDelay: 50 }
      )
      await waitFor(async () => failedOnce)
      expect(failedOnce).toBe(true)
      expect(received).toHaveLength(0)
      await sql.unsafe(`ALTER TABLE ${ns}.audit_events_unavailable RENAME TO audit_events`)
      await waitFor(async () => received.length === 1)
      const original = received[0]
      await consumerQueue.shutdown()
      consumerQueue = createPlatformQueue({
        clientId: 'audit-test-restarted',
        brokers,
        postfix,
        region: 'another-region'
      })
      consumerQueue.createConsumer<AuditRecord>(
        ctx,
        QueueTopic.Audit,
        'audit-test-group',
        async (operationCtx, message) => {
          await consume(operationCtx, message.value)
        },
        { fromBegining: true, retryDelay: 50 }
      )
      // Simulate a delivery repeated after INSERT but before its offset was committed.
      await producerQueue
        .getProducer<AuditRecord>(ctx, QueueTopic.Audit, {
          allowAutoTopicCreation: false,
          idempotent: true,
          maxInFlightRequests: 1,
          retry: { retries: 2, initialRetryTime: 300, maxRetryTime: 1000 },
          acks: -1,
          timeout: 5000
        })
        .send(ctx, undefined, [original], original.eventId)
      await waitFor(async () => received.length >= 2)
      const rows = await sql.unsafe(`SELECT * FROM ${ns}.audit_events`)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        event_id: original.eventId,
        actor_account_uuid: 'deleted-account',
        workspace_uuid: 'deleted-workspace'
      })
      // No referenced account/workspace rows exist; audit survives their absence.
      expect(Number(rows[0].recorded_at)).toBeGreaterThan(0)
    } finally {
      await closePublisher?.()
      await consumerQueue?.shutdown()
      if (producerQueue !== undefined) {
        await producerQueue.deleteTopics([QueueTopic.Audit])
        await producerQueue.shutdown()
      }
      await sql.unsafe(`DROP SCHEMA IF EXISTS ${ns} CASCADE`)
      await sql.end()
    }
  })
})
