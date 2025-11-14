import { AgentImpl } from '../agent'
import { timeouts } from '../api/timeouts'
import {
  NetworkEventKind,
  type AgentUuid,
  type ClientUuid,
  type ContainerEndpointRef,
  type ContainerKind,
  type GetOptions,
  type NetworkEvent
} from '../api/types'
import { containerUuid, type Container } from '../containers'
import { NetworkImpl } from '../network'
import { FakeTickManager, TickManagerImpl } from '../utils'

class DummyContainer implements Container {
  lastVisit: number = 0
  onTerminated?: (() => void) | undefined

  async request (operation: string, data: any): Promise<any> {
    return undefined
  }

  async terminate (): Promise<void> {}

  async ping (): Promise<void> {
    this.lastVisit = Date.now()
  }

  connect (clientId: ClientUuid, handler: (data: any) => Promise<void>): void {}

  disconnect (clientId: ClientUuid): void {}
}

const agents = {
  agent1: 'agent1' as AgentUuid,
  agent2: 'agent2' as AgentUuid,
  agent3: 'agent3' as AgentUuid
}

const clients = {
  client1: 'client1' as ClientUuid
}

const kinds: Record<string, ContainerKind> = {
  session: 'session' as ContainerKind
}

describe('network tests', () => {
  it('check register agent', async () => {
    const tickManager = new TickManagerImpl(1) // 1 tick per second
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agents.agent1, {})
    await agent1.register(network)

    expect((network as any)._agents.size).toBe(1)
  })

  it('start container', async () => {
    const tickManager = new TickManagerImpl(1) // 1 tick per second
    const network = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agents.agent1, {
      [kinds.session]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new DummyContainer(),
        endpoint: '' as ContainerEndpointRef
      })
    })
    await agent1.register(network)
    expect((network as any)._agents.size).toBe(1)

    const s1 = await network.get(clients.client1 as any, kinds.session, { uuid: 's1' as any })
    expect(s1).toBeDefined()
  })

  it('start container-restart', async () => {
    const tickManager = new FakeTickManager()
    const network: NetworkImpl = new NetworkImpl(tickManager)

    const agent1 = new AgentImpl(agents.agent1, {
      [kinds.session]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new DummyContainer(),
        endpoint: '' as ContainerEndpointRef
      })
    })

    const agent2 = new AgentImpl(agents.agent2, {
      [kinds.session]: async (opt: GetOptions) => ({
        uuid: opt.uuid ?? containerUuid(),
        container: new DummyContainer(),
        endpoint: '' as ContainerEndpointRef
      })
    })
    await agent1.register(network)

    const events: NetworkEvent[] = []
    network.addClient(clients.client1, async (evt) => {
      events.push(evt)
    })

    expect((network as any)._agents.size).toBe(1)

    const s1 = await network.get(clients.client1 as any, kinds.session, { uuid: 's1' as any })
    expect(s1).toBeDefined()

    await agent2.register(network)

    expect((network as any)._agents.size).toBe(2)

    await tickManager.execAll() // Process init events

    // Check events

    expect(events.length).toBe(1) // One for agent, one for container
    expect(events[0].agents.length).toBe(2)
    expect(events[0].containers.length).toBe(1)

    // Mark it alive timeout
    tickManager.setTime(timeouts.aliveTimeout * 2 * 1000)
    // Make second as alive
    network.ping(agents.agent2)
    network.ping(clients.client1)

    await tickManager.execAll()

    // Agent should be one
    expect((network as any)._agents.size).toBe(1)

    // We need to check if event are sent
    // Check new events
    expect(events.length).toBe(2) // Check new events
    expect(events[1].agents.length).toBe(1)
    expect(events[1].containers.length).toBe(1)
    expect(events[1].agents[0].event).toBe(NetworkEventKind.removed)
    expect(events[1].containers[0].event).toBe(NetworkEventKind.removed)
  })
})
