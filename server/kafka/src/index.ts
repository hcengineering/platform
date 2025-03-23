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

function getKafkaTopicId (topic: QueueTopic, config: QueueConfig): string {
  if (config.region !== '') {
    return `${config.region}.${topic}${config.postfix ?? ''}`
  }
  return `${topic}${config.postfix ?? ''}`
}

class PlatformQueueImpl implements PlatformQueue {
  constructor (
    private readonly kafka: Kafka,
    readonly config: QueueConfig
  ) {}

  getClientId (): string {
    return this.config.clientId
  }

  createProducer<T>(ctx: MeasureContext, topic: QueueTopic): PlatformQueueProducer<T> {
    return new PlatformQueueProducerImpl(ctx, this.kafka, getKafkaTopicId(topic, this.config))
  }

  createConsumer<T>(
    ctx: MeasureContext,
    topic: QueueTopic,
    groupId: string,
    onMessage: (msg: ConsumerMessage<T>[], queue: ConsumerControl) => Promise<void>,
    options?: {
      fromBegining?: boolean
    }
  ): ConsumerHandle {
    return new PlatformQueueConsumerImpl(ctx, this.kafka, this.config, topic, groupId, onMessage, options)
  }

  async createTopics (tx: number): Promise<void> {
    const topics = new Set(await this.kafka.admin({}).listTopics())
    if (!topics.has(QueueTopic.Tx)) {
      await this.kafka.admin().createTopics({
        topics: [
          {
            topic: getKafkaTopicId(QueueTopic.Tx, this.config),
            numPartitions: tx
          }
        ]
      })
    }
  }
}

class PlatformQueueProducerImpl implements PlatformQueueProducer<any> {
  txProducer: Producer
  connected: Promise<void> | undefined
  constructor (
    readonly ctx: MeasureContext,
    kafka: Kafka,
    private readonly topic: string
  ) {
    this.txProducer = kafka.producer({
      allowAutoTopicCreation: true,
      createPartitioner: Partitioners.DefaultPartitioner
    })
    this.connected = this.ctx.with('connect-broker', {}, () => this.txProducer.connect())
  }

  async send (id: WorkspaceUuid | string, msgs: any[]): Promise<void> {
    if (this.connected !== undefined) {
      await this.connected
      this.connected = undefined
    }
    await this.ctx.with('send', { topic: this.topic }, () =>
      this.txProducer.send({
        topic: this.topic,
        messages: msgs.map((m) => ({
          key: Buffer.from(`${id}`),
          value: Buffer.from(JSON.stringify(m))
        }))
      })
    )
  }

  async close (): Promise<void> {
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
    private readonly topic: QueueTopic,
    groupId: string,
    private readonly onMessage: (msg: ConsumerMessage<any>[], queue: ConsumerControl) => Promise<void>,
    private readonly options?: {
      fromBegining?: boolean
    }
  ) {
    this.cc = this.kafka.consumer({ groupId: `${getKafkaTopicId(this.topic, this.config)}-${groupId}` })

    void this.start().catch((err) => {
      ctx.error('failed to consume', { err })
    })
  }

  async start (): Promise<void> {
    await this.doConnect()
    await this.doSubscribe()

    await this.cc.run({
      eachMessage: async ({ topic, message, pause, heartbeat }) => {
        await this.onMessage(
          [
            {
              id: message.key?.toString() ?? '',
              value: [JSON.parse(message.value?.toString() ?? '{}')]
            }
          ],
          {
            heartbeat,
            pause
          }
        )
      }
      // , // TODO: Finish testinf
      // eachBatch: async ({ batch, pause, heartbeat, resolveOffset }) => {
      //   const queueInfo = {
      //     pause,
      //     heartbeat
      //   }
      //   const batchMessages = batch.messages

      //   const currentMsg: ConsumerMessage<any> = {
      //     id: '',
      //     value: []
      //   }
      //   let lastOffset: string = ' '

      //   const sendLast = async (): Promise<void> => {
      //     await this.onMessage([currentMsg], queueInfo)
      //     // Mark last offset as cusomed
      //     resolveOffset(lastOffset)
      //     await heartbeat()
      //   }

      //   for (const v of batchMessages) {
      //     const id = v.key?.toString() ?? ''
      //     if (currentMsg.id !== id && currentMsg.value.length > 0) {
      //       await sendLast() // Send last message
      //       currentMsg.id = id
      //       currentMsg.value = []
      //     }
      //     lastOffset = v.offset
      //     currentMsg.value.push(JSON.parse(v.value?.toString() ?? '{}'))
      //   }
      //   await sendLast()
      // }
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

  shutdown (): Promise<void> {
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
