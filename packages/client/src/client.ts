import { BackRPCClient, type BackRPCResponseSend } from '@hcengineering/network-backrpc'
import {
  agentDirectRef,
  EndpointKind,
  parseEndpointRef,
  type AgentEndpointRef,
  type AgentRecordInfo,
  type AgentUuid,
  type ClientUuid,
  type ContainerConnection,
  type ContainerEndpointRef,
  type NetworkEvent,
  type ContainerKind,
  type ContainerRecord,
  type ContainerReference,
  type NetworkUpdateListener,
  type ContainerUuid,
  type GetOptions,
  type NetworkAgent,
  type NetworkClient,
  type TickManager,
  NetworkEventKind
} from '@hcengineering/network-core'
import { v4 as uuidv4 } from 'uuid'
import { ContainerConnectionImpl, NetworkDirectConnectionImpl, RoutedNetworkAgentConnectionImpl } from './agent'
import { opNames } from './types'

interface ClientAgentRecord {
  agent: NetworkAgent
  register: Promise<void>
  resolve: () => void
}

class ContainerReferenceImpl implements ContainerReference {
  constructor (
    readonly uuid: ContainerUuid,
    private readonly client: NetworkClientImpl
  ) {}

  get endpoint (): ContainerEndpointRef {
    const ref = this.client.references.get(this.uuid)
    if (ref === undefined) {
      throw new Error('Reference not found')
    }
    return ref.endpoint
  }

  async close (): Promise<void> {
    await this.client.release(this.uuid)
    this.client.references.delete(this.uuid)
  }

  async request (operation: string, data?: any): Promise<any> {
    return await this.client.request(this.uuid, operation, data)
  }

  async connect (): Promise<ContainerConnection> {
    let conn = this.client.containerConnections.get(this.uuid)
    if (conn !== undefined) {
      return conn
    }
    conn = this.client.establishConnection(this.uuid, this.endpoint)
    await conn.connect()
    return conn
  }
}

interface ContainerRef {
  ref: ContainerReference
  kind: ContainerKind
  request: GetOptions
  endpoint: ContainerEndpointRef
}

/**
 * Huly Network client
 *
 * Some methods are omit clientId parameter.
 */
export class NetworkClientImpl implements NetworkClient {
  clientId: ClientUuid = uuidv4() as ClientUuid

  private readonly client: BackRPCClient<ClientUuid>

  readonly _agents = new Map<AgentUuid, ClientAgentRecord>()

  // A set of clients for individual containers or agent TORs
  containerConnections = new Map<ContainerUuid, ContainerConnectionImpl>()
  agentConnections = new Map<AgentEndpointRef, RoutedNetworkAgentConnectionImpl<ClientUuid>>()

  cid: number = 0
  containerListeners = new Map<number, NetworkUpdateListener>()

  references = new Map<ContainerUuid, ContainerRef>()

  registered: boolean = false

  constructor (
    readonly host: string,
    port: number,
    private readonly tickMgr: TickManager,
    aliveTimeout?: number
  ) {
    const options = undefined
    this.client = new BackRPCClient<ClientUuid>(this.clientId, this, host, port, tickMgr, options, aliveTimeout)
  }

  async waitConnection (timeout?: number): Promise<void> {
    if (timeout !== undefined) {
      await new Promise<void>((resolve, reject) => {
        const co = setTimeout(() => {
          // Timeout reached, we reject the promise by throwing an error
          reject(new Error('Connection timeout'))
        }, timeout)

        this.client
          .waitConnection()
          .then(() => {
            resolve()
            clearTimeout(co)
          })
          .catch((err) => {
            reject(err)
          })
      })
      return
    }
    await this.client.waitConnection()
  }

  async close (): Promise<void> {
    for (const refs of this.references.values()) {
      await refs.ref.close()
    }
    for (const directConn of this.containerConnections.values()) {
      await directConn.close()
    }
    for (const agentConn of this.agentConnections.values()) {
      await agentConn.close()
    }

    for (const agent of this._agents.values()) {
      await this.client.request<ContainerEndpointRef[]>(opNames.unregister, {
        uuid: agent.agent.uuid
      })
    }
    this.client.close()
  }

  async requestHandler (method: string, params: any, send: BackRPCResponseSend): Promise<void> {
    const [agentId, agentParams] = params
    // Pass agent methods to a proper agent
    const { agent } = this._agents.get(agentId) ?? { agent: undefined }
    if (agent === undefined) {
      await send({ error: `Agent ${agentId} not found` })
      return
    }
    switch (method) {
      case opNames.getContainer:
        await send(await agent.get(agentParams[0], agentParams[1]))
        break
      case opNames.listContainers:
        await send(await agent.list(agentParams[0]))
        break
      case opNames.sendContainer:
        await send(await agent.request(agentParams[0], agentParams[1], agentParams[2]))
        break
      case opNames.terminate:
        await agent.terminate(agentParams[0] as ContainerUuid)
        await send('')
        break
      default:
        throw new Error('Unknown method')
    }
  }

  async onEvent (event: NetworkEvent): Promise<void> {
    // Handle container events
    // In case of container stopped, agent stopped or endpoint changed, we need to update direct connections to be re-established.
    await this.handleConnectionUpdates(event)

    for (const listener of this.containerListeners.values()) {
      try {
        await listener(event)
      } catch (error) {
        console.error('Error in container listener:', error)
      }
    }
  }

  async handleRefUpdate (uuid: ContainerUuid, endpoint: ContainerEndpointRef): Promise<void> {
    const ref = this.references.get(uuid)
    if (ref !== undefined) {
      const conn = this.containerConnections.get(ref.ref.uuid)
      if (conn !== undefined && ref.endpoint !== endpoint) {
        conn.setConnection(this.establishConnection(ref.ref.uuid, endpoint))
      } else {
        ref.endpoint = endpoint
      }
    }
  }

  async handleNewContainer (oldUuid: ContainerUuid, uuid: ContainerUuid, endpoint: ContainerEndpointRef): Promise<void> {
    const ref = this.references.get(oldUuid)
    this.references.delete(oldUuid)
    if (ref !== undefined) {
      const conn = this.containerConnections.get(oldUuid)
      this.containerConnections.delete(oldUuid)
      if (conn !== undefined) {
        this.containerConnections.set(uuid, conn)
        if (ref.endpoint !== endpoint) {
          conn.setConnection(this.establishConnection(uuid, endpoint))
        }
      }
      ref.ref.uuid = uuid
      ref.endpoint = endpoint

      this.references.set(uuid, ref)
    }
  }

  async onRegister (): Promise<void> {
    this.registered = true
    // We need to re-register all our managed agents, since we could provide containers we request to our selfs
    for (const agent of this._agents.values()) {
      await this.doRegister(agent.agent)
    }

    for (const [uuid, ref] of this.references.entries()) {
      const [newUuid, newEndpoint] = await this.retryGetContainerRef(ref.kind, ref.request)
      if (uuid !== newUuid) {
        await this.handleNewContainer(uuid, newUuid, newEndpoint)
      } else {
        await this.handleRefUpdate(uuid, newEndpoint)
      }
    }
  }

  /**
   * Register a new agent, agent could or could not provide an endpoint for routed connections.
   */
  async register (agent: NetworkAgent): Promise<void> {
    const rec: ClientAgentRecord = {
      agent,
      register: Promise.resolve(),
      resolve: () => {}
    }
    rec.register = new Promise<void>((resolve) => {
      rec.resolve = resolve
    })
    this._agents.set(agent.uuid, rec)

    agent.onUpdate = async (event) => {
      await this.client.request(opNames.containerUpdate, event)
    }
    agent.onAgentUpdate = async () => {
      await this.doRegister(agent)
    }

    if (this.registered) {
      await this.doRegister(agent)
    }
    await rec.register
  }

  async doRegister (agent: NetworkAgent): Promise<void> {
    const containers: ContainerRecord[] = []
    for (const container of await agent.list()) {
      containers.push({
        agentId: agent.uuid,
        uuid: container.uuid,
        endpoint: container.endpoint,
        kind: container.kind,
        lastVisit: container.lastVisit
      } satisfies ContainerRecord)
    }
    const toClean = await this.client.request<ContainerUuid[]>(opNames.register, {
      uuid: agent.uuid,
      containers,
      kinds: agent.kinds,
      endpoint: agent.endpoint
    })
    for (const uuid of toClean) {
      await agent.terminate(uuid)
    }
    this._agents.get(agent.uuid)?.resolve()
  }

  async agents (): Promise<AgentRecordInfo[]> {
    // Return actual list of agents
    return await this.client.request<AgentRecordInfo[]>(opNames.getAgents, {})
  }

  async kinds (): Promise<ContainerKind[]> {
    return await this.client.request<ContainerKind[]>(opNames.getKinds, {})
  }

  async get (kind: ContainerKind, request: GetOptions): Promise<ContainerReference> {
    // TODO: Wait for all pending requests to finish

    if (request.uuid !== undefined) {
      const existing = this.references.get(request.uuid)
      if (existing !== undefined) {
        return existing.ref
      }
    }
    const [uuid, endpoint] = await this.retryGetContainerRef(kind, request)
    const ref: ContainerReference = new ContainerReferenceImpl(uuid, this)
    this.references.set(uuid, { kind, ref, request, endpoint })
    return ref
  }

  establishConnection (uuid: ContainerUuid, endpoint: ContainerEndpointRef): ContainerConnectionImpl {
    // Check if connection is routed
    const parsedRef = parseEndpointRef(endpoint)
    if (parsedRef.uuid === undefined) {
      throw new Error('Invalid endpoint reference')
    }
    if (parsedRef.kind === EndpointKind.noconnect) {
      throw new Error('No connection available')
    }
    if (parsedRef.kind === EndpointKind.routed) {
      const agentRef = agentDirectRef(parsedRef.host, parsedRef.port, parsedRef.agentId)
      let agentConn = this.agentConnections.get(agentRef)
      if (agentConn === undefined) {
        agentConn = new RoutedNetworkAgentConnectionImpl<ClientUuid>(
          this.tickMgr,
          this.clientId,
          parsedRef.host,
          parsedRef.port
        )
        this.agentConnections.set(agentRef, agentConn)
      }
      let conn = this.containerConnections.get(uuid)
      if (conn === undefined) {
        conn = new ContainerConnectionImpl(uuid, agentConn.connect(parsedRef.uuid))
      } else {
        conn.setConnection(agentConn.connect(parsedRef.uuid))
      }
      this.containerConnections.set(uuid, conn)
      return conn
    }
    const directConn = new NetworkDirectConnectionImpl(
      this.tickMgr,
      this.clientId,
      parsedRef.uuid,
      parsedRef.host,
      parsedRef.port
    )
    let conn = this.containerConnections.get(uuid)
    if (conn === undefined) {
      conn = new ContainerConnectionImpl(uuid, directConn)
    } else {
      conn.setConnection(directConn)
    }
    this.containerConnections.set(uuid, conn)
    return conn
  }

  async handleConnectionUpdates (event: NetworkEvent): Promise<void> {
    // Handle connection updates
    for (const e of event.containers ?? []) {
      if (e.event === NetworkEventKind.removed || e.event === NetworkEventKind.updated) {
        await this.handleRefUpdate(e.container.uuid, e.container.endpoint)
      }
    }
  }

  private async getContainerRef (
    kind: ContainerKind,
    request: GetOptions
  ): Promise<[ContainerUuid, ContainerEndpointRef]> {
    return await this.client.request<[ContainerUuid, ContainerEndpointRef]>(opNames.getContainer, { kind, request })
  }

  async retryGetContainerRef (kind: ContainerKind, request: GetOptions): Promise<[ContainerUuid, ContainerEndpointRef]> {
    let waitTimeout: number = 1
    let earlyRetry = (): void => {}
    const stop = this.onUpdate(async (event) => {
      // We agent is appear with a required kind, we can retry immediately
      if (event.agents.some((e) => e.event === NetworkEventKind.added && e.kinds.includes(kind))) {
        waitTimeout = 0
        earlyRetry()
      }
    })
    try {
      while (true) {
        try {
          const ref = await this.getContainerRef(kind, request)
          if (waitTimeout > 1) {
            console.log(`Successfully got container ref for ${kind} after ${waitTimeout - 1} retries.`)
          }
          return ref
        } catch (err) {
          console.warn(`Error getting container ref for ${kind}. Will retry...`)

          await Promise.any([
            this.tickMgr.waitTick(waitTimeout),
            new Promise<void>((resolve) => {
              earlyRetry = resolve
            })
          ])
          if (waitTimeout < this.tickMgr.tps * 5) {
            waitTimeout++
          }
        }
      }
    } finally {
      stop()
    }
  }

  async release (uuid: ContainerUuid): Promise<void> {
    await this.client.request<any>(opNames.releaseContainer, { uuid })
  }

  async list (kind?: ContainerKind): Promise<ContainerRecord[]> {
    return await this.client.request<ContainerRecord[]>(opNames.listContainers, {
      kind
    })
  }

  // Send some data to container, using proxy connection.
  async request (target: ContainerUuid, operation: string, data?: any): Promise<any> {
    return await this.client.request<any>(opNames.sendContainer, [target, operation, data])
  }

  onUpdate (listener: NetworkUpdateListener): () => void {
    const cid = this.cid++
    this.containerListeners.set(cid, listener)
    return () => {
      this.containerListeners.delete(cid)
    }
  }
}
