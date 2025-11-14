import { NetworkImpl } from '../network'
import { AgentImpl } from '../agent'
import { FakeTickManager, TickManagerImpl } from '../utils'
import {
  type AgentUuid,
  type ClientUuid,
  type ContainerEndpointRef,
  type ContainerKind,
  type GetOptions,
  type NetworkEvent,
  type ContainerUuid
} from '../api/types'
import { type Container, containerUuid } from '../containers'

class MockContainer implements Container {
  lastVisit: number = 0
  onTerminated?: (() => void) | undefined

  requestCalls: Array<{ operation: string, data: any }> = []
  terminateCalls: number = 0
  pingCalls: number = 0

  async request (operation: string, data: any): Promise<any> {
    this.requestCalls.push({ operation, data })
    return `response-${operation}`
  }

  async terminate (): Promise<void> {
    this.terminateCalls++
    this.onTerminated?.()
  }

  async ping (): Promise<void> {
    this.pingCalls++
    this.lastVisit = Date.now()
  }

  connect (clientId: ClientUuid, handler: (data: any) => Promise<void>): void {}
  disconnect (clientId: ClientUuid): void {}
}

describe('NetworkImpl extended tests', () => {
  const agentId1 = 'agent-1' as AgentUuid
  const agentId2 = 'agent-2' as AgentUuid
  const clientId1 = 'client-1' as ClientUuid
  const clientId2 = 'client-2' as ClientUuid
  const sessionKind = 'session' as ContainerKind
  const dbKind = 'database' as ContainerKind

  test('close stops tick manager', () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    // Verify tick manager is registered
    expect((tickManager as any).handlers.size).toBeGreaterThan(0)

    network.close()

    // Verify handlers are cleaned up
    expect((tickManager as any).handlers.size).toBe(0)
  })

  test('agents returns all registered agents with info', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    const agent2 = new AgentImpl(agentId2, {
      [dbKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint2' as ContainerEndpointRef
      })
    })

    await agent1.register(network)
    await agent2.register(network)

    const agents = await network.agents()

    expect(agents).toHaveLength(2)
    expect(agents[0].agentId).toBe(agentId1)
    expect(agents[1].agentId).toBe(agentId2)
    expect(agents[0].containers).toBe(0)
  })

  test('kinds returns all unique container kinds', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      }),
      [dbKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint2' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    const kinds = await network.kinds()

    expect(kinds).toContain(sessionKind)
    expect(kinds).toContain(dbKind)
    expect(kinds.length).toBeGreaterThanOrEqual(2)
  })

  test('list returns containers filtered by kind', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    // Create a container
    await network.get(clientId1, sessionKind, {})

    const allContainers = await network.list()
    const sessionContainers = await network.list(sessionKind)
    const dbContainers = await network.list(dbKind)

    expect(allContainers.length).toBe(1)
    expect(sessionContainers.length).toBe(1)
    expect(dbContainers.length).toBe(0)
  })

  test('request throws error for non-existent container', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    await expect(network.request('non-existent' as ContainerUuid, 'test', {})).rejects.toThrow(
      'Container non-existent not found'
    )
  })

  test('request forwards to container agent', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)
    const mockContainer = new MockContainer()

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: mockContainer,
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)
    const [containerId] = await network.get(clientId1, sessionKind, {})

    const result = await network.request(containerId, 'testOp', { data: 'test' })

    expect(result).toBe('response-testOp')
    expect(mockContainer.requestCalls).toHaveLength(1)
    expect(mockContainer.requestCalls[0]).toEqual({ operation: 'testOp', data: { data: 'test' } })
  })

  test('register handles agent update', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    // Register again with updated info
    await agent1.register(network)

    const agents = await network.agents()
    expect(agents).toHaveLength(1)
  })

  test('register removes old containers not in new registration', async () => {
    const tickManager = new FakeTickManager()
    const network = new NetworkImpl(tickManager)

    const container1Id = 'container-1' as ContainerUuid
    const mockContainer = new MockContainer()

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => {
        if (opt.uuid === container1Id) {
          return {
            uuid: container1Id,
            container: mockContainer,
            endpoint: 'endpoint1' as ContainerEndpointRef
          }
        }
        return {
          uuid: containerUuid(),
          container: new MockContainer(),
          endpoint: 'endpoint1' as ContainerEndpointRef
        }
      }
    })

    await agent1.register(network)
    await network.get(clientId1, sessionKind, { uuid: container1Id })

    // Verify container exists
    let containers = await network.list()
    expect(containers).toHaveLength(1)

    // Re-register without the container
    const emptyAgent = new AgentImpl(agentId1, {})
    await network.register(
      {
        agentId: agentId1,
        containers: [],
        kinds: [],
        endpoint: undefined
      },
      emptyAgent as any
    )

    // Wait for event processing
    await tickManager.waitTick(1)

    // Verify container was removed
    containers = await network.list()
    expect(containers).toHaveLength(0)
  })

  test('checkAlive removes inactive agents', async () => {
    const tickManager = new FakeTickManager()
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    let agents = await network.agents()
    expect(agents).toHaveLength(1)

    // Advance time beyond alive timeout
    tickManager.setTime(tickManager.now() + 6000) // 6 seconds
    await (network as any).checkAlive()

    // Agent should be removed
    agents = await network.agents()
    expect(agents).toHaveLength(0)
  })

  test('addClient and removeClient manage client records', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const eventHandler = jest.fn()
    network.addClient(clientId1, eventHandler)

    expect((network as any)._clients.has(clientId1)).toBe(true)

    network.removeClient(clientId1)

    expect((network as any)._clients.has(clientId1)).toBe(false)
  })

  test('sendEvents dispatches queued events to clients', async () => {
    const tickManager = new FakeTickManager()
    const network = new NetworkImpl(tickManager)

    const eventsReceived: NetworkEvent[] = []
    network.addClient(clientId1, async (event) => {
      eventsReceived.push(event)
    })

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    // Manually trigger sendEvents
    await (network as any).sendEvents()

    expect(eventsReceived.length).toBeGreaterThan(0)
    expect(eventsReceived[0].agents).toBeDefined()
  })

  test('get with specific uuid returns same container', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const fixedUuid = 'fixed-container' as ContainerUuid

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    const [uuid1] = await network.get(clientId1, sessionKind, { uuid: fixedUuid })
    const [uuid2] = await network.get(clientId2, sessionKind, { uuid: fixedUuid })

    expect(uuid1).toBe(fixedUuid)
    expect(uuid2).toBe(fixedUuid)
    expect(uuid1).toBe(uuid2)
  })

  test('release decrements client count and orphans container', async () => {
    const tickManager = new FakeTickManager()
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    const [containerId] = await network.get(clientId1, sessionKind, {})

    await network.release(clientId1, containerId)

    // Container should be orphaned
    expect((network as any)._orphanedContainers.has(containerId)).toBe(true)
  })

  test('unregister removes agent and its containers', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)
    await network.get(clientId1, sessionKind, {})

    let agents = await network.agents()
    expect(agents).toHaveLength(1)

    let containers = await network.list()
    expect(containers).toHaveLength(1)

    await network.unregister(agentId1)

    agents = await network.agents()
    expect(agents).toHaveLength(0)

    containers = await network.list()
    expect(containers).toHaveLength(0)
  })

  test('multiple clients can share same container', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const fixedUuid = 'shared-container' as ContainerUuid

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    const [uuid1] = await network.get(clientId1, sessionKind, { uuid: fixedUuid })
    const [uuid2] = await network.get(clientId2, sessionKind, { uuid: fixedUuid })

    expect(uuid1).toBe(uuid2)

    const container = (network as any)._containers.get(uuid1)
    expect(container.clients.size).toBe(2)
    expect(container.clients.has(clientId1)).toBe(true)
    expect(container.clients.has(clientId2)).toBe(true)
  })

  test('event system can queue and send events', async () => {
    const tickManager = new FakeTickManager()
    const network = new NetworkImpl(tickManager)

    const eventsReceived: NetworkEvent[] = []
    network.addClient(clientId1, async (event) => {
      eventsReceived.push(event)
    })

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    // Manually trigger sendEvents
    await (network as any).sendEvents()

    // Should receive at least the agent registration event
    expect(eventsReceived.length).toBeGreaterThan(0)
    expect(eventsReceived[0]).toHaveProperty('agents')
  })
})
