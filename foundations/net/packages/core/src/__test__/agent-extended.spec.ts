import { AgentImpl } from '../agent'
import {
  type AgentUuid,
  type ClientUuid,
  type ContainerEndpointRef,
  type ContainerKind,
  type GetOptions
} from '../api/types'
import { type Container, containerUuid } from '../containers'
import { NetworkImpl } from '../network'
import { TickManagerImpl } from '../utils'

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

describe('AgentImpl extended tests', () => {
  const agentId1 = 'agent-1' as AgentUuid
  const clientId1 = 'client-1' as ClientUuid
  const sessionKind = 'session' as ContainerKind
  const dbKind = 'database' as ContainerKind

  test('register updates agent info on network', async () => {
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

    const agents = await network.agents()
    expect(agents).toHaveLength(1)
    expect(agents[0].agentId).toBe(agentId1)
  })

  test('list returns all containers for agent', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    let idCounter = 0
    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? (`container-${idCounter++}` as any),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    // Create two different containers with explicit UUIDs
    await network.get(clientId1, sessionKind, { uuid: 'uuid-1' as any })
    await network.get(clientId1, sessionKind, { uuid: 'uuid-2' as any })

    const containers = await agent1.list()
    expect(containers.length).toBe(2)
  })

  test('get creates new container if not exists', async () => {
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

    const [uuid, endpoint] = await agent1.get(sessionKind, {})

    expect(uuid).toBeDefined()
    expect(endpoint).toBe('endpoint1')
  })

  test('get returns existing container with specified uuid', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)
    const fixedUuid = 'fixed-uuid' as any

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockContainer(),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    const [uuid1, endpoint1] = await agent1.get(sessionKind, { uuid: fixedUuid })
    const [uuid2, endpoint2] = await agent1.get(sessionKind, { uuid: fixedUuid })

    expect(uuid1).toBe(fixedUuid)
    expect(uuid2).toBe(fixedUuid)
    expect(uuid1).toBe(uuid2)
    expect(endpoint1).toBe(endpoint2)
  })

  test('get throws error for unsupported container kind', async () => {
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

    await expect(agent1.get(dbKind, {})).rejects.toThrow()
  })

  test('terminate removes container from agent and network', async () => {
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

    const [containerId] = await agent1.get(sessionKind, {})

    let containers = await agent1.list()
    expect(containers).toHaveLength(1)

    await agent1.terminate(containerId)

    expect(mockContainer.terminateCalls).toBe(1)

    containers = await agent1.list()
    expect(containers).toHaveLength(0)
  })

  test('terminate handles non-existent container gracefully', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {})
    await agent1.register(network)

    // Should not throw
    await agent1.terminate('non-existent' as any)
  })

  test('selectContainer handles empty factory list', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {})
    await agent1.register(network)

    await expect(agent1.get(sessionKind, {})).rejects.toThrow()
  })

  test('selectContainer handles multiple containers', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const mockContainer1 = new MockContainer()
    const mockContainer2 = new MockContainer()

    let callCount = 0
    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => {
        const container = callCount === 0 ? mockContainer1 : mockContainer2
        const uuid = opt.uuid ?? (`container-${callCount}` as any)
        callCount++
        return {
          uuid,
          container,
          endpoint: 'endpoint1' as ContainerEndpointRef
        }
      }
    })

    await agent1.register(network)

    // First call creates first container with explicit uuid
    const [uuid1] = await agent1.get(sessionKind, { uuid: 'uuid-1' as any })
    expect(uuid1).toBe('uuid-1')

    // Second call creates second container with different uuid
    const [uuid2] = await agent1.get(sessionKind, { uuid: 'uuid-2' as any })
    expect(uuid2).toBe('uuid-2')
    expect(uuid2).not.toBe(uuid1)
  })

  test('multiple factories can exist for different kinds', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const mockSessionContainer = new MockContainer()
    const mockDbContainer = new MockContainer()

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: mockSessionContainer,
        endpoint: 'endpoint1' as ContainerEndpointRef
      }),
      [dbKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: mockDbContainer,
        endpoint: 'endpoint2' as ContainerEndpointRef
      })
    })

    await agent1.register(network)

    const [sessionUuid, sessionEndpoint] = await agent1.get(sessionKind, {})
    const [dbUuid, dbEndpoint] = await agent1.get(dbKind, {})

    expect(sessionUuid).toBeDefined()
    expect(dbUuid).toBeDefined()
    expect(sessionEndpoint).toBe('endpoint1')
    expect(dbEndpoint).toBe('endpoint2')
  })

  test('container can be created and used', async () => {
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

    const [uuid] = await agent1.get(sessionKind, {})

    expect(uuid).toBeDefined()
    expect(await agent1.list()).toHaveLength(1)
  })

  test('factory exception is propagated', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => {
        throw new Error('Factory failed')
      }
    })

    await agent1.register(network)

    await expect(agent1.get(sessionKind, {})).rejects.toThrow('Factory failed')
  })

  test('concurrent get calls for same uuid wait for single factory call', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    let factoryCalls = 0
    const mockContainer = new MockContainer()

    const agent1 = new AgentImpl(agentId1, {
      [sessionKind]: async (opt: GetOptions) => {
        factoryCalls++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return {
          uuid: opt.uuid ?? containerUuid(),
          container: mockContainer,
          endpoint: 'endpoint1' as ContainerEndpointRef
        }
      }
    })

    await agent1.register(network)

    const fixedUuid = 'fixed-uuid' as any

    // Launch multiple concurrent get calls with same uuid
    const results = await Promise.all([
      agent1.get(sessionKind, { uuid: fixedUuid }),
      agent1.get(sessionKind, { uuid: fixedUuid }),
      agent1.get(sessionKind, { uuid: fixedUuid })
    ])

    // All should return the same container
    expect(results[0][0]).toBe(fixedUuid)
    expect(results[1][0]).toBe(fixedUuid)
    expect(results[2][0]).toBe(fixedUuid)
    expect(results[0][1]).toBe('endpoint1')
    expect(results[1][1]).toBe('endpoint1')
    expect(results[2][1]).toBe('endpoint1')

    // Factory should be called only once
    expect(factoryCalls).toBe(1)
  })

  test('list returns empty array when no containers exist', async () => {
    const tickManager = new TickManagerImpl(10)
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agentId1, {})
    await agent1.register(network)

    const containers = await agent1.list()
    expect(containers).toHaveLength(0)
  })

  test('kinds returns all registered container kinds', async () => {
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

    const kinds = agent1.kinds
    expect(kinds).toContain(sessionKind)
    expect(kinds).toContain(dbKind)
    expect(kinds.length).toBe(2)
  })
})
