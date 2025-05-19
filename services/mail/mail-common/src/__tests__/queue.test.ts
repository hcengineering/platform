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

import { MeasureContext } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { PlatformQueue, PlatformQueueProducer } from '@hcengineering/server-core'
import { QueueProducerRegistry, initQueue, closeQueue, getProducer } from '../queue'

// Mock dependencies
jest.mock('@hcengineering/kafka')
jest.mock('@hcengineering/server-core')

describe('QueueProducerRegistry', () => {
  // Mock objects
  let mockCtx: jest.Mocked<MeasureContext>
  let mockQueue: jest.Mocked<PlatformQueue>
  let mockProducer1: jest.Mocked<PlatformQueueProducer<any>>
  let mockProducer2: jest.Mocked<PlatformQueueProducer<any>>

  // Constants for test
  const QUEUE_NAME = 'test-queue'
  const QUEUE_REGION = 'test-region'
  const CLIENT_ID = 'test-client-id'
  const TOPIC1 = 'test-topic-1'
  const TOPIC2 = 'test-topic-2'

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock objects
    mockCtx = {
      info: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockProducer1 = {
      send: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<PlatformQueueProducer<any>>

    mockProducer2 = {
      send: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<PlatformQueueProducer<any>>

    mockQueue = {
      getProducer: jest.fn().mockImplementation((ctx, topic) => {
        if (topic === TOPIC1) return mockProducer1
        if (topic === TOPIC2) return mockProducer2
        return mockProducer1 // Default
      }),
      getClientId: jest.fn().mockReturnValue(CLIENT_ID)
    } as unknown as jest.Mocked<PlatformQueue>

    // Mock getPlatformQueue to return our mock queue
    ;(getPlatformQueue as jest.Mock).mockReturnValue(mockQueue)
  })

  it('should create registry with specified queue name and region', () => {
    // eslint-disable-next-line no-new
    new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    expect(getPlatformQueue).toHaveBeenCalledWith(QUEUE_NAME, QUEUE_REGION)
    expect(mockCtx.info).toHaveBeenCalledWith('Queue created', { clientId: CLIENT_ID })
  })

  it('should return client ID', () => {
    const registry = new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    const clientId = registry.getClientId()

    expect(clientId).toBe(CLIENT_ID)
    expect(mockQueue.getClientId).toHaveBeenCalled()
  })

  it('should get a new producer when topic not cached', () => {
    const registry = new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    const producer = registry.getProducer<string>(TOPIC1)

    expect(producer).toBe(mockProducer1)
    expect(mockQueue.getProducer).toHaveBeenCalledWith(mockCtx, TOPIC1)
    expect(mockCtx.info).toHaveBeenCalledWith('Created new producer', { topic: TOPIC1 })
  })

  it('should return cached producer when available', () => {
    const registry = new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    // Get producer first time
    const producer1 = registry.getProducer<string>(TOPIC1)
    expect(mockQueue.getProducer).toHaveBeenCalledTimes(1)

    // Get same producer second time
    const producer2 = registry.getProducer<string>(TOPIC1)

    // Should be the same instance
    expect(producer2).toBe(producer1)
    // getProducer should not be called again
    expect(mockQueue.getProducer).toHaveBeenCalledTimes(1)
    // Info log should only appear once
    expect(mockCtx.info).toHaveBeenCalledTimes(2) // Once for queue, once for producer
  })

  it('should create different producers for different topics', () => {
    const registry = new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    const producer1 = registry.getProducer<string>(TOPIC1)
    const producer2 = registry.getProducer<number>(TOPIC2)

    expect(producer1).toBe(mockProducer1)
    expect(producer2).toBe(mockProducer2)
    expect(mockQueue.getProducer).toHaveBeenCalledTimes(2)
    expect(mockQueue.getProducer).toHaveBeenCalledWith(mockCtx, TOPIC1)
    expect(mockQueue.getProducer).toHaveBeenCalledWith(mockCtx, TOPIC2)
  })

  it('should close all producers when closing the registry', async () => {
    const registry = new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    // Get two different producers
    registry.getProducer<string>(TOPIC1)
    registry.getProducer<number>(TOPIC2)

    // Close registry
    await registry.close()

    // Check both producers were closed
    expect(mockProducer1.close).toHaveBeenCalledTimes(1)
    expect(mockProducer2.close).toHaveBeenCalledTimes(1)
    expect(mockCtx.info).toHaveBeenCalledWith('Producer closed', { topic: TOPIC1 })
    expect(mockCtx.info).toHaveBeenCalledWith('Producer closed', { topic: TOPIC2 })
    expect(mockCtx.info).toHaveBeenCalledWith('QueueProducerRegistry closed')
  })

  it('should handle errors when closing producers', async () => {
    const registry = new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    // Get two different producers
    registry.getProducer<string>(TOPIC1)
    registry.getProducer<number>(TOPIC2)

    // Make one producer fail on close
    const error = new Error('Failed to close producer')
    mockProducer1.close.mockRejectedValueOnce(error)

    // Close registry
    await registry.close()

    // Check error was logged for the failed producer
    expect(mockCtx.error).toHaveBeenCalledWith('Failed to close producer', {
      topic: TOPIC1,
      error
    })

    // Check the other producer was still closed successfully
    expect(mockProducer2.close).toHaveBeenCalledTimes(1)
    expect(mockCtx.info).toHaveBeenCalledWith('Producer closed', { topic: TOPIC2 })
    expect(mockCtx.info).toHaveBeenCalledWith('QueueProducerRegistry closed')
  })

  it('should clear producer cache after closing', async () => {
    const registry = new QueueProducerRegistry(mockCtx, QUEUE_NAME, QUEUE_REGION)

    // Get a producer
    registry.getProducer<string>(TOPIC1)

    // Close registry
    await registry.close()

    // Reset mock call counts
    jest.clearAllMocks()

    // Get same producer again - should create new
    registry.getProducer<string>(TOPIC1)

    // Should create a new producer since cache was cleared
    expect(mockQueue.getProducer).toHaveBeenCalledTimes(1)
    expect(mockCtx.info).toHaveBeenCalledWith('Created new producer', { topic: TOPIC1 })
  })
})

describe('Queue Management Functions', () => {
  // Mock objects
  let mockCtx: MeasureContext
  let mockQueue: PlatformQueue
  let mockProducer: PlatformQueueProducer<any>

  // Test constants
  const SERVICE_ID = 'test-service'
  const QUEUE_REGION = 'test-region'
  const TEST_TOPIC = 'test-topic'
  const CLIENT_ID = 'test-client-id'

  beforeEach(() => {
    // Reset module state between tests
    jest.resetModules()

    // Setup mock producer
    mockProducer = {
      send: jest.fn().mockResolvedValue(undefined),
      sendMessages: jest.fn().mockResolvedValue(undefined),
      getQueue: jest.fn().mockReturnValue(mockQueue),
      close: jest.fn().mockResolvedValue(undefined)
    }

    // Setup mock queue
    mockQueue = {
      getProducer: jest.fn().mockReturnValue(mockProducer),
      getClientId: jest.fn().mockReturnValue(CLIENT_ID),
      createConsumer: jest.fn(),
      createTopics: jest.fn(),
      deleteTopics: jest.fn(),
      shutdown: jest.fn()
    }

    // Setup mock context
    mockCtx = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as MeasureContext

    // Mock getPlatformQueue to return our mock queue
    ;(getPlatformQueue as jest.Mock).mockReturnValue(mockQueue)

    // Force re-initialization of module state
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const queueModule = require('../queue')
    queueModule.queueRegistry = undefined
  })

  afterEach(async () => {
    // Clean up after each test
    await closeQueue()
  })

  describe('initQueue', () => {
    it('should initialize the queue registry', () => {
      // Call the function
      initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)

      // Verify getPlatformQueue was called with correct parameters
      expect(getPlatformQueue).toHaveBeenCalledWith(SERVICE_ID, QUEUE_REGION)

      // Verify logging
      expect(mockCtx.info).toHaveBeenCalledWith('Queue initialized', { clientId: CLIENT_ID })
    })

    it('should throw error if initialized multiple times', () => {
      // First initialization
      initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)

      // Second initialization should throw
      expect(() => {
        initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)
      }).toThrow('Queue already initialized')
    })
  })

  describe('getProducer', () => {
    it('should throw error if queue not initialized', () => {
      expect(() => {
        getProducer(TEST_TOPIC)
      }).toThrow('Queue not initialized')
    })

    it('should return a producer for the specified topic', () => {
      // Initialize queue
      initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)

      // Get producer
      const producer = getProducer(TEST_TOPIC)

      // Verify queue.getProducer was called with correct parameters
      expect(mockQueue.getProducer).toHaveBeenCalledWith(mockCtx, TEST_TOPIC)

      // Verify the producer was returned
      expect(producer).toBe(mockProducer)
    })

    it('should reuse existing producer for the same topic', () => {
      // Initialize queue
      initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)

      // Get producer twice
      const producer1 = getProducer(TEST_TOPIC)
      const producer2 = getProducer(TEST_TOPIC)

      // Verify queue.getProducer was called only once
      expect(mockQueue.getProducer).toHaveBeenCalledTimes(1)

      // Verify the same producer was returned
      expect(producer1).toBe(producer2)
    })

    it('should create different producers for different topics', () => {
      // Setup a second producer
      const mockProducer2 = { ...mockProducer }
      mockQueue.getProducer = jest.fn().mockReturnValueOnce(mockProducer).mockReturnValueOnce(mockProducer2)

      // Initialize queue
      initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)

      // Get producers for different topics
      const producer1 = getProducer('topic1')
      const producer2 = getProducer('topic2')

      // Verify queue.getProducer was called twice
      expect(mockQueue.getProducer).toHaveBeenCalledTimes(2)

      // Verify different producers were returned
      expect(producer1).not.toBe(producer2)
    })
  })

  describe('closeQueue', () => {
    it('should close all producers', async () => {
      // Initialize queue
      initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)

      // Get multiple producers
      getProducer('topic1')
      getProducer('topic2')

      // Close queue
      await closeQueue()

      // Verify producers were closed
      expect(mockProducer.close).toHaveBeenCalledTimes(2)

      // Verify logging
      expect(mockCtx.info).toHaveBeenCalledWith('Producer closed', expect.any(Object))
      expect(mockCtx.info).toHaveBeenCalledWith('QueueProducerRegistry closed')
    })

    it('should handle errors when closing producers', async () => {
      // Make producer.close throw an error
      mockProducer.close = jest.fn().mockRejectedValue(new Error('Close error'))

      // Initialize queue
      initQueue(mockCtx, SERVICE_ID, QUEUE_REGION)

      // Get producer
      getProducer(TEST_TOPIC)

      // Close queue
      await closeQueue()

      // Verify error was logged
      expect(mockCtx.error).toHaveBeenCalledWith('Failed to close producer', {
        topic: TEST_TOPIC,
        error: expect.any(Error)
      })
    })

    it('should do nothing if queue not initialized', async () => {
      // Don't initialize queue

      // Close queue
      await closeQueue()

      // Verify no errors occurred
      expect(mockCtx.error).not.toHaveBeenCalled()
    })
  })
})
