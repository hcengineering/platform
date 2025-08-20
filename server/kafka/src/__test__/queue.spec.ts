import { generateId, MeasureMetricsContext, type WorkspaceUuid } from '@hcengineering/core'
import { createPlatformQueue, parseQueueConfig } from '..'

jest.setTimeout(120000)
const testCtx = new MeasureMetricsContext('test', {})
describe('queue', () => {
  it('check-queue', async () => {
    const genId = generateId()
    const queue = createPlatformQueue(parseQueueConfig('localhost:19093;-queue_testing-' + genId, 'test-' + genId, ''))
    const docsCount = 100
    try {
      let msgCount = 0
      const p1 = new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => {
          reject(new Error(`Timeout waiting for messages:${msgCount}`))
        }, 100000)
        queue.createConsumer<string>(testCtx, 'qtest', genId, async (ctx, msg) => {
          msgCount += 1
          console.log('msgCount', msgCount)
          if (msgCount === docsCount) {
            clearTimeout(to)
            resolve()
          }
        })
      })

      const producer = queue.getProducer<string>(testCtx, 'qtest')
      for (let i = 0; i < docsCount; i++) {
        await producer.send(testCtx, genId as any as WorkspaceUuid, ['msg' + i])
      }

      await p1
    } catch (err: any) {
      console.log(err)
    } finally {
      await queue.shutdown()
      await queue.deleteTopics(['test'])
    }
  })

  it('check-processing-errors', async () => {
    const genId = generateId()
    const queue = createPlatformQueue(parseQueueConfig('localhost:19093;-queue_testing-' + genId, 'test-' + genId, ''))

    try {
      let counter = 2
      const p = new Promise<void>((resolve, reject) => {
        queue.createConsumer<string>(testCtx, 'test', genId, async (ctx, msg) => {
          counter--
          if (counter > 0) {
            throw new Error('Processing Error')
          }
          resolve()
        })
      })

      const producer = queue.getProducer<string>(testCtx, 'test')
      await producer.send(testCtx, genId as any as WorkspaceUuid, ['msg'])

      await p
    } finally {
      await queue.shutdown()
      await queue.deleteTopics(['test'])
    }
  })
})
