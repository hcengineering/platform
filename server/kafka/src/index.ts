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

import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import {
  QueueTopic,
  type ConsumerControl,
  type ConsumerHandle,
  type ConsumerMessage,
  type PlatformQueue,
  type PlatformQueueProducer
} from '@hcengineering/server-core'
import { Kafka, Partitioners, type Consumer, type Producer } from 'kafkajs'
import type * as tls from 'tls'

export interface QueueConfig {
  postfix: string // a topic prefix to be used do distinguish between staging and production topics in same broker
  brokers: string[]
  clientId: string
  region: string

  ssl?: tls.ConnectionOptions | boolean
}

/**
 * Query config parser in the form of 'brokers;clientId'
 * brokers are comma separated
 */
export function parseQueueConfig (config: string, serviceId: string, region: string): QueueConfig {
  const [brokers, postfix] = config.split(';')
  return {
    postfix: postfix ?? '', // Empty by default
    brokers: brokers.split(','),
    clientId: serviceId,
    region
  }
}

function getKafkaTopicId (topic: QueueTopic | string, config: QueueConfig): string {
  if (config.region !== '') {
    return `${config.region}.${topic}${config.postfix ?? ''}`
  }
  return `${topic}${config.postfix ?? ''}`
}

class PlatformQueueImpl implements PlatformQueue {
  consumers: ConsumerHandle[] = []
  producers = new Map<QueueTopic | string, PlatformQueueProducerImpl>()
  constructor (
    private readonly kafka: Kafka,
    readonly config: QueueConfig
  ) {}

  getClientId (): string {
    return this.config.clientId
  }

  async shutdown (): Promise<void> {
    for (const [, p] of this.producers) {
      try {
        await p.close()
      } catch (err: any) {
        console.error('failed to close producer', err)
      }
    }
    for (const c of this.consumers) {
      try {
        await c.close()
      } catch (err: any) {
        console.error('failed to close consumer', err)
      }
    }
  }

  getProducer<T>(ctx: MeasureContext, topic: QueueTopic | string): PlatformQueueProducer<T> {
    const producer = this.producers.get(topic)
    if (producer !== undefined && !producer.isClosed()) return producer

    const created = new PlatformQueueProducerImpl(ctx, this.kafka, getKafkaTopicId(topic, this.config), this)
    this.producers.set(topic, created)

    return created
  }

  createConsumer<T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    groupId: string,
    onMessage: (ctx: MeasureContext, msg: ConsumerMessage<T>, queue: ConsumerControl) => Promise<void>,
    options?: {
      fromBegining?: boolean
    }
  ): ConsumerHandle {
    const result = new PlatformQueueConsumerImpl(ctx, this.kafka, this.config, topic, groupId, onMessage, options)
    this.consumers.push(result)
    return result
  }

  async checkCreateTopic (topic: QueueTopic | string, topics: Set<string>, numPartitions?: number): Promise<void> {
    const kTopic = getKafkaTopicId(topic, this.config)
    if (!topics.has(kTopic)) {
      try {
        await this.kafka.admin().createTopics({ topics: [{ topic: kTopic, numPartitions: numPartitions ?? 1 }] })
      } catch (err: any) {
        console.error('Failed to create topic', kTopic, err)
      }
    }
  }

  async createTopic (topics: string | string[], partitions: number): Promise<void> {
    const existing = new Set(await this.kafka.admin({}).listTopics())
    topics = Array.isArray(topics) ? topics : [topics]
    for (const topic of topics) {
      await this.checkCreateTopic(topic, existing, partitions)
    }
  }

  async createTopics (tx: number): Promise<void> {
    const topics = new Set(await this.kafka.admin({}).listTopics())
    await this.checkCreateTopic(QueueTopic.Tx, topics, tx)
    await this.checkCreateTopic(QueueTopic.Fulltext, topics, 1)
    await this.checkCreateTopic(QueueTopic.Workspace, topics, 1)
    await this.checkCreateTopic(QueueTopic.Users, topics, 1)
    await this.checkCreateTopic(QueueTopic.Process, topics, 1)
  }

  async checkDeleteTopic (topic: QueueTopic | string, topics: Set<string>): Promise<void> {
    const kTopic = getKafkaTopicId(topic, this.config)
    if (topics.has(kTopic)) {
      try {
        await this.kafka.admin().deleteTopics({ topics: [kTopic] })
      } catch (err: any) {
        console.error('Failed to delete topic', kTopic, err)
      }
    }
  }

  async deleteTopics (topics?: (QueueTopic | string)[]): Promise<void> {
    const existing = new Set(await this.kafka.admin({}).listTopics())
    if (topics !== undefined) {
      for (const t of topics) {
        await this.checkDeleteTopic(t, existing)
      }
    } else {
      await this.checkDeleteTopic(QueueTopic.Tx, existing)
      await this.checkDeleteTopic(QueueTopic.Fulltext, existing)
      await this.checkDeleteTopic(QueueTopic.Workspace, existing)
      await this.checkDeleteTopic(QueueTopic.Users, existing)
    }
  }
}

class PlatformQueueProducerImpl implements PlatformQueueProducer<any> {
  txProducer: Producer
  connected: Promise<void> | undefined
  private closed = false

  constructor (
    readonly ctx: MeasureContext,
    kafka: Kafka,
    private readonly topic: string,
    private readonly queue: PlatformQueue
  ) {
    this.txProducer = kafka.producer({
      allowAutoTopicCreation: true,
      createPartitioner: Partitioners.DefaultPartitioner
    })
    this.connected = this.ctx.with('connect-broker', {}, () => this.txProducer.connect())
  }

  getQueue (): PlatformQueue {
    return this.queue
  }

  async send (ctx: MeasureContext, workspace: WorkspaceUuid, msgs: any[], partitionKey?: string): Promise<void> {
    if (this.connected !== undefined) {
      await this.connected
      this.connected = undefined
    }
    await this.ctx.with('send', { topic: this.topic }, () =>
      this.txProducer.send({
        topic: this.topic,
        messages: msgs.map((m) => ({
          key: Buffer.from(`${partitionKey ?? workspace}`),
          value: Buffer.from(JSON.stringify(m)),
          headers: {
            workspace,
            meta: JSON.stringify(ctx.extractMeta())
          }
        }))
      })
    )
  }

  isClosed (): boolean {
    return this.closed
  }

  async close (): Promise<void> {
    this.closed = true
    await this.ctx.with('disconnect', {}, () => this.txProducer.disconnect())
  }
}

class PlatformQueueConsumerImpl implements ConsumerHandle {
  connected = false
  cc: Consumer
  constructor (
    readonly ctx: MeasureContext,
    readonly kafka: Kafka,
    readonly config: QueueConfig,
    private readonly topic: QueueTopic | string,
    groupId: string,
    private readonly onMessage: (
      ctx: MeasureContext,
      msg: ConsumerMessage<any>,
      queue: ConsumerControl
    ) => Promise<void>,
    private readonly options?: {
      fromBegining?: boolean
    }
  ) {
    this.cc = this.kafka.consumer({
      groupId: `${getKafkaTopicId(this.topic, this.config)}-${groupId}`,
      allowAutoTopicCreation: true
    })

    void this.start().catch((err) => {
      ctx.error('failed to consume', { err })
    })
  }

  async start (): Promise<void> {
    await this.doConnect()
    await this.doSubscribe()

    await this.cc.run({
      eachMessage: async ({ topic, message, pause, heartbeat }) => {
        const msgKey = message.key?.toString() ?? ''
        const msgData = JSON.parse(message.value?.toString() ?? '{}')
        const meta = JSON.parse(message.headers?.meta?.toString() ?? '{}')
        const workspace = (message.headers?.workspace?.toString() ?? msgKey) as WorkspaceUuid

        let to = 1
        while (true) {
          try {
            await this.ctx.with(
              'handle-msg',
              {},
              (ctx) => this.onMessage(ctx, { workspace, value: msgData }, { heartbeat, pause }),
              {},
              {
                meta
              }
            )
            break
          } catch (err: any) {
            this.ctx.error('failed to process message', { err, msgKey, msgData, workspace })
            await heartbeat()
            await new Promise((resolve) => setTimeout(resolve, to * 1000))
            if (to < 10) {
              to++
            }
          }
        }
      }
    })
  }

  async doConnect (): Promise<void> {
    this.cc.on('consumer.connect', () => {
      this.connected = true
      this.ctx.info('consumer connected to queue')
    })
    this.cc.on('consumer.disconnect', () => {
      this.connected = false
      this.ctx.warn('consumer disconnected from queue')
    })
    await this.cc.connect()
  }

  async doSubscribe (): Promise<void> {
    await this.cc.subscribe({
      topic: getKafkaTopicId(this.topic, this.config),
      fromBeginning: this.options?.fromBegining
    })
  }

  isConnected (): boolean {
    return this.connected
  }

  close (): Promise<void> {
    return this.cc.disconnect()
  }
}

/**
 * Constructs a platform queue.
 */
export function getPlatformQueue (serviceId: string, region?: string): PlatformQueue {
  const queueConfig = process.env.QUEUE_CONFIG ?? 'huly.local:9092'
  if (queueConfig === undefined) {
    throw new Error('Please provide queue config')
  }
  const config = parseQueueConfig(queueConfig, serviceId, region ?? process.env.REGION ?? '')
  return createPlatformQueue(config)
}

export function createPlatformQueue (config: QueueConfig): PlatformQueue {
  console.info({ message: 'Using queue', config })

  return new PlatformQueueImpl(
    new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl
    }),
    config
  )
}
