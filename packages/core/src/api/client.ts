import type { AgentRecord, NetworkAgent } from './agent'
import type {
  ContainerEndpointRef,
  ContainerEvent,
  ContainerKind,
  ContainerRecord,
  ContainerRequest,
  ContainerUuid
} from './types'

export type ContainerUpdateListener = (event: ContainerEvent) => Promise<void>

/**
 * Interface to Huly network.
 *
 * Identification is generated during instantions of client.
 *
 * Client is attempt connecting indefinitely, but helper connect method could be used to be sure we connected on time.
 */
export interface NetworkClient {
  /*
   * Register or a NetworkAgent API to be processed by network.
   * On every network change restart agent register method will be called.
   */
  register: (agent: NetworkAgent) => Promise<void>

  agents: () => Promise<AgentRecord[]>

  // A full uniq set of supported container kinds.
  kinds: () => Promise<ContainerKind[]>

  /*
   * Get/Start of required container kind on agent
   * Will start a required container on agent, if not already started.
   */
  get: (uuid: ContainerUuid, request: ContainerRequest) => Promise<ContainerReference>

  list: (kind?: ContainerKind) => Promise<ContainerRecord[]>

  // Send some data to container, using proxy connection.
  request: (target: ContainerUuid, operation: string, data?: any) => Promise<any>

  // Register on container update listener
  onContainerUpdate: (listener: ContainerUpdateListener) => void

  // We could wait for a connection for a time period.
  // If timeout === 0, we wait indefinitely.
  waitConnection: (timeout?: number) => Promise<void>

  close: () => Promise<void>
}

export interface ConnectionManager {
  connect: (endpoint: ContainerEndpointRef) => Promise<ContainerConnection>
}

/**
 * A client reference to container, until closed, client will notify network about container is still required.
 */
export interface ContainerReference {
  uuid: ContainerUuid

  endpoint: ContainerEndpointRef

  close: () => Promise<void>

  connect: () => Promise<ContainerConnection>

  request: (operation: string, data?: any) => Promise<any>
}

// A request/reponse interface to container.
export interface ContainerConnection {
  containerId: ContainerUuid

  // A simple request/response to container.
  request: (operation: string, data?: any) => Promise<any>

  // A chunk streaming of results
  // stream: (data: any) => Iterable<any>

  // Recieve not a requests but also any kind of notifications.
  on?: (data: any) => Promise<void>

  close: () => Promise<void>
}
