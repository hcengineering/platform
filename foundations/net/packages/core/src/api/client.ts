import type { AgentRecordInfo, NetworkAgent } from './agent'
import type {
  ContainerEndpointRef,
  NetworkEvent,
  ContainerKind,
  ContainerRecord,
  ContainerUuid,
  GetOptions
} from './types'

export type NetworkUpdateListener = (event: NetworkEvent) => Promise<void>

/**
 * Interface for request handler (used by proxy)
 */
export interface RequestHandler {
  request: (method: string, params: any[]) => Promise<any>
}

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

  agents: () => Promise<AgentRecordInfo[]>

  // A full uniq set of supported container kinds.
  kinds: () => Promise<ContainerKind[]>

  /*
   * Get/Start of required container kind on agent
   * Will start a required container on agent, if not already started.
   */
  get: (kind: ContainerKind, options: GetOptions) => Promise<ContainerReference>

  list: (kind?: ContainerKind) => Promise<ContainerRecord[]>

  // Send some data to container, using proxy connection.
  request: (target: ContainerUuid, operation: string, data?: any) => Promise<any>

  // Register on container update listener
  // Return unsubscribe function
  onUpdate: (listener: NetworkUpdateListener) => () => void

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
 * Implements RequestHandler for proxy support.
 */
export interface ContainerReference extends RequestHandler {
  uuid: ContainerUuid

  endpoint: ContainerEndpointRef

  close: () => Promise<void>

  connect: () => Promise<ContainerConnection>

  /**
   * Send a request to the container
   * Can be called directly or via proxy with method name and params array
   */
  request: (operationOrMethod: string, dataOrParams?: any) => Promise<any>

  /**
   * Create a typed proxy for this container reference
   * @template T - The interface to implement
   * @param interfaceName - Optional name of the interface for better error messages
   * @returns A proxy object that implements the interface T
   *
   * @example
   * ```typescript
   * interface MyService {
   *   sayHello(name: string): Promise<string>
   * }
   *
   * const containerRef = await client.get('my-service', {})
   * const service = containerRef.cast<MyService>('MyService')
   * const greeting = await service.sayHello('Alice')
   * ```
   */
  cast: <T extends object>(interfaceName?: string) => T

  // A notification will be called if container changed container endpoint reference
  onEndpointUpdate?: () => void
}

// A request/reponse interface to container.
// Implements RequestHandler for proxy support.
export interface ContainerConnection extends RequestHandler {
  containerId: ContainerUuid

  /**
   * Send a request to the container
   * Can be called directly or via proxy with method name and params array
   */
  request: (operationOrMethod: string, dataOrParams?: any) => Promise<any>

  /**
   * Create a typed proxy for this container connection
   * @template T - The interface to implement
   * @param interfaceName - Optional name of the interface for better error messages
   * @returns A proxy object that implements the interface T
   *
   * @example
   * ```typescript
   * interface MyService {
   *   calculate(a: number, b: number): Promise<number>
   * }
   *
   * const connection = await containerRef.connect()
   * const service = connection.cast<MyService>('MyService')
   * const result = await service.calculate(10, 20)
   * ```
   */
  cast: <T extends object>(interfaceName?: string) => T

  // A chunk streaming of results
  // stream: (data: any) => Iterable<any>

  // Recieve not a requests but also any kind of notifications.
  on?: (data: any) => Promise<void>

  close: () => Promise<void>
}
