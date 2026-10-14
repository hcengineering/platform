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

import { HulypulseClient } from './client'

class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  sent: string[] = []
  closeCode: number | undefined
  onopen: (() => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null

  constructor (readonly url: string) {
    FakeWebSocket.instances.push(this)
    setTimeout(() => {
      this.readyState = FakeWebSocket.OPEN
      this.onopen?.()
    }, 0)
  }

  send (data: string): void {
    this.sent.push(data)
  }

  close (code?: number): void {
    this.closeCode = code
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code })
  }
}

describe('HulypulseClient ping', () => {
  const PING_INTERVAL_MS = 30 * 1000
  const PING_TIMEOUT_MS = 5 * 60 * 1000

  beforeEach(() => {
    jest.useFakeTimers()
    FakeWebSocket.instances = []
    ;(global as any).WebSocket = FakeWebSocket
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  async function connect (): Promise<{ client: HulypulseClient, ws: FakeWebSocket }> {
    const promise = HulypulseClient.connect('ws://localhost/ws')
    await jest.advanceTimersByTimeAsync(0)
    const client = await promise
    return { client, ws: FakeWebSocket.instances[0] }
  }

  it('closes an open socket that never answers ping', async () => {
    const { client, ws } = await connect()

    await jest.advanceTimersByTimeAsync(PING_TIMEOUT_MS + PING_INTERVAL_MS)

    expect(ws.sent).toContain('ping')
    expect(ws.closeCode).toBe(1000)
    client.close()
  })

  it('keeps the socket open while pong replies arrive', async () => {
    const { client, ws } = await connect()

    for (let i = 0; i < 40; i++) {
      await jest.advanceTimersByTimeAsync(PING_INTERVAL_MS)
      ws.onmessage?.({ data: 'pong' })
    }

    expect(ws.closeCode).toBeUndefined()
    client.close()
  })
})
