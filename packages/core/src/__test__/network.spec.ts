import { AgentImpl } from '../agent'
import type { AgentUuid, ClientUuid, ContainerEndpointRef, ContainerKind, GetOptions } from '../api/types'
import { containerUuid, type Container } from '../containers'
import { NetworkImpl } from '../network'
import { TickManagerImpl } from '../utils'

// class DummyConnectionManager implements ConnectionManager {
//   async connect (endpoint: ContainerEndpointRef): Promise<ContainerConnection> {
//     throw new Error('Method not implemented.')
//   }
// }

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

    const s1 = await network.get(agents.agent1 as any, kinds.session, { uuid: 's1' as any })
    expect(s1).toBeDefined()
  })
})
