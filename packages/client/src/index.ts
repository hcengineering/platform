import {
  AgentImpl,
  TickManagerImpl,
  timeouts,
  type AgentUuid,
  type ContainerFactory,
  type ContainerKind,
  type NetworkClient
} from '@hcengineering/network-core'
import { v4 as uuidv4 } from 'uuid'
import { NetworkAgentServer } from './agent'
import { NetworkClientImpl } from './client'

export * from './agent'
export * from './client'
export * from './types'

export interface ClientWithAgents extends NetworkClient {
  // Will create agent and register it to network
  serveAgent: (endpointUrl: string, factory: Record<ContainerKind, ContainerFactory>) => Promise<void>
}

class NetworkClientWithAgents extends NetworkClientImpl implements ClientWithAgents {
  servers: [string, NetworkAgentServer][] = []

  constructor (host: string, port: number, aliveTimeout?: number) {
    super(host, port, new TickManagerImpl(timeouts.pingInterval * 2), aliveTimeout)
  }

  async serveAgent (endpointUrl: string, factory: Record<ContainerKind, ContainerFactory>): Promise<void> {
    if (this.servers.find((s) => s[0] === endpointUrl) != null) {
      throw new Error(`Agent server already running at ${endpointUrl}`)
    }
    const agent = new AgentImpl(uuidv4() as AgentUuid, factory)

    const [host, portStr] = endpointUrl.split(':')
    const port = portStr != null ? parseInt(portStr, 10) : 3738

    const server = new NetworkAgentServer(this.tickMgr, host, '*', port)
    this.servers.push([endpointUrl, server])
    await server.start(agent)

    await this.register(agent)
  }

  async close (): Promise<void> {
    this.tickMgr.stop()
    for (const [, server] of this.servers) {
      await server.close()
    }
    await super.close()
  }

  async [Symbol.asyncDispose] (): Promise<void> {
    await this.close()
  }

  [Symbol.dispose] (): void {
    void this.close().catch((err) => {
      console.error('Error during dispose:', err)
    })
  }
}

export function createNetworkClient (url: string, aliveTimeout?: number): NetworkClientWithAgents {
  const [host, portStr] = url.split(':')
  const port = portStr != null ? parseInt(portStr, 10) : 3737

  return new NetworkClientWithAgents(host, port, aliveTimeout)
}
