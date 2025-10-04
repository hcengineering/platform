import {
  AgentImpl,
  TickManagerImpl,
  timeouts,
  containerOnAgentEndpointRef,
  type AgentUuid,
  type ContainerFactory,
  type ContainerKind,
  type NetworkClient,
  type Container,
  type ContainerUuid,
  type ContainerEndpointRef,
  type AgentEndpointRef
} from '@hcengineering/network-core'
import { v4 as uuidv4 } from 'uuid'
import { NetworkAgentServer } from './agent'
import { NetworkClientImpl } from './client'

export * from './agent'
export * from './client'
export * from './types'
export { containerOnAgentEndpointRef }

export interface StatelessContainerConfig {
  uuid: ContainerUuid
  kind: ContainerKind
  endpoint: ContainerEndpointRef
  container: Container
}

export type StatelessContainersFactory = (
  agentEndpoint: AgentEndpointRef
) => StatelessContainerConfig[] | Promise<StatelessContainerConfig[]>

export interface ClientWithAgents extends NetworkClient {
  // Will create agent and register it to network
  serveAgent: (
    endpointUrl: string,
    factory: Record<ContainerKind, ContainerFactory>,
    statelessContainers?: StatelessContainersFactory
  ) => Promise<void>
}

class NetworkClientWithAgents extends NetworkClientImpl implements ClientWithAgents {
  servers: [string, NetworkAgentServer][] = []

  constructor (host: string, port: number, aliveTimeout?: number) {
    super(host, port, new TickManagerImpl(timeouts.pingInterval * 2), aliveTimeout)
  }

  async serveAgent (
    endpointUrl: string,
    factory: Record<ContainerKind, ContainerFactory>,
    statelessContainers?: StatelessContainersFactory
  ): Promise<void> {
    if (this.servers.find((s) => s[0] === endpointUrl) != null) {
      throw new Error(`Agent server already running at ${endpointUrl}`)
    }
    const agent = new AgentImpl(uuidv4() as AgentUuid, factory)

    const [host, portStr] = endpointUrl.split(':')
    const port = portStr != null ? parseInt(portStr, 10) : 3738

    const server = new NetworkAgentServer(this.tickMgr, host, '*', port)
    this.servers.push([endpointUrl, server])
    await server.start(agent)

    // Add stateless containers if provided
    if (statelessContainers != null) {
      // Get the agent endpoint after server starts - it should be initialized
      const agentEndpoint = agent.endpoint
      if (agentEndpoint === undefined) {
        throw new Error('Agent endpoint not initialized after server start')
      }

      const configs = await statelessContainers(agentEndpoint)
      for (const config of configs) {
        agent.addStatelessContainer(config.uuid, config.kind, config.endpoint, config.container)
      }
    }

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
