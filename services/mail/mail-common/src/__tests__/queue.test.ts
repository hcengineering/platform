import { Kafka, Producer } from 'kafkajs'
import { parseQueueConfig } from '@hcengineering/kafka'
import { MeasureContext } from '@hcengineering/core'
import { initQueue, closeQueue, getProducer, KafkaQueueRegistry } from '../queue'
import { BaseConfig } from '../types'

// Mock dependencies
jest.mock('kafkajs')
jest.mock('@hcengineering/kafka')

/* eslint-disable @typescript-eslint/unbound-method */
describe('Kafka Queue Management', () => {
  // Mock objects
  let mockCtx: MeasureContext
  let mockConfig: BaseConfig
  let mockKafka: Kafka
  let mockProducer: Producer
  let disconnectMock: jest.Mock

  // Setup function to create clean mocks for each test
  beforeEach(() => {
    // Reset modules to clear any singleton state
    jest.resetModules()

    // Create mock for producer
    disconnectMock = jest.fn().mockResolvedValue(undefined)
    mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: disconnectMock,
      send: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      events: {},
      transaction: jest.fn(),
      logger: jest.fn()
    } as unknown as Producer

    // Create mock for Kafka
    mockKafka = {
      producer: jest.fn().mockReturnValue(mockProducer),
      consumer: jest.fn(),
      admin: jest.fn()
    } as unknown as Kafka

    // Mock constructor for Kafka
    ;(Kafka as jest.Mock).mockImplementation(() => mockKafka)

    // Create context mock
    mockCtx = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      measure: jest.fn()
    } as unknown as MeasureContext

    // Create config mock
    mockConfig = {
      QueueConfig: 'kafka:broker:9092',
      QueueRegion: 'test-region',
      CommunicationTopic: 'test-topic'
    } as any

    // Mock parseQueueConfig
    ;(parseQueueConfig as jest.Mock).mockReturnValue({
      clientId: 'test-service',
      brokers: ['broker:9092'],
      ssl: false
    })
  })

  afterEach(async () => {
    // Clean up after each test
    await closeQueue()
  })

  describe('initQueue', () => {
    it('should initialize the queue registry with correct parameters', () => {
      // Act
      initQueue(mockCtx, 'test-service', mockConfig)

      // Assert
      expect(parseQueueConfig).toHaveBeenCalledWith(mockConfig.QueueConfig, 'test-service', mockConfig.QueueRegion)

      expect(Kafka).toHaveBeenCalledWith({
        clientId: 'test-service',
        brokers: ['broker:9092'],
        ssl: false
      })

      expect(mockCtx.info).toHaveBeenCalledWith('Kafka queue initialized', { serviceId: 'test-service' })
    })

    it('should throw an error when initialized twice', () => {
      // Arrange
      initQueue(mockCtx, 'test-service', mockConfig)

      // Act & Assert
      expect(() => {
        initQueue(mockCtx, 'test-service', mockConfig)
      }).toThrow('Queue already initialized')
    })

    it('should throw an error when queue config is missing', () => {
      // Arrange
      const configWithoutQueue: BaseConfig = { ...mockConfig, QueueConfig: undefined } as any

      // Act & Assert
      expect(() => {
        initQueue(mockCtx, 'test-service', configWithoutQueue)
      }).toThrow('Please provide queue config')
    })
  })

  describe('getProducer', () => {
    it('should throw an error when queue is not initialized', async () => {
      // Act & Assert
      await expect(getProducer('test-topic')).rejects.toThrow('Queue not initialized')
    })

    it('should create a new producer when one does not exist for the topic', async () => {
      // Arrange
      initQueue(mockCtx, 'test-service', mockConfig)

      // Act
      const producer = await getProducer('test-topic')

      // Assert
      expect(producer).toBe(mockProducer)
      expect(mockKafka.producer).toHaveBeenCalled()
      expect(mockProducer.connect).toHaveBeenCalled()
      expect(mockCtx.info).toHaveBeenCalledWith('Created new Kafka producer', { key: 'test-topic' })
    })

    it('should reuse an existing producer for the same topic', async () => {
      // Arrange
      initQueue(mockCtx, 'test-service', mockConfig)

      // Act
      const producer1 = await getProducer('test-topic')
      const producer2 = await getProducer('test-topic')

      // Assert
      expect(producer1).toBe(producer2)
      expect(mockKafka.producer).toHaveBeenCalledTimes(1) // Called only once
    })

    it('should create different producers for different topics', async () => {
      // Arrange
      initQueue(mockCtx, 'test-service', mockConfig)

      // Setup a second producer
      const mockProducer2 = { ...mockProducer }
      mockKafka.producer = jest.fn().mockReturnValueOnce(mockProducer).mockReturnValueOnce(mockProducer2)

      // Act
      const producer1 = await getProducer('topic1')
      const producer2 = await getProducer('topic2')

      // Assert
      expect(mockKafka.producer).toHaveBeenCalledTimes(2)
      expect(producer1).not.toBe(producer2)
    })
  })

  describe('closeQueue', () => {
    it('should do nothing if the queue is not initialized', async () => {
      // Act
      await closeQueue()

      // Assert
      expect(mockProducer.disconnect).not.toHaveBeenCalled()
    })

    it('should close all producers', async () => {
      // Arrange
      initQueue(mockCtx, 'test-service', mockConfig)

      // Get a couple of producers
      await getProducer('topic1')
      await getProducer('topic2')

      // Act
      await closeQueue()

      // Assert
      expect(mockProducer.disconnect).toHaveBeenCalledTimes(2)
      expect(mockCtx.info).toHaveBeenCalledWith('KafkaQueueRegistry closed')
    })

    it('should handle errors when closing producers', async () => {
      // Arrange
      initQueue(mockCtx, 'test-service', mockConfig)

      // Get a producer
      await getProducer('test-topic')

      // Make disconnect throw an error
      const error = new Error('Disconnect failed')
      disconnectMock.mockRejectedValueOnce(error)

      // Act
      await closeQueue()

      // Assert
      expect(mockCtx.error).toHaveBeenCalledWith('Failed to close Kafka producer', {
        topic: 'test-topic',
        error
      })

      // It should still clear the producers
      expect(mockCtx.info).toHaveBeenCalledWith('KafkaQueueRegistry closed')
    })

    it('should reset the registry after closing', async () => {
      // Arrange
      initQueue(mockCtx, 'test-service', mockConfig)

      // Act
      await closeQueue()

      // The registry should be reset, so initializing again should work
      initQueue(mockCtx, 'test-service', mockConfig)

      // Assert - expect no errors and two initialization logs
      expect(mockCtx.info).toHaveBeenCalledWith('Kafka queue initialized', { serviceId: 'test-service' })
    })
  })

  describe('KafkaQueueRegistry', () => {
    it('should create a Kafka instance with correct configuration', () => {
      // Act
      // eslint-disable-next-line no-new
      new KafkaQueueRegistry(mockCtx, 'test-service', mockConfig)

      // Assert
      expect(parseQueueConfig).toHaveBeenCalledWith(mockConfig.QueueConfig, 'test-service', mockConfig.QueueRegion)

      expect(Kafka).toHaveBeenCalledWith({
        clientId: 'test-service',
        brokers: ['broker:9092'],
        ssl: false
      })
    })

    it('should log when a producer is created', async () => {
      // Arrange
      const registry = new KafkaQueueRegistry(mockCtx, 'test-service', mockConfig)

      // Act
      await registry.getProducer('test-topic')

      // Assert
      expect(mockCtx.info).toHaveBeenCalledWith('Created new Kafka producer', { key: 'test-topic' })
    })

    it('should close all producers during shutdown', async () => {
      // Arrange
      const registry = new KafkaQueueRegistry(mockCtx, 'test-service', mockConfig)

      // Create some producers
      await registry.getProducer('topic1')
      await registry.getProducer('topic2')

      // Act
      await registry.close()

      // Assert
      expect(mockProducer.disconnect).toHaveBeenCalledTimes(2)
      expect(mockCtx.info).toHaveBeenCalledWith('KafkaQueueRegistry closed')
    })
  })
})
