import type { AgentRecord, NetworkAgent } from './agent'
import type {
  ContainerEndpointRef,
  AgentUuid,
  ClientUuid,
  ContainerKind,
  ContainerUuid,
  ContainerRequest,
  ContainerRecord,
  ContainerEvent
} from './types'

/**
 * Interface to Huly network on server.
 */
export interface Network {
  /*
   * Register or reregister agent in network.
   * On every network restart agent should reconnect to network.
   */
  register: (record: AgentRecord, agent: NetworkAgent) => Promise<ContainerEndpointRef[]>

  // Unregister an agent from the network.
  // Will call terminate for every connection/references.
  unregister: (agentId: AgentUuid) => Promise<void>

  // Mark an agent as alive (updates lastSeen timestamp)
  ping: (agentId: AgentUuid | ClientUuid) => void

  agents: () => Promise<AgentRecord[]>

  // A full uniq set of supported container kinds.
  kinds: () => Promise<ContainerKind[]>

  /*
   * Get/Start of required container kind on agent
   * Will start a required container on agent, if not already started.
   */
  get: (client: ClientUuid, uuid: ContainerUuid, request: ContainerRequest) => Promise<ContainerEndpointRef>

  /**
   * Release a container for a client, if container is not used anymore it will be shutdown with a shutdown delay.
   */
  release: (client: ClientUuid, uuid: ContainerUuid) => Promise<void>

  list: (kind?: ContainerKind) => Promise<ContainerRecord[]>

  // Send some data to container, using proxy connection.
  request: (target: ContainerUuid, operation: string, data?: any) => Promise<any>

  close: () => void
}

export interface NetworkWithClients {
  addClient: (clientUuid: ClientUuid, onContainer?: (event: ContainerEvent) => Promise<void>) => void
  removeClient: (clientUuid: ClientUuid) => void

  // When client is registering agent.
  mapAgent: (clientUuid: ClientUuid, agentUuid: AgentUuid) => void
  unmapAgent: (clientUuid: ClientUuid, agentUuid: AgentUuid) => void
}
