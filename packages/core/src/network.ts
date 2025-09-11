import type { AgentRecord, NetworkAgent } from './api/agent'
import type { Network, NetworkWithClients } from './api/network'
import { timeouts } from './api/timeouts'
import type {
  AgentEndpointRef,
  AgentUuid,
  ClientUuid,
  ContainerEndpointRef,
  ContainerEvent,
  ContainerKind,
  ContainerRecord,
  ContainerRequest,
  ContainerUuid
} from './api/types'
import type { TickManager } from './api/utils'
import type { ContainerRecordImpl } from './containers'

interface AgentRecordImpl {
  api: NetworkAgent
  containers: Map<ContainerUuid, ContainerRecordImpl>
  endpoint?: AgentEndpointRef
  kinds: ContainerKind[]

  lastSeen: number // Last time when agent was seen
}

interface ClientRecordImpl {
  lastSeen: number
  containers: Set<ContainerUuid>
  onContainer?: (event: ContainerEvent) => Promise<void>

  agents: Set<AgentUuid>
}
/**
 * Server network implementation.
 */
export class NetworkImpl implements Network, NetworkWithClients {
  private idx: number = 0

  private readonly _agents = new Map<AgentUuid, AgentRecordImpl>()

  private readonly _containers = new Map<ContainerUuid, AgentUuid>()

  private readonly _clients = new Map<ClientUuid, ClientRecordImpl>()

  private readonly _orphanedContainers = new Map<ContainerEndpointRef, ContainerRecordImpl>()

  private eventQueue: ContainerEvent[] = []

  private readonly stopTick?: () => void

  constructor (private readonly tickManager: TickManager) {
    // Register for periodic agent health checks
    this.stopTick = tickManager.register(() => {
      void this.checkAlive().catch((err) => {
        console.error('Error during network health check:', err)
      })
      // Check for events on every tick
      void this.sendEvents()
    }, timeouts.aliveTimeout)
  }

  close (): void {
    this.stopTick?.()
  }

  async agents (): Promise<AgentRecord[]> {
    return Array.from(
      this._agents.values().map(({ api, containers }) => ({
        agentId: api.uuid,
        endpoint: api.endpoint,
        kinds: api.kinds,
        containers: Array.from(containers.values())
          .filter((it) => !(it.endpoint instanceof Promise))
          .map(({ record, endpoint }) => ({ ...record, endpoint: endpoint as ContainerEndpointRef }))
      }))
    )
  }

  async kinds (): Promise<ContainerKind[]> {
    return Array.from(
      this._agents
        .values()
        .map((it) => it.kinds)
        .flatMap((it) => it)
    )
  }

  async list (kind?: ContainerKind): Promise<ContainerRecord[]> {
    return Array.from(this._agents.values())
      .flatMap((it) => Array.from(it.containers.values()))
      .filter((it) => kind === undefined || it.record.kind === kind)
      .map((it) => it.record)
  }

  async request (target: ContainerUuid, operation: string, data?: any): Promise<any> {
    const agentId = this._containers.get(target)
    if (agentId === undefined) {
      throw new Error(`Container ${target} not found`)
    }
    const agent = this._agents.get(agentId)
    if (agent === undefined) {
      throw new Error(`Agent ${agentId} not found for container ${target}`)
    }
    const container = agent.containers.get(target)
    if (container === undefined) {
      throw new Error(`Container ${target} not registered on agent ${agentId}`)
    }
    return await agent.api.request(target, operation, data)
  }

  async register (record: AgentRecord, agent: NetworkAgent): Promise<ContainerEndpointRef[]> {
    const containers: ContainerRecord[] = record.containers
    const newContainers = new Map<ContainerUuid, ContainerRecordImpl>(
      containers.map((record) => [
        record.uuid,
        {
          record,
          request: { kind: record.kind },
          endpoint: record.endpoint,
          clients: new Set<ClientUuid>([])
        }
      ])
    )

    const containerEvent: ContainerEvent = {
      added: [],
      deleted: [],
      updated: []
    }

    // Register agent record
    const oldAgent = this._agents.get(record.agentId)
    if (oldAgent !== undefined) {
      // In case re-register or reconnect is happened.
      // Check if some of container changed endpoints.
      for (const rec of containers) {
        const oldRec = oldAgent.containers.get(rec.uuid)
        if (oldRec !== undefined) {
          if (oldRec.record.endpoint !== rec.endpoint) {
            oldRec.endpoint = rec.endpoint // Update endpoint
            containerEvent.updated.push(rec)
          }
        }
      }
      // Handle remove of containers
      for (const oldC of oldAgent.containers.values()) {
        if (newContainers.get(oldC.record.uuid) === undefined) {
          containerEvent.deleted.push(oldC.record)
          this._containers.delete(oldC.record.uuid) // Remove from active container registry
        }
      }
    }

    const containersToShutdown: ContainerEndpointRef[] = []

    // Update active container registry.
    for (const rec of containers) {
      const oldAgentId = this._containers.get(rec.uuid)
      if (oldAgentId === undefined) {
        containerEvent.added.push(rec)
        this._containers.set(rec.uuid, record.agentId)
      }
      if (oldAgentId !== record.agentId) {
        containersToShutdown.push(rec.endpoint)
      }
    }

    // update agent record

    this._agents.set(record.agentId, {
      api: agent,
      containers: newContainers,
      endpoint: record.endpoint,
      kinds: record.kinds,
      lastSeen: this.tickManager.now()
    })

    this.eventQueue.push(containerEvent)

    // Send notification to all agents about containers update.
    return containersToShutdown
  }

  async unregister (agentId: AgentUuid): Promise<void> {
    const agent = this._agents.get(agentId)
    if (agent === undefined) {
      return // Fine to ignore
    }
    await this.processDeadAgent(agentId)
  }

  async sendEvents (): Promise<void> {
    const events = [...this.eventQueue]
    this.eventQueue = []
    if (events.length === 0) {
      return
    }
    // Combine events

    const finalEvent: ContainerEvent = {
      added: [],
      deleted: [],
      updated: []
    }
    for (const event of events) {
      finalEvent.added.push(...event.added)
      finalEvent.deleted.push(...event.deleted)
      finalEvent.updated.push(...event.updated)
    }

    // Skip deleted events.
    const deletedIds = finalEvent.deleted.map((c) => c.uuid)
    finalEvent.added = finalEvent.added.filter((c) => !deletedIds.includes(c.uuid))
    finalEvent.updated = finalEvent.updated.filter((c) => !deletedIds.includes(c.uuid))

    for (const [clientUuid, client] of Object.entries(this._clients)) {
      if (client.onContainer !== undefined) {
        try {
          // We should not block on broadcast to clients.
          void client.onContainer(finalEvent)
        } catch (err: any) {
          console.error(`Error in client ${clientUuid} onContainer callback:`, err)
        }
      }
    }
  }

  addClient (clientUuid: ClientUuid, onContainer?: (event: ContainerEvent) => Promise<void>): void {
    const info = this._clients.get(clientUuid) ?? {
      lastSeen: this.tickManager.now(),
      containers: new Set(),
      onContainer,
      agents: new Set()
    }
    info.onContainer = onContainer
    this._clients.set(clientUuid, info)
  }

  removeClient (client: ClientUuid): void {
    // Handle outdated clients
    const clientRecord = this._clients.get(client)
    if (clientRecord !== undefined) {
      for (const uuid of clientRecord.containers) {
        this.release(client, uuid).catch((err) => {
          console.error(`Error releasing container ${uuid} for client ${client}:`, err)
        })
      }
    }
    this._clients.delete(client)
  }

  mapAgent (clientUuid: ClientUuid, agentUuid: AgentUuid): void {
    const client = this._clients.get(clientUuid)
    if (client !== undefined) {
      client.agents.add(agentUuid)
    }
  }

  unmapAgent (clientUuid: ClientUuid, agentUuid: AgentUuid): void {
    const client = this._clients.get(clientUuid)
    if (client !== undefined) {
      client.agents.delete(agentUuid)
    }
  }

  async get (clientUuid: ClientUuid, uuid: ContainerUuid, request: ContainerRequest): Promise<ContainerEndpointRef> {
    let client = this._clients.get(clientUuid)
    if (client === undefined) {
      client = { lastSeen: this.tickManager.now(), containers: new Set(), agents: new Set() }
      this._clients.set(clientUuid, client)
    }
    client.containers.add(uuid)

    const record = await this.getContainer(uuid, request, [clientUuid])
    if (record.endpoint instanceof Promise) {
      return await record.endpoint
    }
    return record.endpoint
  }

  async getContainer (
    uuid: ContainerUuid,
    request: ContainerRequest,
    clients: ClientUuid[]
  ): Promise<ContainerRecordImpl> {
    const existing = this._containers.get(uuid)
    if (existing !== undefined) {
      const agent = this._agents.get(existing)
      const containerImpl = agent?.containers?.get(uuid)
      if (containerImpl !== undefined) {
        if (!(containerImpl.endpoint instanceof Promise)) {
          this._orphanedContainers.delete(containerImpl.endpoint)
        }
        for (const cl of clients) {
          containerImpl.clients.add(cl)
        }
        return containerImpl
      }
    }

    // Select agent using round/robin and register it in agent
    const suitableAgents = Array.from(this._agents.values().filter((it) => it.kinds.includes(request.kind)))
    if (suitableAgents.length === 0) {
      throw new Error(`No suitable agents found for container ${uuid}`)
    }
    const agent = Array.from(suitableAgents)[++this.idx % suitableAgents.length]

    const record: ContainerRecordImpl = {
      record: {
        uuid,
        agentId: agent.api.uuid,
        kind: request.kind,
        lastVisit: this.tickManager.now(),
        endpoint: '' as ContainerEndpointRef, // Placeholder, will be updated later
        labels: request.labels,
        extra: request.extra
      },
      clients: new Set(clients),
      endpoint: agent.api.get(uuid, request)
    }
    agent.containers.set(uuid, record)
    this._containers.set(uuid, agent.api.uuid)

    // Wait for endpoint to be established
    try {
      const endpointRef = await record.endpoint
      record.endpoint = endpointRef
      this.eventQueue.push({
        added: [record.record],
        deleted: [],
        updated: []
      })
      return record
    } catch (err: any) {
      this._containers.delete(uuid) // Remove from active container registry
      throw new Error(`Failed to get endpoint for container ${uuid}: ${err.message}`)
    }
  }

  async release (client: ClientUuid, uuid: ContainerUuid): Promise<void> {
    const _client = this._clients.get(client)
    _client?.containers.delete(uuid)

    const existing = this._containers.get(uuid)
    if (existing !== undefined) {
      const agent = this._agents.get(existing)
      const containerImpl = agent?.containers?.get(uuid)
      if (containerImpl !== undefined) {
        containerImpl.clients.delete(client)
        if (containerImpl.clients.size === 0 && !(containerImpl.endpoint instanceof Promise)) {
          this._orphanedContainers.set(containerImpl.endpoint, containerImpl)
        }
      }
    }
  }

  async terminate (container: ContainerRecordImpl): Promise<void> {
    this._containers.delete(container.record.uuid) // Remove from active container registry
    this.eventQueue.push({
      added: [],
      deleted: [container.record],
      updated: []
    })
    const agent = this._agents.get(container.record.agentId)
    agent?.containers.delete(container.record.uuid)

    let endpoint = container.endpoint
    if (endpoint instanceof Promise) {
      endpoint = await endpoint
    }
    await agent?.api.terminate(endpoint)
  }

  /**
   * Mark an agent as alive (updates lastSeen timestamp)
   */
  ping (id: AgentUuid | ClientUuid): void {
    const agent = this._agents.get(id as AgentUuid)
    if (agent != null) {
      agent.lastSeen = this.tickManager.now()
    }

    // Agent could be also a client.
    const client = this._clients.get(id as ClientUuid)
    if (client != null) {
      client.lastSeen = this.tickManager.now()
      for (const agent of client.agents) {
        const ag = this._agents.get(agent)
        if (ag != null) {
          ag.lastSeen = this.tickManager.now()
        }
      }
    }
  }

  /**
   * Perform periodic health check of all registered agents
   */
  private async checkAlive (): Promise<void> {
    const now = this.tickManager.now()
    const deadAgents: AgentUuid[] = []

    // Check each agent's last seen time
    for (const [agentId, agentRecord] of this._agents.entries()) {
      const timeSinceLastSeen = now - agentRecord.lastSeen

      if (timeSinceLastSeen > timeouts.aliveTimeout * 1000) {
        console.warn(`Agent ${agentId} has been inactive for ${Math.round(timeSinceLastSeen / 1000)}s, marking as dead`)
        deadAgents.push(agentId)
      }
    }

    // Remove dead agents and their containers
    for (const agentId of deadAgents) {
      await this.processDeadAgent(agentId)
    }

    // Handle termination of orphaned containers
    for (const container of [...this._orphanedContainers.values()]) {
      void this.terminate(container).catch((err) => {
        console.error(`Failed to terminate orphaned container ${container.record.uuid}: ${err.message}`)
      })
    }
  }

  /**
   * Remove a dead agent and clean up its containers
   */
  private async processDeadAgent (agentId: AgentUuid): Promise<void> {
    const agent = this._agents.get(agentId)
    if (agent == null) {
      return
    }

    console.log(`Removing dead agent ${agentId} and its ${agent.containers.size} containers`)

    // Collect containers to remove
    const affectedContainers: ContainerRecordImpl[] = []
    for (const [containerId, containerRecord] of agent.containers.entries()) {
      affectedContainers.push(containerRecord)
      this._containers.delete(containerId)
    }

    // Remove agent
    this._agents.delete(agentId)

    const containerEvent: ContainerEvent = {
      added: [],
      deleted: [],
      updated: []
    }

    // We need to add requests for all used containers
    for (const container of affectedContainers) {
      this._orphanedContainers.delete(container.record.endpoint)
      // We just send container is deleted, so clients should re-request whem again.
      containerEvent.deleted.push(container.record)
    }
    if (affectedContainers.length > 0) {
      this.eventQueue.push(containerEvent)
    }
  }
}
