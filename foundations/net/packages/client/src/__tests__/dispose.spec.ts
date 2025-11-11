import {
  containerOnAgentEndpointRef,
  type AgentEndpointRef,
  type Container,
  type ContainerUuid,
  type GetOptions
} from '@hcengineering/network-core'
import { createNetworkClient } from '../index'

// Mock NetworkAgentServer to avoid actual network operations
jest.mock('../agent', () => {
  const mockServerInstance = {
    start: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    getPort: jest.fn().mockResolvedValue(3738)
  }

  return {
    NetworkAgentServer: jest.fn().mockImplementation(() => mockServerInstance)
  }
})

// Simple test container implementation
class TestContainer implements Container {
  closed = false
  terminated = false
  clients = new Set<string>()

  constructor (readonly uuid: ContainerUuid) {}

  async request (operation: string, data?: any): Promise<any> {
    if (this.terminated) {
      throw new Error('Container terminated')
    }
    return { operation, data, uuid: this.uuid }
  }

  async ping (): Promise<void> {
    if (this.terminated) {
      throw new Error('Container terminated')
    }
  }

  async terminate (): Promise<void> {
    this.terminated = true
    this.clients.clear()
  }

  connect (clientId: string, broadcast: (data: any) => Promise<void>): void {
    this.clients.add(clientId)
  }

  disconnect (clientId: string): void {
    this.clients.delete(clientId)
  }
}

describe('NetworkClient auto-disposable functionality', () => {
  describe('Symbol.asyncDispose', () => {
    test('asyncDispose closes client and all servers', async () => {
      const client = createNetworkClient('localhost:3737')
      const closeSpyClient = jest.spyOn(client as any, 'close')

      // Use async using (if supported) or manually call asyncDispose
      await client[Symbol.asyncDispose]()

      expect(closeSpyClient).toHaveBeenCalled()
    })

    test('asyncDispose with serveAgent closes all agent servers', async () => {
      const client = createNetworkClient('localhost:3737')

      // Mock the waitConnection to avoid actual network calls
      jest.spyOn(client as any, 'waitConnection').mockResolvedValue(undefined)
      jest.spyOn(client as any, 'register').mockResolvedValue(undefined)

      const testContainer = new TestContainer('test-uuid-001' as ContainerUuid)

      // Serve an agent
      await client.serveAgent('localhost:3738', {
        'test-service': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('test-uuid-001' as ContainerUuid)
          return {
            uuid,
            container: testContainer,
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      // Verify server was added
      expect((client as any).servers.length).toBe(1)
      const server = (client as any).servers[0][1]
      const serverCloseSpy = jest.spyOn(server, 'close')

      // Dispose the client
      await client[Symbol.asyncDispose]()

      // Verify server was closed
      expect(serverCloseSpy).toHaveBeenCalled()
    })

    test('asyncDispose with multiple agents closes all servers', async () => {
      const client = createNetworkClient('localhost:3737')

      jest.spyOn(client as any, 'waitConnection').mockResolvedValue(undefined)
      jest.spyOn(client as any, 'register').mockResolvedValue(undefined)

      // Serve multiple agents
      await client.serveAgent('localhost:3738', {
        'service-1': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('uuid-1' as ContainerUuid)
          return {
            uuid,
            container: new TestContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      await client.serveAgent('localhost:3739', {
        'service-2': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('uuid-2' as ContainerUuid)
          return {
            uuid,
            container: new TestContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      expect((client as any).servers.length).toBe(2)

      const server1CloseSpy = jest.spyOn((client as any).servers[0][1], 'close')
      const server2CloseSpy = jest.spyOn((client as any).servers[1][1], 'close')

      await client[Symbol.asyncDispose]()

      expect(server1CloseSpy).toHaveBeenCalled()
      expect(server2CloseSpy).toHaveBeenCalled()
    })

    test('asyncDispose properly calls close', async () => {
      const client = createNetworkClient('localhost:3737')

      // Spy on close method
      const closeSpy = jest.spyOn(client, 'close')

      // Call asyncDispose which internally calls close
      await client[Symbol.asyncDispose]()

      // Verify close was called
      expect(closeSpy).toHaveBeenCalled()
    })

    test('asyncDispose stops tick manager', async () => {
      const client = createNetworkClient('localhost:3737')
      const tickMgr = (client as any).tickMgr
      const stopSpy = jest.spyOn(tickMgr, 'stop')

      await client[Symbol.asyncDispose]()

      expect(stopSpy).toHaveBeenCalled()
    })
  })

  describe('Symbol.dispose', () => {
    test('dispose calls close asynchronously', async () => {
      const client = createNetworkClient('localhost:3737')
      const closeSpyClient = jest.spyOn(client as any, 'close')

      // Call synchronous dispose
      client[Symbol.dispose]()

      // Give it a moment for async close to be initiated
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(closeSpyClient).toHaveBeenCalled()
    })

    test('dispose handles errors without throwing', async () => {
      const client = createNetworkClient('localhost:3737')

      jest.spyOn(client as any, 'waitConnection').mockResolvedValue(undefined)
      jest.spyOn(client as any, 'register').mockResolvedValue(undefined)

      await client.serveAgent('localhost:3738', {
        'test-service': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('test-uuid' as ContainerUuid)
          return {
            uuid,
            container: new TestContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      // Make close throw an error
      jest.spyOn(client as any, 'close').mockRejectedValue(new Error('Close failed'))

      // Should not throw synchronously
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        client[Symbol.dispose]()
      }).not.toThrow()

      // Give it time for the async error to be logged
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(consoleSpy).toHaveBeenCalledWith('Error during dispose:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    test('dispose with multiple servers closes all', async () => {
      const client = createNetworkClient('localhost:3737')

      jest.spyOn(client as any, 'waitConnection').mockResolvedValue(undefined)
      jest.spyOn(client as any, 'register').mockResolvedValue(undefined)

      await client.serveAgent('localhost:3738', {
        'service-1': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('uuid-1' as ContainerUuid)
          return {
            uuid,
            container: new TestContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      await client.serveAgent('localhost:3739', {
        'service-2': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('uuid-2' as ContainerUuid)
          return {
            uuid,
            container: new TestContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      const server1CloseSpy = jest.spyOn((client as any).servers[0][1], 'close')
      const server2CloseSpy = jest.spyOn((client as any).servers[1][1], 'close')

      client[Symbol.dispose]()

      // Give it time for async close
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(server1CloseSpy).toHaveBeenCalled()
      expect(server2CloseSpy).toHaveBeenCalled()
    })
  })

  describe('Integration tests', () => {
    test('using statement pattern works correctly', async () => {
      // Simulate 'using' pattern with manual disposal
      const client = createNetworkClient('localhost:3737')

      jest.spyOn(client as any, 'waitConnection').mockResolvedValue(undefined)
      jest.spyOn(client as any, 'register').mockResolvedValue(undefined)
      const closeSpyClient = jest.spyOn(client as any, 'close')

      try {
        await client.serveAgent('localhost:3738', {
          'test-service': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
            const uuid = options.uuid ?? ('test-uuid' as ContainerUuid)
            return {
              uuid,
              container: new TestContainer(uuid),
              endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
            }
          }
        } as any)

        expect((client as any).servers.length).toBe(1)
      } finally {
        await client[Symbol.asyncDispose]()
      }

      // Verify everything is cleaned up
      expect(closeSpyClient).toHaveBeenCalled()
    })

    test('close method properly closes all resources', async () => {
      const client = createNetworkClient('localhost:3737')

      jest.spyOn(client as any, 'waitConnection').mockResolvedValue(undefined)
      jest.spyOn(client as any, 'register').mockResolvedValue(undefined)

      await client.serveAgent('localhost:3738', {
        'service-1': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('uuid-1' as ContainerUuid)
          return {
            uuid,
            container: new TestContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      const tickMgr = (client as any).tickMgr
      const stopSpy = jest.spyOn(tickMgr, 'stop')
      const server = (client as any).servers[0][1]

      await client.close()

      expect(stopSpy).toHaveBeenCalled()
      // Verify server.close was called (it's a mock from the module)
      expect(server.close).toHaveBeenCalled()
      expect((client as any).servers.length).toBe(1) // Servers array not cleared, but servers are closed
    })

    test('duplicate serveAgent endpoint throws error', async () => {
      const client = createNetworkClient('localhost:3737')

      jest.spyOn(client as any, 'waitConnection').mockResolvedValue(undefined)
      jest.spyOn(client as any, 'register').mockResolvedValue(undefined)

      await client.serveAgent('localhost:3738', {
        'service-1': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
          const uuid = options.uuid ?? ('uuid-1' as ContainerUuid)
          return {
            uuid,
            container: new TestContainer(uuid),
            endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
          }
        }
      } as any)

      // Trying to serve another agent on the same endpoint should throw
      await expect(
        client.serveAgent('localhost:3738', {
          'service-2': async (options: GetOptions, agentEndpoint?: AgentEndpointRef) => {
            const uuid = options.uuid ?? ('uuid-2' as ContainerUuid)
            return {
              uuid,
              container: new TestContainer(uuid),
              endpoint: containerOnAgentEndpointRef(agentEndpoint as AgentEndpointRef, uuid)
            }
          }
        } as any)
      ).rejects.toThrow('Agent server already running at localhost:3738')
    })
  })
})
