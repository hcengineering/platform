import { Kafka, Producer } from 'kafkajs'
import { parseQueueConfig } from '@hcengineering/kafka'
import { BaseConfig } from './types'
import { MeasureContext } from '@hcengineering/core'

let queueRegistry: KafkaQueueRegistry | undefined

export function initQueue (ctx: MeasureContext, serviceId: string, config: BaseConfig): void {
  if (queueRegistry !== undefined) {
    throw new Error('Queue already initialized')
  }

  queueRegistry = new KafkaQueueRegistry(ctx, serviceId, config)
  ctx.info('Kafka queue initialized', { serviceId })
}

export async function closeQueue (): Promise<void> {
  if (queueRegistry !== undefined) {
    await queueRegistry.close()
    queueRegistry = undefined
  }
}

export async function getProducer (key: string): Promise<Producer> {
  if (queueRegistry === undefined) {
    throw new Error('Queue not initialized')
  }
  return await queueRegistry.getProducer(key)
}
export class KafkaQueueRegistry {
  private readonly kafka: Kafka
  private readonly producers = new Map<string, Producer>()

  constructor (
    private readonly ctx: MeasureContext,
    serviceId: string,
    serviceConfig: BaseConfig
  ) {
    this.kafka = getKafkaQueue(serviceId, serviceConfig)

    ctx.info('Kafka client created', { serviceId })
  }

  public async getProducer (key: string): Promise<Producer> {
    const producer = this.producers.get(key)
    if (producer !== undefined) {
      return producer
    }

    const kafkaProducer = this.kafka.producer()

    await kafkaProducer.connect()

    this.producers.set(key, kafkaProducer)
    this.ctx.info('Created new Kafka producer', { key })

    return kafkaProducer
  }

  public async close (): Promise<void> {
    for (const [topic, producer] of this.producers.entries()) {
      try {
        await producer.disconnect()
        this.ctx.info('Kafka producer closed', { topic })
      } catch (err) {
        this.ctx.error('Failed to close Kafka producer', { topic, error: err })
      }
    }

    this.producers.clear()
    this.ctx.info('KafkaQueueRegistry closed')
  }
}

function getKafkaQueue (serviceId: string, serviceConfig: BaseConfig): Kafka {
  const { QueueConfig, QueueRegion } = serviceConfig
  if (QueueConfig === undefined) {
    throw new Error('Please provide queue config')
  }
  const config = parseQueueConfig(QueueConfig, serviceId, QueueRegion)
  return new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    ssl: config.ssl
  })
}
