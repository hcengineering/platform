import type { Container } from '../containers'
import type {
  AgentEndpointRef,
  AgentUuid,
  ContainerEndpointRef,
  ContainerEvent,
  ContainerKind,
  ContainerRecord,
  ContainerRequest,
  ContainerUuid
} from './types'

export interface AgentRecord {
  agentId: AgentUuid

  // If endpoint is not sepecified, container send will be passthrought via network connection.
  // Individal containers still could have connections.
  endpoint?: AgentEndpointRef

  // A change to containers
  containers: ContainerRecord[]
  kinds: ContainerKind[]
}
/**
 * Interface to Huly Agent on agent.
 */
export interface NetworkAgent {
  // Agent uniq identigier, should be same on agent restarts.
  uuid: AgentUuid

  // Agent connection endpoint.
  endpoint?: AgentEndpointRef

  // A supported set of container kinds supported to be managed by the agent
  kinds: ContainerKind[]

  // event handled from agent to network events.
  onUpdate?: (event: ContainerEvent) => Promise<void>

  // Send agent update info to network, if applicable.
  onAgentUpdate?: () => Promise<void>

  // Get/Start of required container kind on agent
  get: (uuid: ContainerUuid, request: ContainerRequest) => Promise<ContainerEndpointRef>

  // A low level reference to container
  getContainer: (uuid: ContainerUuid) => Promise<Container | undefined>

  // List of active containers
  list: (kind?: ContainerKind) => Promise<ContainerRecord[]>

  // Send some data to container
  request: (target: ContainerUuid, operation: string, data?: any) => Promise<any>

  // ask for immediate termination for container
  terminate: (container: ContainerEndpointRef) => Promise<void>
}
