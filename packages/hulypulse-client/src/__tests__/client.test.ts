//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { HulypulseClient } from '../client'
import { getReconnectDelay, RECONNECT_BASE_DELAY_MS, RECONNECT_MAX_DELAY_MS } from '../reconnect'

const PING_INTERVAL_MS = 30 * 1000
const PING_TIMEOUT_MS = 5 * 60 * 1000

class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  sent: string[] = []
  closeCalls = 0

  onopen: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null

  constructor (readonly url: string) {
    FakeWebSocket.instances.push(this)
  }

  send (data: string): void {
    this.sent.push(data)
  }

  // Simulates a half-open connection: close() is requested, but the close event never arrives
  close (): void {
    this.closeCalls++
  }

  open (): void {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.({})
  }

  receive (data: string): void {
    this.onmessage?.({ data })
  }

  drop (): void {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({})
  }
}

async function connectClient (): Promise<HulypulseClient> {
  const promise = HulypulseClient.connect('ws://pulse.test')
  FakeWebSocket.instances[0].open()
  return await promise
}

describe('getReconnectDelay', () => {
  it('grows exponentially and is capped', () => {
    const max = (attempt: number): number => getReconnectDelay(attempt, undefined, undefined, () => 1)
    expect(max(0)).toBe(RECONNECT_BASE_DELAY_MS)
    expect(max(1)).toBe(2 * RECONNECT_BASE_DELAY_MS)
    expect(max(2)).toBe(4 * RECONNECT_BASE_DELAY_MS)
    expect(max(10)).toBe(RECONNECT_MAX_DELAY_MS)
    expect(max(1000)).toBe(RECONNECT_MAX_DELAY_MS)
  })

  it('applies jitter within the upper half of the window', () => {
    expect(getReconnectDelay(3, 1000, 30000, () => 0)).toBe(4000)
    expect(getReconnectDelay(3, 1000, 30000, () => 0.5)).toBe(6000)
    expect(getReconnectDelay(3, 1000, 30000, () => 1)).toBe(8000)
  })
})

describe('HulypulseClient heartbeat', () => {
  const originalWebSocket = (globalThis as any).WebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(Math, 'random').mockReturnValue(1)
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    FakeWebSocket.instances = []
    ;(globalThis as any).WebSocket = FakeWebSocket
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    ;(globalThis as any).WebSocket = originalWebSocket
  })

  it('sends ping every interval', async () => {
    const client = await connectClient()
    const ws = FakeWebSocket.instances[0]

    jest.advanceTimersByTime(3 * PING_INTERVAL_MS)
    expect(ws.sent.filter((m) => m === 'ping')).toHaveLength(3)

    client.close()
  })

  it('closes and reconnects an open socket that stops answering', async () => {
    const client = await connectClient()
    const ws = FakeWebSocket.instances[0]

    jest.advanceTimersByTime(PING_TIMEOUT_MS - 1)
    expect(ws.closeCalls).toBe(0)

    jest.advanceTimersByTime(1)
    expect(ws.closeCalls).toBe(1)
    expect(ws.readyState).toBe(FakeWebSocket.OPEN)

    jest.advanceTimersByTime(RECONNECT_BASE_DELAY_MS)
    expect(FakeWebSocket.instances).toHaveLength(2)

    client.close()
  })

  it('keeps the connection while the server answers pongs', async () => {
    const client = await connectClient()
    const ws = FakeWebSocket.instances[0]

    for (let i = 0; i < 30; i++) {
      jest.advanceTimersByTime(PING_INTERVAL_MS)
      ws.receive('pong')
    }
    expect(ws.closeCalls).toBe(0)
    expect(FakeWebSocket.instances).toHaveLength(1)

    jest.advanceTimersByTime(PING_TIMEOUT_MS)
    expect(ws.closeCalls).toBe(1)

    client.close()
  })

  it('does not reconnect twice when the stale socket reports close late', async () => {
    const client = await connectClient()
    const ws = FakeWebSocket.instances[0]

    jest.advanceTimersByTime(PING_TIMEOUT_MS)
    ws.drop()
    jest.advanceTimersByTime(RECONNECT_MAX_DELAY_MS)
    expect(FakeWebSocket.instances).toHaveLength(2)

    client.close()
  })

  it('backs off between failed reconnect attempts and resets after success', async () => {
    const client = await connectClient()
    FakeWebSocket.instances[0].drop()

    jest.advanceTimersByTime(RECONNECT_BASE_DELAY_MS)
    expect(FakeWebSocket.instances).toHaveLength(2)
    FakeWebSocket.instances[1].drop()

    jest.advanceTimersByTime(2 * RECONNECT_BASE_DELAY_MS - 1)
    expect(FakeWebSocket.instances).toHaveLength(2)
    jest.advanceTimersByTime(1)
    expect(FakeWebSocket.instances).toHaveLength(3)
    FakeWebSocket.instances[2].drop()

    jest.advanceTimersByTime(4 * RECONNECT_BASE_DELAY_MS)
    expect(FakeWebSocket.instances).toHaveLength(4)
    FakeWebSocket.instances[3].open()
    FakeWebSocket.instances[3].drop()

    jest.advanceTimersByTime(RECONNECT_BASE_DELAY_MS)
    expect(FakeWebSocket.instances).toHaveLength(5)

    client.close()
  })

  it('does not reconnect after close()', async () => {
    const client = await connectClient()
    client.close()
    FakeWebSocket.instances[0].drop()

    jest.advanceTimersByTime(PING_TIMEOUT_MS + RECONNECT_MAX_DELAY_MS)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})
