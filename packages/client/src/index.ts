import {
  AgentImpl,
  TickManagerImpl,
  timeouts,
  type AgentUuid,
  type ContainerFactory,
  type ContainerKind,
  type NetworkAgent,
  type NetworkClient
} from '@hcengineering/network-core'
import { v4 as uuidv4 } from 'uuid'
import { NetworkAgentServer } from './agent'
import { NetworkClientImpl } from './client'

export * from './agent'
export * from './client'
export * from './types'

const tickMgr = new TickManagerImpl(timeouts.pingInterval * 2)

export function shutdownNetworkTickMgr (): void {
  tickMgr.stop()
}

process.on('exit', () => {
  shutdownNetworkTickMgr()
})

export function createNetworkClient (url: string): NetworkClient {
  const [host, portStr] = url.split(':')
  const port = portStr != null ? parseInt(portStr, 10) : 3737
  tickMgr.start()
  return new NetworkClientImpl(host, port, tickMgr)
}

export async function createAgent (
  endpointUrl: string,
  factory: Record<ContainerKind, ContainerFactory>
): Promise<{ agent: NetworkAgent, server: NetworkAgentServer }> {
  const agent = new AgentImpl(uuidv4() as AgentUuid, factory)

  const [host, portStr] = endpointUrl.split(':')
  const port = portStr != null ? parseInt(portStr, 10) : 3738

  tickMgr.start()
  const server = new NetworkAgentServer(tickMgr, host, '*', port)

  await server.start(agent)
  return { agent, server }
}
