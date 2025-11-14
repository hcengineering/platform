// Mocks for modules used by client
import type { ContainerConnection, TickManager } from '@hcengineering/network-core'
import { NetworkClientImpl } from '../client'

jest.mock('@hcengineering/network-backrpc', () => ({
  BackRPCClient: jest.fn().mockImplementation(() => ({
    waitConnection: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue(undefined),
    close: jest.fn()
  }))
}))

jest.mock('@hcengineering/network-core', () => ({
  parseEndpointRef: jest.fn((endpoint: string) => {
    if (endpoint === 'routed-endpoint') {
      return { uuid: 'container-1', kind: 'routed', host: 'h', port: 1234, agentId: 'agent-1' }
    }
    // direct path
    return { uuid: 'container-2', kind: 'direct', host: 'dh', port: 4321 }
  }),
  EndpointKind: { noconnect: 'noconnect', routed: 'routed' },
  agentDirectRef: (host: string, port: number, agentId?: string) => `${host}:${port}:${agentId ?? ''}`
}))

// Provide simple mock implementations for agent-level connection classes
jest.mock('../agent', () => {
  return {
    RoutedNetworkAgentConnectionImpl: class {
      connect (containerUuid: string): any {
        return Promise.resolve({
          containerId: containerUuid,
          request: async (_op: string, _data?: any) => 'ok',
          close: async () => {},
          on: undefined
        })
      }

      close (): any {}
    },
    NetworkDirectConnectionImpl: class {
      request = async (_op: string, _data?: any): Promise<any> => 'ok'
      close = async (): Promise<any> => {}
    },
    ContainerConnectionImpl: class {
      connection!: ContainerConnection | Promise<ContainerConnection>
      constructor (
        readonly containerId: string,
        connection: ContainerConnection | Promise<ContainerConnection>
      ) {
        this.setConnection(connection)
      }

      async connect (): Promise<void> {
        if (this.connection instanceof Promise) {
          this.connection = await this.connection
        }
      }

      setConnection (c: ContainerConnection | Promise<ContainerConnection>): void {
        this.connection = c
      }

      async request (op: string, data?: any): Promise<any> {
        let c = this.connection
        if (c instanceof Promise) {
          c = await c
        }
        return await c.request(op, data)
      }

      async close (): Promise<void> {
        if (this.connection instanceof Promise) {
          this.connection = await this.connection
        }
        await this.connection.close()
      }
    }
  }
})

const tickMgr: TickManager = {
  tps: 1,
  now: () => Date.now(),
  waitTick: (_n: number) => Promise.resolve(),
  register: (_fn: any, _interval: number) => () => {},
  start: () => {},
  stop: () => {}
}

describe('establishConnection paths', () => {
  test('routed connection creates agentConnections and containerConnections', () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr)
    const conn = client.establishConnection('container-1' as any, 'routed-endpoint' as any)
    expect(client.agentConnections.size).toBeGreaterThan(0)
    expect(client.containerConnections.size).toBeGreaterThan(0)
    expect(conn.containerId).toBe('container-1')
  })

  test('direct connection creates containerConnections only', () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr)
    const conn = client.establishConnection('container-2' as any, 'direct-endpoint' as any)
    expect(client.agentConnections.size).toBe(0)
    expect(client.containerConnections.size).toBeGreaterThan(0)
    expect(conn.containerId).toBe('container-2')
  })
})
