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

interface QueueRequest {
  entry: {
    correlationId: number
    apiKey: number
    apiName: string
    apiVersion: number
    resolve: jest.Mock<void, [unknown]>
    reject: jest.Mock<void, [unknown]>
  }
  expectResponse: boolean
  sendRequest: jest.Mock<void, []>
}

interface QueueResponse {
  correlationId: number
  size: number
  payload: Buffer
}

interface RequestQueueOptions {
  maxInFlightRequests: number
  requestTimeout: number
  enforceRequestTimeout: boolean
  clientId: string
  broker: string
  logger: { debug: jest.Mock<void, [string]> }
}

// KafkaJS does not publish declarations for this internal queue.
interface RequestQueue {
  throttledUntil: number
  throttleCheckTimeoutId: NodeJS.Timeout | null
  inflight: Map<number, unknown>
  pending: QueueRequest[]
  push: (request: QueueRequest) => void
  fulfillRequest: (response: QueueResponse) => void
  checkPendingRequests: () => void
  scheduleCheckPendingRequests: () => void
  scheduleRequestTimeoutCheck: () => void
  waitForPendingRequests: () => Promise<void>
  destroy: () => void
}

const RequestQueue = require('kafkajs/src/network/requestQueue') as new (options: RequestQueueOptions) => RequestQueue

function createRequest (correlationId: number): QueueRequest {
  return {
    entry: {
      correlationId,
      apiKey: 3,
      apiName: 'Metadata',
      apiVersion: 0,
      resolve: jest.fn(),
      reject: jest.fn()
    },
    expectResponse: true,
    sendRequest: jest.fn()
  }
}

function fulfillRequest (queue: RequestQueue, correlationId: number): void {
  queue.fulfillRequest({ correlationId, size: 0, payload: Buffer.alloc(0) })
}

describe('KafkaJS request queue patch', () => {
  let queue: RequestQueue

  beforeEach(() => {
    jest.useFakeTimers()
    queue = new RequestQueue({
      maxInFlightRequests: 1,
      requestTimeout: 1000,
      enforceRequestTimeout: true,
      clientId: 'request-queue-test',
      broker: 'localhost:9092',
      logger: { debug: jest.fn() }
    })
  })

  afterEach(() => {
    queue.destroy()
    jest.useRealTimers()
  })

  it('does not schedule checks for an empty queue without active throttling', () => {
    queue.checkPendingRequests()
    expect(jest.getTimerCount()).toBe(0)

    queue.throttledUntil = Date.now()
    queue.checkPendingRequests()
    expect(jest.getTimerCount()).toBe(0)

    queue.throttledUntil = Date.now() - 1
    queue.checkPendingRequests()
    expect(jest.getTimerCount()).toBe(0)
  })

  it('schedules one check for an empty throttled queue and stops when throttling expires', () => {
    const checkPendingRequests = jest.spyOn(queue, 'checkPendingRequests')
    queue.throttledUntil = Date.now() + 100
    queue.checkPendingRequests()
    const timer = queue.throttleCheckTimeoutId

    queue.scheduleCheckPendingRequests()
    expect(queue.throttleCheckTimeoutId).toBe(timer)
    expect(jest.getTimerCount()).toBe(1)

    jest.advanceTimersByTime(99)
    expect(checkPendingRequests).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(1)
    expect(checkPendingRequests).toHaveBeenCalledTimes(2)
    expect(jest.getTimerCount()).toBe(0)

    jest.advanceTimersByTime(1000)
    expect(checkPendingRequests).toHaveBeenCalledTimes(2)
  })

  it('reuses the throttle timer when a request arrives in an empty throttled queue', () => {
    queue.throttledUntil = Date.now() + 100
    queue.checkPendingRequests()
    const timer = queue.throttleCheckTimeoutId

    jest.advanceTimersByTime(50)
    const request = createRequest(1)
    queue.push(request)
    expect(queue.throttleCheckTimeoutId).toBe(timer)
    expect(jest.getTimerCount()).toBe(1)

    jest.advanceTimersByTime(49)
    expect(request.sendRequest).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(request.sendRequest).toHaveBeenCalledTimes(1)
    expect(queue.pending).toHaveLength(0)
    expect(jest.getTimerCount()).toBe(0)
    fulfillRequest(queue, 1)
  })

  it('reschedules an existing timer when throttling is extended without sending early', () => {
    const request = createRequest(1)
    queue.throttledUntil = Date.now() + 100
    queue.push(request)
    const timer = queue.throttleCheckTimeoutId

    jest.advanceTimersByTime(50)
    queue.throttledUntil = Date.now() + 200
    queue.checkPendingRequests()
    expect(queue.throttleCheckTimeoutId).toBe(timer)
    expect(jest.getTimerCount()).toBe(1)

    jest.advanceTimersByTime(50)
    expect(request.sendRequest).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(1)
    jest.advanceTimersByTime(149)
    expect(request.sendRequest).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(request.sendRequest).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
    fulfillRequest(queue, 1)
  })

  it('returns to idle after a response without arming a polling timer', () => {
    const request = createRequest(1)
    queue.push(request)
    fulfillRequest(queue, 1)

    expect(request.entry.resolve).toHaveBeenCalledTimes(1)
    expect(queue.inflight.size).toBe(0)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('sends a pending request when throttling expires and stops polling', () => {
    const request = createRequest(1)
    queue.throttledUntil = Date.now() + 100
    queue.push(request)

    expect(jest.getTimerCount()).toBe(1)
    jest.advanceTimersByTime(99)
    expect(request.sendRequest).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(request.sendRequest).toHaveBeenCalledTimes(1)
    expect(queue.pending).toHaveLength(0)
    expect(jest.getTimerCount()).toBe(0)
    fulfillRequest(queue, 1)
  })

  it('preserves inflight limits and releases pending requests after a response', () => {
    const first = createRequest(1)
    const second = createRequest(2)
    queue.push(first)
    queue.push(second)
    queue.checkPendingRequests()

    expect(first.sendRequest).toHaveBeenCalledTimes(1)
    expect(second.sendRequest).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(1)

    jest.advanceTimersByTime(9)
    expect(second.sendRequest).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(second.sendRequest).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(1)

    fulfillRequest(queue, 1)
    expect(second.sendRequest).toHaveBeenCalledTimes(1)
    expect(queue.pending).toHaveLength(0)

    jest.advanceTimersByTime(10)
    expect(jest.getTimerCount()).toBe(0)
    fulfillRequest(queue, 2)
    expect(second.entry.resolve).toHaveBeenCalledTimes(1)
  })

  it('preserves request timeouts and resolves shutdown waiting for the queue', async () => {
    const request = createRequest(1)
    queue.scheduleRequestTimeoutCheck()
    queue.push(request)
    const drained = queue.waitForPendingRequests()

    jest.advanceTimersByTime(1100)
    await drained

    expect(request.entry.reject).toHaveBeenCalledTimes(1)
    expect(queue.inflight.size).toBe(0)
    expect(jest.getTimerCount()).toBe(1)
    queue.destroy()
    expect(jest.getTimerCount()).toBe(0)
  })
})
