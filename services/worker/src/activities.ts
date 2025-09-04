import core, { MeasureMetricsContext, type Ref, type WorkspaceUuid } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import process, { type Execution } from '@hcengineering/process'
import { QueueTopic } from '@hcengineering/server-core'
import type { ProcessMessage } from '@hcengineering/server-process'

export async function SendTimeEvent (ws: WorkspaceUuid, _execution: Ref<Execution>): Promise<void> {
  const SERVICE_NAME = 'worker'
  const queue = getPlatformQueue(SERVICE_NAME)
  const ctx = new MeasureMetricsContext(SERVICE_NAME, {})

  const producer = queue.getProducer<ProcessMessage>(ctx, QueueTopic.Process)

  await producer.send(ctx, ws, [
    {
      account: core.account.System,
      event: process.trigger.OnTime,
      context: {},
      execution: _execution
    }
  ])
}

export default {
  SendTimeEvent
}
