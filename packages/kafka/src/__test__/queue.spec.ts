import { generateId, MeasureMetricsContext, type WorkspaceUuid } from '@hcengineering/core'
import { createPlatformQueue, parseQueueConfig } from '..'

jest.setTimeout(30000) // Reduced from 120000
const testCtx = new MeasureMetricsContext('test', {})

describe('queue', () => {
  it('check-queue', async () => {
    const genId = generateId()
    const queue = createPlatformQueue(parseQueueConfig('localhost:19093;-queue_testing-' + genId, 'test-' + genId, ''))
    const docsCount = 50 // Reduced from 100 for faster tests
    try {
      let msgCount = 0
      const p1 = new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => {
          reject(new Error(`Timeout waiting for messages: received ${msgCount}/${docsCount}`))
        }, 15000) // Reduced from 100000

        queue.createConsumer<string>(
          testCtx,
          'qtest',
          genId,
          async (ctx, msg) => {
            msgCount += 1
            if (msgCount === docsCount) {
              clearTimeout(to)
              resolve()
            }
          },
          { retryDelay: 100, maxRetryDelay: 3 }
        )
      })

      // Wait a bit for consumer to be ready
      await new Promise((resolve) => setTimeout(resolve, 500))

      const producer = queue.getProducer<string>(testCtx, 'qtest')
      // Send messages in batches for better performance
      const batchSize = 10
      for (let i = 0; i < docsCount; i += batchSize) {
        const batch: string[] = []
        for (let j = i; j < Math.min(i + batchSize, docsCount); j++) {
          batch.push('msg' + j)
        }
        await producer.send(testCtx, genId as any as WorkspaceUuid, batch)
      }

      await p1
    } finally {
      await queue.shutdown()
      await queue.deleteTopics(['qtest'])
      // Give Kafka time to cleanup connections
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  })

  it('check-processing-errors', async () => {
    const genId = generateId()
    const queue = createPlatformQueue(parseQueueConfig('localhost:19093;-queue_testing-' + genId, 'test-' + genId, ''))

    try {
      let counter = 2
      const p = new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => {
          reject(new Error(`Timeout waiting for retry processing: counter=${counter}`))
        }, 10000) // Added timeout

        queue.createConsumer<string>(
          testCtx,
          'test',
          genId,
          async (ctx, msg) => {
            counter--
            if (counter > 0) {
              throw new Error('Processing Error')
            }
            clearTimeout(to)
            resolve()
          },
          { retryDelay: 50, maxRetryDelay: 3 }
        )
      })

      // Wait a bit for consumer to be ready
      await new Promise((resolve) => setTimeout(resolve, 500))

      const producer = queue.getProducer<string>(testCtx, 'test')
      await producer.send(testCtx, genId as any as WorkspaceUuid, ['msg'])

      await p
    } finally {
      await queue.shutdown()
      await queue.deleteTopics(['test'])
      // Give Kafka time to cleanup connections
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  })
})
