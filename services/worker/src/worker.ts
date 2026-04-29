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

import { MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { QueueTopic } from '@hcengineering/server-core'
import { TimeMachineMessage } from '@hcengineering/server-process'
import { TimeMachineDB } from './db'
import { SendTimeEvent } from './activities'
import config from './config'

export async function runWorker (): Promise<void> {
  const SERVICE_NAME = 'time-machine'
  const db = await TimeMachineDB.init(config.DbUrl)

  const ctx = new MeasureMetricsContext(
    SERVICE_NAME,
    {},
    {},
    newMetrics(),
    undefined,
    undefined,
    undefined,
    config.LogLevel
  )
  const queue = getPlatformQueue(SERVICE_NAME, config.QueueRegion)

  // 1. Kafka Consumer for commands
  queue.createConsumer<TimeMachineMessage>(ctx, QueueTopic.TimeMachine, SERVICE_NAME, async (ctx, msg) => {
    const { type, id, targetDate, topic, data } = msg.value
    if (type === 'schedule' && targetDate != null && topic != null && data !== undefined) {
      ctx.debug('TimeMachine consume schedule', {
        workspace: msg.workspace,
        id,
        targetDate,
        targetDateIso: new Date(targetDate).toISOString(),
        outTopic: topic
      })
      await db.upsertEvent({
        id,
        workspace: msg.workspace,
        target_date: targetDate,
        topic,
        data
      })
    } else if (type === 'cancel') {
      ctx.debug('TimeMachine consume cancel', { workspace: msg.workspace, idPattern: id })
      await db.removeEvents(msg.workspace, id)
    }
  })

  // 2. Polling loop for expired events
  const poll = async (): Promise<void> => {
    try {
      const expiredEvents = await db.getExpiredEvents()
      if (expiredEvents.length > 0) {
        ctx.debug('TimeMachine poll expired', {
          count: expiredEvents.length,
          ids: expiredEvents.map((e) => e.id)
        })
        for (const event of expiredEvents) {
          ctx.debug('TimeMachine relay', {
            workspace: event.workspace,
            id: event.id,
            outTopic: event.topic,
            targetDate: event.target_date,
            targetDateIso: new Date(event.target_date).toISOString()
          })
          await SendTimeEvent(ctx, event.workspace, event.topic, event.data)
        }
        await db.deleteEvents(expiredEvents)
      }
    } catch (err) {
      ctx.error('Error in Time Machine polling loop', { err })
    } finally {
      setTimeout(() => {
        void poll()
      }, config.PollInterval)
    }
  }

  void poll()

  ctx.info('Time Machine worker started')
}
