//
// Copyright © 2026 TraceX SAS.
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
  isGlobalQueueTopic,
  type ConsumerControl,
  type ConsumerHandle,
  type ConsumerMessage,
  type PlatformQueue,
  type PlatformQueueProducer,
  type QueueProducerOptions,
  type QueueConsumerOptions
} from '@hcengineering/server-core'
import { Kafka, Partitioners, type Consumer, type Producer, CompressionTypes } from 'kafkajs'
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
  if (config.region !== '' && !isGlobalQueueTopic(topic)) {
    return `${config.region}.${topic}${config.postfix ?? ''}`
  }
  return `${topic}${config.postfix ?? ''}`
}

function producerOptionsKey (options: QueueProducerOptions): string {
  return JSON.stringify([
    options.allowAutoTopicCreation ?? true,
    options.idempotent ?? false,
    options.maxInFlightRequests,
    options.retry?.retries,
    options.retry?.initialRetryTime,
    options.retry?.maxRetryTime,
    options.acks ?? -1,
    options.timeout ?? 30000
  ])
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

  getProducer<T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    options: QueueProducerOptions = {}
  ): PlatformQueueProducer<T> {
    const producer = this.producers.get(topic)
    if (producer !== undefined && !producer.isClosed()) {
      if (!producer.matchesOptions(options)) throw new TypeError(`Conflicting producer options for topic ${topic}`)
      return producer
    }

    const created = new PlatformQueueProducerImpl(ctx, this.kafka, getKafkaTopicId(topic, this.config), this, options)
    this.producers.set(topic, created)

    return created
  }

  createConsumer<T>(
    ctx: MeasureContext,
    topic: QueueTopic | string,
    groupId: string,
    onMessage: (ctx: MeasureContext, msg: ConsumerMessage<T>, queue: ConsumerControl) => Promise<void>,
    options?: QueueConsumerOptions
  ): ConsumerHandle {
    const result = new PlatformQueueConsumerImpl(ctx, this.kafka, this.config, topic, groupId, onMessage, options)
    this.consumers.push(result)
    return result
  }

  async checkCreateTopic (topic: QueueTopic | string, topics: Set<string>, numPartitions?: number): Promise<void> {
    const kTopic = getKafkaTopicId(topic, this.config)
    if (!topics.has(kTopic)) {
      const admin = this.kafka.admin()
      try {
        await admin.connect()
        await admin.createTopics({ topics: [{ topic: kTopic, numPartitions: numPartitions ?? 1 }] })
      } catch (err: any) {
        console.error('Failed to create topic', kTopic, err)
      } finally {
        await admin.disconnect()
      }
    }
  }

  async createTopic (topics: string | string[], partitions: number): Promise<void> {
    const admin = this.kafka.admin()
    try {
      await admin.connect()
      const existing = new Set(await admin.listTopics())
      topics = Array.isArray(topics) ? topics : [topics]
      for (const topic of topics) {
        await this.checkCreateTopic(topic, existing, partitions)
      }
    } finally {
      await admin.disconnect()
    }
  }

  async createTopics (tx: number): Promise<void> {
    const admin = this.kafka.admin()
    try {
      await admin.connect()
      const topics = new Set(await admin.listTopics())
      await this.checkCreateTopic(QueueTopic.Tx, topics, tx)
      await this.checkCreateTopic(QueueTopic.Fulltext, topics, 1)
      await this.checkCreateTopic(QueueTopic.Workspace, topics, 1)
      await this.checkCreateTopic(QueueTopic.Users, topics, 1)
      await this.checkCreateTopic(QueueTopic.Process, topics, 1)
      await this.checkCreateTopic(QueueTopic.AIQueue, topics, 10)
      await this.checkCreateTopic(QueueTopic.TranscriptionQueue, topics, 10)
      await this.checkCreateTopic(QueueTopic.NotificationQueue, topics, 2)
      await this.checkCreateTopic(QueueTopic.LoveQueue, topics, 1)
      await this.checkCreateTopic(QueueTopic.WorkspaceMemberUnread, topics, 2)
      await this.checkCreateTopic(QueueTopic.Audit, topics, 3)
    } finally {
      await admin.disconnect()
    }
  }

  async checkDeleteTopic (admin: any, topic: QueueTopic | string, topics: Set<string>): Promise<void> {
    const kTopic = getKafkaTopicId(topic, this.config)
    if (topics.has(kTopic)) {
      try {
        await admin.deleteTopics({ topics: [kTopic] })
      } catch (err: any) {
        console.error('Failed to delete topic', kTopic, err)
      }
    }
  }

  async deleteTopics (topics?: (QueueTopic | string)[]): Promise<void> {
    const admin = this.kafka.admin()
    try {
      await admin.connect()
      const existing = new Set(await admin.listTopics())
      if (topics !== undefined) {
        for (const t of topics) {
          await this.checkDeleteTopic(admin, t, existing)
        }
      } else {
        await this.checkDeleteTopic(admin, QueueTopic.Tx, existing)
        await this.checkDeleteTopic(admin, QueueTopic.Fulltext, existing)
        await this.checkDeleteTopic(admin, QueueTopic.Workspace, existing)
        await this.checkDeleteTopic(admin, QueueTopic.Users, existing)
      }
    } finally {
      await admin.disconnect()
    }
  }
}

class PlatformQueueProducerImpl implements PlatformQueueProducer<any> {
  txProducer: Producer
  connected: Promise<void> | undefined
  private closed = false
  private readonly options: QueueProducerOptions

  constructor (
    readonly ctx: MeasureContext,
    kafka: Kafka,
    private readonly topic: string,
    private readonly queue: PlatformQueue,
    options: QueueProducerOptions = {}
  ) {
    this.options = { ...options, retry: options.retry !== undefined ? { ...options.retry } : undefined }
    const { acks: _acks, timeout: _timeout, ...producerOptions } = this.options
    this.txProducer = kafka.producer({
      allowAutoTopicCreation: true,
      ...producerOptions,
      createPartitioner: Partitioners.DefaultPartitioner
    })
    this.connected = this.connect()
  }

  private connect (): Promise<void> {
    const connection = this.ctx.with('connect-broker', {}, () => this.txProducer.connect())
    // Reset failed startup connections for every producer, preserving successful connections.
    void connection.catch(() => {
      if (this.connected === connection) this.connected = undefined
    })
    return connection
  }

  matchesOptions (options: QueueProducerOptions): boolean {
    return producerOptionsKey(this.options) === producerOptionsKey(options)
  }

  getQueue (): PlatformQueue {
    return this.queue
  }

  async send (
    ctx: MeasureContext,
    workspace: WorkspaceUuid | undefined,
    msgs: any[],
    partitionKey?: string
  ): Promise<void> {
    if (this.closed) throw new Error('Queue producer is closed')
    this.connected ??= this.connect()
    await this.connected
    await this.ctx.with('send', { topic: this.topic }, () =>
      this.txProducer.send({
        topic: this.topic,
        messages: msgs.map((m) => ({
          key: Buffer.from(partitionKey ?? workspace ?? ''),
          value: Buffer.from(JSON.stringify(m)),
          headers: {
            ...(workspace !== undefined ? { workspace } : {}),
            meta: JSON.stringify(ctx.extractMeta())
          }
        })),
        compression: CompressionTypes.GZIP,
        ...(this.options.acks !== undefined ? { acks: this.options.acks } : {}),
        ...(this.options.timeout !== undefined ? { timeout: this.options.timeout } : {})
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
  private closed = false
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
    private readonly options?: QueueConsumerOptions
  ) {
    // Long handlers must call ConsumerControl.heartbeat(); these timeouts still help under broker/load jitter (e.g. Redpanda in Docker).
    const sessionTimeout = parseInt(process.env.KAFKA_CONSUMER_SESSION_TIMEOUT_MS ?? '90000', 10)
    this.cc = this.kafka.consumer({
      groupId: `${getKafkaTopicId(this.topic, this.config)}-${groupId}`,
      allowAutoTopicCreation: options?.allowAutoTopicCreation ?? true,
      sessionTimeout,
      rebalanceTimeout: Math.min(sessionTimeout * 2, 300000),
      heartbeatInterval: 3000
    })

    void this.start().catch((err) => {
      ctx.error('failed to consume', { err })
    })
  }

  async start (): Promise<void> {
    await this.doConnect()
    await this.doSubscribe()

    await this.cc.run({
      ...(this.options?.partitionsConsumedConcurrently !== undefined
        ? { partitionsConsumedConcurrently: this.options.partitionsConsumedConcurrently }
        : {}),
      eachMessage: async (payload) => {
        const { message } = payload
        const msgKey = message.key?.toString() ?? ''
        const workspace = (message.headers?.workspace?.toString() ?? msgKey) as WorkspaceUuid

        const retryDelay = this.options?.retryDelay ?? 1000
        const maxRetryDelay = this.options?.maxRetryDelay ?? 10
        let to = 1
        while (!this.closed) {
          try {
            const value: unknown = JSON.parse(message.value?.toString() ?? '{}')
            const meta = JSON.parse(message.headers?.meta?.toString() ?? '{}')
            await this.ctx.with(
              'handle-msg',
              {},
              (ctx) =>
                this.onMessage(
                  ctx,
                  { workspace, value },
                  { heartbeat: () => payload.heartbeat(), pause: () => payload.pause() }
                ),
              {},
              {
                meta
              }
            )
            return
          } catch (err: any) {
            if (this.closed) throw err
            this.ctx.error('Queue message processing failed; message will be retried', {
              topic: payload.topic,
              partition: payload.partition,
              offset: message.offset,
              errorType: err instanceof Error ? err.name : 'UnknownError'
            })
            await payload.heartbeat()
            await new Promise((resolve) => setTimeout(resolve, to * retryDelay))
            if (to < maxRetryDelay) {
              to++
            }
          }
        }
        // Never resolve an interrupted handler: that would acknowledge an unsaved event.
        throw new Error('Queue consumer closed before message processing completed')
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
    this.closed = true
    return this.cc.disconnect()
  }
}

/**
 * Constructs a platform queue.
 */
export function getPlatformQueue (serviceId: string, region?: string): PlatformQueue {
  const queueConfig = process.env.QUEUE_CONFIG ?? 'tracex.local:9092'
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
