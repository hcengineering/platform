import { MeasureMetricsContext, type WorkspaceUuid } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'

export async function SendTimeEvent (
  ctx: MeasureMetricsContext,
  ws: WorkspaceUuid,
  topic: string,
  data: any
): Promise<void> {
  const SERVICE_NAME = 'time-machine'
  const queue = getPlatformQueue(SERVICE_NAME)

  const producer = queue.getProducer<any>(ctx, topic as any)

  await producer.send(ctx, ws, [data])
}

export default {
  SendTimeEvent
}
