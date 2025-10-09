//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { ClientSocket, ClientSocketReadyState, pongConst, pingConst } from '@hcengineering/client'
import core, {
  type Tx,
  generateId,
  type WorkspaceUuid,
  type PersonUuid,
  TxCreateDoc,
  type Doc
} from '@hcengineering/core'
import { connect } from '../connection'

// Mock CloseEvent for Node.js environment (used in MockWebSocket)
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class MockCloseEvent {
  readonly type: string
  readonly code: number

  constructor (type: string, init?: { code?: number }) {
    this.type = type
    this.code = init?.code ?? 1000
  }
}

// Mock MessageEvent for Node.js environment (used in MockWebSocket)
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class MockMessageEvent {
  readonly type: string
  readonly data: any

  constructor (type: string, init: { data: any }) {
    this.type = type
    this.data = init.data
  }
}

// Mock Event for Node.js environment (used in MockWebSocket)
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class MockEvent {
  readonly type: string

  constructor (type: string) {
    this.type = type
  }
}

// Mock WebSocket implementation for testing
class MockWebSocket implements ClientSocket {
  readyState: ClientSocketReadyState = ClientSocketReadyState.CONNECTING
  onmessage?: ((this: ClientSocket, ev: MessageEvent) => any) | null = null
  onclose?: ((this: ClientSocket, ev: CloseEvent) => any) | null = null
  onopen?: ((this: ClientSocket, ev: Event) => any) | null = null
  onerror?: ((this: ClientSocket, ev: Event) => any) | null = null
  bufferedAmount?: number = 0

  private readonly messageQueue: any[] = []
  private closeCode?: number
  private timers: any[] = []

  constructor (public url: string) {
    // Simulate async connection
    const timer = setTimeout(() => {
      if (this.readyState === ClientSocketReadyState.CLOSED) {
        return
      }
      this.readyState = ClientSocketReadyState.OPEN
      if (this.onopen !== null && this.onopen !== undefined) {
        this.onopen(new MockEvent('open') as any)
      }
      // Process queued messages
      this.processQueue()
    }, 10)
    this.timers.push(timer)
  }

  clearAllTimers (): void {
    for (const timer of this.timers) {
      clearTimeout(timer)
    }
    this.timers = []
  }

  send (data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== ClientSocketReadyState.OPEN) {
      throw new Error('WebSocket is not open')
    }

    // Parse and respond to messages
    try {
      const message = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer)

      if (message === pingConst) {
        this.simulateMessage(pongConst)
        return
      }

      // Parse RPC message
      const rpcMessage = JSON.parse(message)

      // Handle hello request
      if (rpcMessage.method === 'hello') {
        const response = {
          id: rpcMessage.id,
          result: {
            binary: false,
            compression: false,
            reconnect: false
          }
        }
        this.simulateMessage(JSON.stringify(response))
        return
      }

      // Handle loadModel request
      if (rpcMessage.method === 'loadModel') {
        const response = {
          id: rpcMessage.id,
          result: {
            transactions: [],
            hash: 'test-hash',
            full: false
          }
        }
        this.simulateMessage(JSON.stringify(response))
        return
      }

      // Handle findAll request
      if (rpcMessage.method === 'findAll') {
        const response = {
          id: rpcMessage.id,
          result: []
        }
        this.simulateMessage(JSON.stringify(response))
        return
      }

      // Handle tx request
      if (rpcMessage.method === 'tx') {
        const response = {
          id: rpcMessage.id,
          result: {}
        }
        this.simulateMessage(JSON.stringify(response))
        return
      }

      // Default response
      const response = {
        id: rpcMessage.id,
        result: {}
      }
      this.simulateMessage(JSON.stringify(response))
    } catch (err) {
      console.error('Error processing message:', err)
    }
  }

  close (code?: number): void {
    this.closeCode = code
    this.readyState = ClientSocketReadyState.CLOSING
    this.clearAllTimers()
    const timer = setTimeout(() => {
      this.readyState = ClientSocketReadyState.CLOSED
      if (this.onclose !== null && this.onclose !== undefined) {
        this.onclose(new MockCloseEvent('close', { code: code ?? 1000 }) as any)
      }
    }, 10)
    this.timers.push(timer)
  }

  // Helper method to simulate receiving messages
  simulateMessage (data: string | ArrayBuffer): void {
    if (this.readyState === ClientSocketReadyState.OPEN) {
      if (this.onmessage !== null && this.onmessage !== undefined) {
        const event = new MockMessageEvent('message', { data })
        this.onmessage(event as any)
      }
    } else {
      this.messageQueue.push(data)
    }
  }

  private processQueue (): void {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift()
      this.simulateMessage(data)
    }
  }

  // Helper to simulate server-initiated transactions
  simulateTransaction (tx: Tx): void {
    const message = {
      result: {
        _class: 'core:class:TxNotification',
        tx: [tx]
      }
    }
    this.simulateMessage(JSON.stringify(message))
  }
}

describe('MockWebSocket', () => {
  it('should connect and send messages', async () => {
    const ws = new MockWebSocket('ws://localhost:3333')

    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        expect(ws.readyState).toBe(ClientSocketReadyState.OPEN)
        resolve()
      }
    })

    // Test message sending
    let receivedMessage: string | null = null
    ws.onmessage = (ev: MessageEvent) => {
      receivedMessage = ev.data as string
    }

    ws.simulateMessage('test message')

    expect(receivedMessage).toBe('test message')

    // Test close
    await new Promise<void>((resolve) => {
      ws.onclose = () => {
        expect(ws.readyState).toBe(ClientSocketReadyState.CLOSED)
        resolve()
      }
      ws.close()
    })
  })

  it('should handle ping/pong', async () => {
    const ws = new MockWebSocket('ws://localhost:3333')

    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        resolve()
      }
    })

    let receivedMessage: string | null = null
    ws.onmessage = (ev: MessageEvent) => {
      receivedMessage = ev.data as string
    }

    ws.send(pingConst)

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(receivedMessage).toBe(pongConst)

    ws.close()
  })
})

describe('connect function', () => {
  let connections: Array<{ close: () => Promise<void> }> = []
  let mockWebSockets: MockWebSocket[] = []

  afterEach(async () => {
    // Clean up all connections
    for (const conn of connections) {
      await conn.close()
    }
    connections = []

    // Clean up all mock websockets
    for (const ws of mockWebSockets) {
      ws.clearAllTimers()
      if (ws.readyState !== ClientSocketReadyState.CLOSED) {
        ws.close()
      }
    }
    mockWebSockets = []

    // Give time for all timers to clear
    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  it('should establish connection', async () => {
    const workspaceId = 'test-workspace' as WorkspaceUuid
    const userId = 'test-user' as PersonUuid

    const handler = jest.fn()

    const mockWs = new MockWebSocket('ws://localhost:3333')
    mockWebSockets.push(mockWs)

    const client = connect('ws://localhost:3333', handler, workspaceId, userId, {
      socketFactory: (url: string) => mockWs as any
    })

    connections.push(client)

    expect(client).toBeDefined()

    // Wait for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Close connection immediately to prevent timers from continuing
    await client.close()

    // Wait for close to complete
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  it('should handle transactions', async () => {
    const workspaceId = 'test-workspace' as WorkspaceUuid
    const userId = 'test-user' as PersonUuid

    let txReceived: Tx | null = null
    const handler = (...tx: Tx[]): void => {
      if (tx.length > 0) {
        txReceived = tx[0]
      }
    }

    const mockWs = new MockWebSocket('ws://localhost:3333')
    const client = connect('ws://localhost:3333', handler, workspaceId, userId, {
      socketFactory: (url: string) => mockWs as any
    })

    connections.push(client)

    // Wait for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Simulate a transaction from server
    const testTx: TxCreateDoc<Doc> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Model,
      objectId: generateId(),
      objectClass: core.class.Space,
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdOn: Date.now(),
      attributes: {
        name: 'Test Space',
        description: '',
        private: false,
        archived: false,
        members: []
      }
    }

    mockWs.simulateTransaction(testTx)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(txReceived).toBeDefined()

    // Close immediately after test
    await client.close()
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
})
