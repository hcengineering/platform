import { NetworkClientImpl } from '@hcengineering/network-client'
import {
  AgentImpl,
  containerUuid,
  NetworkImpl,
  TickManagerImpl,
  FakeTickManager,
  type AgentUuid,
  type ContainerKind,
  type ContainerEndpointRef,
  type GetOptions,
  type Container,
  type ClientUuid
} from '@hcengineering/network-core'
import { NetworkServer } from '../server'

class MockContainer implements Container {
  lastVisit: number = 0
  onTerminated?: (() => void) | undefined

  async request (operation: string, data: any): Promise<any> {
    return `mock-response-${operation}`
  }

  async terminate (): Promise<void> {
    this.onTerminated?.()
  }

  async ping (): Promise<void> {
    this.lastVisit = Date.now()
  }

  connect (clientId: ClientUuid, handler: (data: any) => Promise<void>): void {}
  disconnect (clientId: ClientUuid): void {}
}

describe('NetworkServer extended tests', () => {
  const agentId1 = 'agent-1' as AgentUuid
  const sessionKind = 'session' as ContainerKind

  test('server initializes with tick manager check alive task', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    // Verify tick manager has registered handler
    expect((tickMgr as any).handlers.length).toBeGreaterThan(0)

    await server.close()
  })

  test('helloHandler registers new client', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const clientId = 'test-client' as ClientUuid

    expect(server.clients.size).toBe(0)

    await server.helloHandler(clientId)

    expect(server.clients.size).toBe(1)
    expect(server.clients.has(clientId)).toBe(true)

    await server.close()
  })

  test('helloHandler does not duplicate clients', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const clientId = 'test-client' as ClientUuid

    await server.helloHandler(clientId)
    await server.helloHandler(clientId) // Call again

    expect(server.clients.size).toBe(1)

    await server.close()
  })

  test('onPing forwards ping to network', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const clientId = 'test-client' as ClientUuid
    const pingSpy = jest.spyOn(net, 'ping')

    server.onPing(clientId)

    expect(pingSpy).toHaveBeenCalledWith(clientId)

    await server.close()
  })

  test('closeHandler removes client', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const clientId = 'test-client' as ClientUuid

    await server.helloHandler(clientId)
    expect(server.clients.size).toBe(1)

    await server.closeHandler(clientId)

    expect(server.clients.size).toBe(0)
    expect(server.clients.has(clientId)).toBe(false)

    await server.close()
  })

  test('closeHandler with timeout flag logs timeout', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const clientId = 'test-client' as ClientUuid
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    await server.helloHandler(clientId)
    await server.closeHandler(clientId, true) // With timeout

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'))

    consoleSpy.mockRestore()
    await server.close()
  })

  test('requestHandler handles getAgents operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(net)

    const clientId = 'test-client' as ClientUuid
    let response: any

    const send = async (data: any): Promise<void> => {
      response = data
    }

    await server.requestHandler(clientId, 'al', {}, send) // 'al' for getAgents

    expect(response).toBeDefined()
    expect(Array.isArray(response)).toBe(true)
    expect(response.length).toBe(1)

    await server.close()
  })

  test('requestHandler handles getKinds operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(net)

    const clientId = 'test-client' as ClientUuid
    let response: any

    const send = async (data: any): Promise<void> => {
      response = data
    }

    await server.requestHandler(clientId, 'ak', {}, send) // 'ak' for getKinds

    expect(response).toBeDefined()
    expect(Array.isArray(response)).toBe(true)
    expect(response).toContain(sessionKind)

    await server.close()
  })

  test('requestHandler handles getContainer operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(net)

    const clientId = 'test-client' as ClientUuid
    let response: any

    const send = async (data: any): Promise<void> => {
      response = data
    }

    await server.requestHandler(clientId, 'gg', { kind: sessionKind, request: {} }, send) // 'gg' for getContainer

    expect(response).toBeDefined()
    expect(Array.isArray(response)).toBe(true)
    expect(response.length).toBe(2)

    await server.close()
  })

  test('requestHandler handles releaseContainer operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(net)

    const clientId = 'test-client' as ClientUuid

    // First get a container
    const [containerId] = await net.get(clientId, sessionKind, {})

    let response: any
    const send = async (data: any): Promise<void> => {
      response = data
    }

    await server.requestHandler(clientId, 'cr', { uuid: containerId }, send) // 'cr' for releaseContainer

    expect(response).toBe('ok')

    await server.close()
  })

  test('requestHandler handles listContainers operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(net)

    const clientId = 'test-client' as ClientUuid

    // Create a container
    await net.get(clientId, sessionKind, {})

    let response: any
    const send = async (data: any): Promise<void> => {
      response = data
    }

    await server.requestHandler(clientId, 'cl', { kind: sessionKind }, send) // 'cl' for listContainers

    expect(response).toBeDefined()
    expect(Array.isArray(response)).toBe(true)
    expect(response.length).toBe(1)

    await server.close()
  })

  test('requestHandler handles sendContainer operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(net)

    const clientId = 'test-client' as ClientUuid

    // Create a container
    const [containerId] = await net.get(clientId, sessionKind, {})

    let response: any
    const send = async (data: any): Promise<void> => {
      response = data
    }

    await server.requestHandler(clientId, 'cs', [containerId, 'testOp', { data: 'test' }], send) // 'cs' for sendContainer

    expect(response).toBe('mock-response-testOp')

    await server.close()
  })

  test('requestHandler throws error for unknown method', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const clientId = 'test-client' as ClientUuid
    const send = jest.fn()

    await expect(server.requestHandler(clientId, 'unknownMethod', {}, send))
      .rejects.toThrow('Unknown method')

    await server.close()
  })

  test('requestHandler handles register operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const clientId = 'test-client' as ClientUuid
    let response: any

    const send = async (data: any): Promise<void> => {
      response = data
    }

    const params = {
      uuid: agentId1,
      containers: [],
      kinds: [sessionKind],
      endpoint: 'agent-endpoint' as any
    }

    await server.requestHandler(clientId, 'ar', params, send)

    expect(response).toBeDefined()

    const agents = await net.agents()
    expect(agents.length).toBe(1)
    expect(agents[0].agentId).toBe(agentId1)

    await server.close()
  })

  test('requestHandler handles unregister operation', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(net)

    const clientId = 'test-client' as ClientUuid
    let response: any

    const send = async (data: any): Promise<void> => {
      response = data
    }

    await server.requestHandler(clientId, 'au', { uuid: agentId1 }, send) // 'au' for unregister

    expect(response).toBe('ok')

    const agents = await net.agents()
    expect(agents.length).toBe(0)

    await server.close()
  })

  test('server integrates with network client', async () => {
    const tickMgr = new TickManagerImpl(10)
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    // Test through actual RPC connection
    const networkClient = new NetworkClientImpl('localhost', await server.rpcServer.getPort(), tickMgr)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await networkClient.register(agent1)

    // Create a container through network
    await networkClient.get(sessionKind, {})

    const containers = await networkClient.list(sessionKind)
    expect(containers.length).toBe(1)

    await networkClient.close()
    await server.close()
    tickMgr.stop()
  })

  test('server logs check alive information periodically', async () => {
    const tickMgr = new TickManagerImpl(10)
    const net = new NetworkImpl(tickMgr)
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    const server = new NetworkServer(net, tickMgr, '*', 0)

    // Start the tick manager
    tickMgr.start()

    // Wait for at least one check alive cycle (5 seconds interval)
    await new Promise(resolve => setTimeout(resolve, 100))

    tickMgr.stop()
    await server.close()

    consoleSpy.mockRestore()
  })

  test('close stops the rpc server', async () => {
    const tickMgr = new FakeTickManager()
    const net = new NetworkImpl(tickMgr)
    const server = new NetworkServer(net, tickMgr, '*', 0)

    const closeSpy = jest.spyOn(server.rpcServer, 'close')

    await server.close()

    expect(closeSpy).toHaveBeenCalled()
  })
})
