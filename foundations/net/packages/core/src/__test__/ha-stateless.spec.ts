/**
 * Test suite for HA Stateless Container feature
 */

import { AgentImpl, containerUuid, NetworkImpl, TickManagerImpl } from '../index'
import type { Container, ContainerUuid, ContainerKind, ClientUuid, ContainerEndpointRef, GetOptions } from '../index'

class MockHAContainer implements Container {
  terminated = false

  constructor (
    readonly uuid: ContainerUuid,
    readonly name: string
  ) {}

  async request (operation: string, data?: any): Promise<any> {
    return { uuid: this.uuid, name: this.name, operation, data }
  }

  async ping (): Promise<void> {}

  async terminate (): Promise<void> {
    this.terminated = true
  }

  connect (clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect (clientId: ClientUuid): void {}
}

describe('HA Stateless Containers', () => {
  const agentId1 = 'agent-1' as any
  const agentId2 = 'agent-2' as any
  const clientId1 = 'client-1' as any
  const haServiceKind = 'ha-service' as ContainerKind
  const sharedUuid = 'shared-container-001' as ContainerUuid

  let tickManager: TickManagerImpl
  let network: NetworkImpl

  beforeEach(() => {
    tickManager = new TickManagerImpl(1)
    network = new NetworkImpl(tickManager)
  })

  test('first agent wins when multiple agents register same UUID', async () => {
    // Create two agents with the same stateless container UUID
    const agent1 = new AgentImpl(agentId1, {
      [haServiceKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockHAContainer(opt.uuid ?? containerUuid(), 'agent1-dynamic'),
        endpoint: 'endpoint1' as ContainerEndpointRef
      })
    })

    const agent2 = new AgentImpl(agentId2, {
      [haServiceKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockHAContainer(opt.uuid ?? containerUuid(), 'agent2-dynamic'),
        endpoint: 'endpoint2' as ContainerEndpointRef
      })
    })

    // Add stateless containers with same UUID
    const container1 = new MockHAContainer(sharedUuid, 'agent1-stateless')
    const container2 = new MockHAContainer(sharedUuid, 'agent2-stateless')

    agent1.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint1' as ContainerEndpointRef, container1)
    agent2.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint2' as ContainerEndpointRef, container2)

    // Register agent1 first
    await agent1.register(network)
    const list1 = await agent1.list()
    expect(list1.some((c) => c.uuid === sharedUuid)).toBe(true) // Should be accepted

    // Register agent2 - should be rejected for the shared UUID
    await agent2.register(network)
    const list2 = await agent2.list()
    // Container should have been removed from agent2's list after rejection
    expect(list2.some((c) => c.uuid === sharedUuid)).toBe(false)

    // Verify agent1 owns the container
    const [uuid, endpoint] = await network.get(clientId1, haServiceKind, { uuid: sharedUuid })
    expect(uuid).toBe(sharedUuid)
    expect(endpoint).toBe('endpoint1')
  })

  test('stateless container is activated on successful registration', async () => {
    const agent = new AgentImpl(agentId1, {
      [haServiceKind]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new MockHAContainer(opt.uuid ?? containerUuid(), 'dynamic'),
        endpoint: 'endpoint' as ContainerEndpointRef
      })
    })

    const statelessContainer = new MockHAContainer(sharedUuid, 'stateless')
    agent.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint' as ContainerEndpointRef, statelessContainer)

    // Before registration, container should be in stateless map
    expect((agent as any).statelessContainers.has(sharedUuid)).toBe(true)

    await agent.register(network)

    // After successful registration, container should be activated (moved to active containers)
    expect((agent as any).statelessContainers.has(sharedUuid)).toBe(false)
    expect((agent as any)._byId.has(sharedUuid)).toBe(true)
  })

  test('stateless container is terminated when rejected', async () => {
    const agent1 = new AgentImpl(agentId1, {})
    const agent2 = new AgentImpl(agentId2, {})

    const container1 = new MockHAContainer(sharedUuid, 'agent1')
    const container2 = new MockHAContainer(sharedUuid, 'agent2')

    agent1.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint1' as ContainerEndpointRef, container1)
    agent2.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint2' as ContainerEndpointRef, container2)

    await agent1.register(network)
    await agent2.register(network)

    // Container2 should have been terminated as it was rejected
    expect(container2.terminated).toBe(true)
    expect(container1.terminated).toBe(false)
  })

  test('stateless containers are included in list() call', async () => {
    const agent = new AgentImpl(agentId1, {})

    const statelessContainer = new MockHAContainer(sharedUuid, 'stateless')
    agent.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint' as ContainerEndpointRef, statelessContainer)

    const list = await agent.list()
    expect(list).toHaveLength(1)
    expect(list[0].uuid).toBe(sharedUuid)
    expect(list[0].kind).toBe(haServiceKind)
  })

  test('getContainer works for both active and stateless containers', async () => {
    const agent = new AgentImpl(agentId1, {})

    const statelessContainer = new MockHAContainer(sharedUuid, 'stateless')
    agent.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint' as ContainerEndpointRef, statelessContainer)

    // Before activation, should find in stateless containers
    const container = await agent.getContainer(sharedUuid)
    expect(container).toBe(statelessContainer)

    // After activation
    await agent.register(network)
    const container2 = await agent.getContainer(sharedUuid)
    expect(container2).toBe(statelessContainer)
  })

  test('same agent re-registering updates endpoint', async () => {
    const agent = new AgentImpl(agentId1, {})

    const container = new MockHAContainer(sharedUuid, 'agent1')
    agent.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint1' as ContainerEndpointRef, container)

    await agent.register(network)

    // Re-register with different endpoint
    agent.removeStatelessContainer(sharedUuid)
    agent.addStatelessContainer(sharedUuid, haServiceKind, 'endpoint2' as ContainerEndpointRef, container)

    await agent.register(network)

    // Should not be rejected, endpoint should be updated
    const [, endpoint] = await network.get(clientId1, haServiceKind, { uuid: sharedUuid })
    expect(endpoint).toBe('endpoint2')
  })
})
