//
// Copyright © 2026 TraceX SAS.
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

import type { MeasureContext } from '@hcengineering/core'
import { QueueTopic, type AuditRecord, type QueueProducerOptions } from '@hcengineering/server-core'
import type { EachMessagePayload, ConsumerRunConfig, ProducerConfig, ConsumerConfig } from 'kafkajs'
import { createPlatformQueue, type QueueConfig } from '../index'

const mockSend = jest.fn().mockResolvedValue(undefined)
const mockRun = jest.fn().mockResolvedValue(undefined)
const mockSubscribe = jest.fn().mockResolvedValue(undefined)
const mockConnect = jest.fn().mockResolvedValue(undefined)
const mockDisconnect = jest.fn().mockResolvedValue(undefined)
const mockProducer = jest.fn((_config: ProducerConfig) => ({
  connect: mockConnect,
  send: mockSend,
  disconnect: mockDisconnect
}))
const mockConsumer = jest.fn((_config: ConsumerConfig) => ({
  connect: mockConnect,
  subscribe: mockSubscribe,
  run: mockRun,
  on: jest.fn(),
  disconnect: mockDisconnect
}))
jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({ producer: mockProducer, consumer: mockConsumer })),
  Partitioners: { DefaultPartitioner: jest.fn() },
  CompressionTypes: { GZIP: 1 }
}))

const logs: Partial<MeasureContext> = {
  with: async (_name, _params, action) => await action(logs as MeasureContext),
  extractMeta: () => ({}),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}
const ctx = logs as MeasureContext
const config: QueueConfig = { clientId: 'test', brokers: ['localhost:19092'], region: 'region-a', postfix: '-test' }

beforeEach(() => {
  jest.clearAllMocks()
})

test('audit topic is global, explicitly provisioned, idempotent and acknowledged by replicas', async () => {
  const queue = createPlatformQueue(config)
  const options: QueueProducerOptions = {
    allowAutoTopicCreation: false,
    idempotent: true,
    maxInFlightRequests: 1,
    retry: { retries: 2, initialRetryTime: 300, maxRetryTime: 1000 },
    acks: -1,
    timeout: 5000
  }
  await queue.getProducer(ctx, QueueTopic.Audit, options).send(ctx, undefined, [{ eventId: 'one' }], 'one')
  expect(mockProducer).toHaveBeenCalledWith(
    expect.objectContaining({ allowAutoTopicCreation: false, idempotent: true, maxInFlightRequests: 1 })
  )
  expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ topic: 'audit-test', acks: -1, timeout: 5000 }))
  const message = mockSend.mock.calls[0][0].messages[0]
  expect(message.headers.workspace).toBeUndefined()
  expect(message.key.toString()).toBe('one')
  await queue.shutdown()
})

test('ordinary topics retain their regional routing and producer configuration', async () => {
  const queue = createPlatformQueue(config)
  await queue.getProducer(ctx, QueueTopic.Workspace).send(ctx, undefined, [{}])
  expect(mockSend.mock.calls[0][0].topic).toBe('region-a.workspace-test')
  expect(mockProducer.mock.calls[0][0]).not.toHaveProperty('idempotent')
  await queue.shutdown()
})

test('database failure keeps the message handler pending until successful redelivery', async () => {
  const queue = createPlatformQueue(config)
  const onMessage = jest.fn().mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue(undefined)
  queue.createConsumer(ctx, QueueTopic.Audit, 'audit-group', onMessage, {
    fromBegining: true,
    retryDelay: 1,
    allowAutoTopicCreation: false,
    partitionsConsumedConcurrently: 3
  })
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(mockSubscribe).toHaveBeenCalledWith({ topic: 'audit-test', fromBeginning: true })
  expect(mockConsumer).toHaveBeenCalledWith(expect.objectContaining({ allowAutoTopicCreation: false }))
  expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({ partitionsConsumedConcurrently: 3 }))
  const run: ConsumerRunConfig = mockRun.mock.calls[0][0]
  const payload: Partial<EachMessagePayload> = {
    topic: 'audit-test',
    partition: 0,
    message: {
      key: Buffer.from('id'),
      value: Buffer.from('{"eventId":"one"}'),
      timestamp: '1',
      attributes: 0,
      offset: '0',
      headers: {}
    },
    heartbeat: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn()
  }
  await run.eachMessage?.(payload as EachMessagePayload)
  expect(onMessage).toHaveBeenCalledTimes(2)
  expect(payload.heartbeat).toHaveBeenCalledTimes(1)
  expect(logs.error).toHaveBeenCalledWith(
    'Queue message processing failed; message will be retried',
    expect.objectContaining({ offset: '0' })
  )
  await queue.shutdown()
})

test('malformed JSON stays unacknowledged and shutdown interrupts retry without success', async () => {
  const queue = createPlatformQueue(config)
  const onMessage = jest.fn()
  queue.createConsumer(ctx, 'custom-topic', 'test-group', onMessage, { retryDelay: 1 })
  await new Promise<void>((resolve) => setImmediate(resolve))
  const run: ConsumerRunConfig = mockRun.mock.calls[0][0]
  const payload: Partial<EachMessagePayload> = {
    topic: 'audit-test',
    partition: 0,
    message: {
      key: Buffer.from('id'),
      value: Buffer.from('invalid-json'),
      timestamp: '1',
      attributes: 0,
      offset: '0',
      headers: {}
    },
    heartbeat: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn()
  }
  const result = run.eachMessage?.(payload as EachMessagePayload).catch((error: unknown) => error)
  await new Promise<void>((resolve) => setImmediate(resolve))
  await queue.shutdown()
  expect(await result).toBeInstanceOf(Error)
  expect(onMessage).not.toHaveBeenCalled()
  expect(logs.error).toHaveBeenCalledWith(
    'Queue message processing failed; message will be retried',
    expect.objectContaining({ errorType: 'SyntaxError' })
  )
})

test('the first send after a failed eager connection reconnects and publishes the same event', async () => {
  mockConnect.mockRejectedValueOnce(new Error('startup broker unavailable'))
  const queue = createPlatformQueue(config)
  const producer = queue.getProducer(ctx, 'recovery-topic')
  await new Promise<void>((resolve) => setImmediate(resolve))
  const event: Pick<AuditRecord, 'eventId'> = { eventId: 'first-after-recovery' }
  await producer.send(ctx, undefined, [event], event.eventId)
  expect(mockConnect).toHaveBeenCalledTimes(2)
  expect(mockSend).toHaveBeenCalledTimes(1)
  expect(JSON.parse(mockSend.mock.calls[0][0].messages[0].value.toString())).toEqual(event)
  await queue.shutdown()
})

test('invalid metadata stays in the protected retry loop without reaching the domain handler', async () => {
  const queue = createPlatformQueue(config)
  const onMessage = jest.fn()
  queue.createConsumer(ctx, 'custom-topic', 'test-group', onMessage, { retryDelay: 1 })
  await new Promise<void>((resolve) => setImmediate(resolve))
  const run: ConsumerRunConfig = mockRun.mock.calls[0][0]
  const payload: Partial<EachMessagePayload> = {
    topic: 'audit-test',
    partition: 0,
    message: {
      key: Buffer.from('id'),
      value: Buffer.from('{}'),
      timestamp: '1',
      attributes: 0,
      offset: '0',
      headers: { meta: Buffer.from('{') }
    },
    heartbeat: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn()
  }
  const result = run.eachMessage?.(payload as EachMessagePayload).catch((error: unknown) => error)
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(payload.heartbeat).toHaveBeenCalled()
  expect(onMessage).not.toHaveBeenCalled()
  expect(logs.error).toHaveBeenCalledWith(
    'Queue message processing failed; message will be retried',
    expect.objectContaining({ errorType: 'SyntaxError' })
  )
  await queue.shutdown()
  expect(await result).toBeInstanceOf(Error)
})

test('delivery options apply to arbitrary topics and conflicting cached options are rejected', async () => {
  const queue = createPlatformQueue(config)
  const options: QueueProducerOptions = {
    allowAutoTopicCreation: false,
    idempotent: true,
    maxInFlightRequests: 1,
    retry: { retries: 2 },
    acks: 1,
    timeout: 2000
  }
  const producer = queue.getProducer(ctx, 'custom-topic', options)
  expect(queue.getProducer(ctx, 'custom-topic', options)).toBe(producer)
  expect(() => queue.getProducer(ctx, 'custom-topic')).toThrow('Conflicting producer options')
  await producer.send(ctx, undefined, [{}])
  expect(mockProducer).toHaveBeenCalledWith(expect.objectContaining({ idempotent: true, retry: { retries: 2 } }))
  expect(mockSend).toHaveBeenCalledWith(
    expect.objectContaining({ topic: 'region-a.custom-topic-test', acks: 1, timeout: 2000 })
  )
  expect(mockConnect).toHaveBeenCalledTimes(1)
  await producer.send(ctx, undefined, [{}])
  expect(mockConnect).toHaveBeenCalledTimes(1)
  await queue.shutdown()
})
