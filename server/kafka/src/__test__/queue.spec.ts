import { generateId, MeasureMetricsContext } from '@hcengineering/core'
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
          reject(new Error('Timeout waiting for messages'))
        }, 100000)
        queue.createConsumer<string>(testCtx, 'test', genId, async (msg) => {
          msgCount += msg.length
          if (msgCount === docsCount) {
            clearTimeout(to)
            resolve()
          }
        })
      })

      const producer = queue.createProducer<string>(testCtx, 'test')
      for (let i = 0; i < docsCount; i++) {
        await producer.send(genId, ['msg' + i])
      }

      await p1
    } finally {
      await queue.shutdown()
      await queue.deleteTopics(['test'])
    }
  })

  it('check-processing-errors', async () => {
    const genId = generateId()
    const queue = createPlatformQueue(parseQueueConfig('localhost:19093;-queue_testing-' + genId, 'test-' + genId, ''))

    try {
      let counter = 5
      const p = new Promise<void>((resolve, reject) => {
        queue.createConsumer<string>(testCtx, 'test', genId, async (msg) => {
          counter--
          if (counter > 0) {
            throw new Error('Processing Error')
          }
          resolve()
        })
      })

      const producer = queue.createProducer<string>(testCtx, 'test')
      await producer.send(genId, ['msg'])

      await p
    } finally {
      await queue.shutdown()
      await queue.deleteTopics(['test'])
    }
  })
})
