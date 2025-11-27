import { NetworkAgentServer, NetworkClientImpl } from '@hcengineering/network-client'
import {
  AgentImpl,
  composeCID,
  containerOnAgentEndpointRef,
  containerUuid,
  EndpointKind,
  NetworkImpl,
  parseEndpointRef,
  TickManagerImpl,
  type AgentEndpointRef,
  type AgentUuid,
  type ContainerConnection,
  type ContainerKind,
  type NetworkClient,
  type TickManager
} from '@hcengineering/network-core'
import { NetworkServer } from '../server'
import { DummySessionContainer } from './dummySession'
import { DummyWorkspaceContainer } from './dummyWorkspace'

const agents = {
  agent1: 'agent1' as AgentUuid,
  agent2: 'agent2' as AgentUuid
}

const kinds = {
  session: 'session' as ContainerKind,
  workspace: 'workspace' as ContainerKind
}

function createAgent1 (tickMgr: TickManager, networkClient: NetworkClient): AgentImpl {
  const agent: AgentImpl = new AgentImpl(agents.agent1, {
    [kinds.session]: async (options) => {
      const uuid = options.uuid ?? containerUuid()
      return {
        uuid,
        container: new DummySessionContainer(),
        endpoint: containerOnAgentEndpointRef(agent.endpoint as AgentEndpointRef, uuid)
      }
    },
    [kinds.workspace]: async (options) => {
      const uuid = options.uuid ?? containerUuid()
      const container = new DummyWorkspaceContainer(uuid, agent.uuid, networkClient)
      const endpoint = await container.start(tickMgr)
      return { uuid, container, endpoint }
    }
  })
  return agent
}

describe('check network server is working fine', () => {
  it('check agent connect to network', async () => {
    const tickMgr = new TickManagerImpl(10) // 10 ticks per second
    const net = new NetworkImpl(tickMgr)

    // we need some values to be available
    const network = new NetworkServer(net, tickMgr, '*', 0)

    const networkClient: NetworkClient = new NetworkClientImpl('localhost', await network.rpcServer.getPort(), tickMgr)

    const _kinds = await networkClient.kinds()
    expect(_kinds.length).toEqual(0)

    const _agents = await networkClient.agents()
    expect(_agents.length).toEqual(0)

    await networkClient.close()
    await network.close()
    tickMgr.stop()
  })

  it('check routed connection and requests', async () => {
    const tickMgr = new TickManagerImpl(10) // 10 ticks per second
    const net = new NetworkImpl(tickMgr)

    // we need some values to be available
    const network = new NetworkServer(net, tickMgr, '*', 0)

    const networkClient: NetworkClient = new NetworkClientImpl('localhost', await network.rpcServer.getPort(), tickMgr)

    const agent = createAgent1(tickMgr, networkClient)
    // Random port on *
    const agentServer = new NetworkAgentServer(tickMgr, 'localhost', '*', 0)
    await agentServer.start(agent)

    await networkClient.register(agent)

    const _kinds = await networkClient.kinds()
    expect(_kinds).toEqual(['session', 'workspace'])

    const _agents = await networkClient.agents()
    expect(_agents.length).toEqual(1)
    expect(_agents[0].agentId).toEqual(agents.agent1)
    expect(_agents[0].containers).toEqual(0)

    // Start a new container and check if messaging works
    const containerRef = await networkClient.get(kinds.session, { uuid: composeCID('session', 'user1') })

    const data = parseEndpointRef(containerRef.endpoint)
    expect(data.kind).toEqual(EndpointKind.routed)

    const containers = await networkClient.list(kinds.session)
    expect(containers.length).toEqual(1)

    const containerConnection: ContainerConnection = await containerRef.connect()
    expect(containerConnection).toBeDefined()

    // Verify requests and events are working fine.
    const events: any[] = []
    const p = new Promise<void>((resolve) => {
      containerConnection.on = async (data) => {
        events.push(data)
        resolve()
      }
    })

    const resp1 = await containerConnection.request('test')
    expect(resp1).toEqual('test-ok')

    await p
    expect(events.length).toEqual(1)
    expect(events[0]).toEqual('event')

    await networkClient.close()
    await agentServer.close()
    await network.close()
    tickMgr.stop()
  })
})
