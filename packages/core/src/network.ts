import type { AgentRecord, AgentRecordInfo, NetworkAgent } from './api/agent'
import type { Network, NetworkWithClients } from './api/network'
import { timeouts } from './api/timeouts'
import type {
  AgentEndpointRef,
  AgentUuid,
  ClientUuid,
  ContainerEndpointRef,
  ContainerKind,
  ContainerRecord,
  ContainerUuid,
  GetOptions,
  NetworkEvent
} from './api/types'
import { NetworkEventKind } from './api/types'
import type { TickManager } from './api/utils'

export interface ContainerRecordImpl {
  record: ContainerRecord
  endpoint: ContainerEndpointRef
  agent: AgentRecordImpl

  clients: Set<ClientUuid>
}

interface AgentRecordImpl {
  id: AgentUuid
  api: NetworkAgent
  containers: Set<ContainerUuid>
  endpoint?: AgentEndpointRef
  kinds: ContainerKind[]

  lastSeen: number // Last time when agent was seen
}

interface ClientRecordImpl {
  lastSeen: number
  containers: Set<ContainerUuid>
  onContainer?: (event: NetworkEvent) => Promise<void>

  agents: Set<AgentUuid>
}

interface PendingContainer {
  agent: AgentUuid
  kind: ContainerKind
  options: GetOptions
  promise: Promise<ContainerRecordImpl>
  clients: Set<ClientUuid>
}
/**
 * Server network implementation.
 */
export class NetworkImpl implements Network, NetworkWithClients {
  private idx: number = 0

  private readonly _agents = new Map<AgentUuid, AgentRecordImpl>()

  private readonly _containers = new Map<ContainerUuid, ContainerRecordImpl>()

  private pidCounter: number = 0

  private readonly pending = new Map<number, PendingContainer>()

  private readonly _clients = new Map<ClientUuid, ClientRecordImpl>()

  private readonly _orphanedContainers = new Map<ContainerUuid, { container: ContainerRecordImpl, time: number }>()

  private eventQueue: NetworkEvent[] = []

  private readonly stopTick?: () => void

  constructor (private readonly tickManager: TickManager) {
    // Register for periodic agent health checks
    this.stopTick = tickManager.register(async () => {
      await this.checkAlive()
      // Check for events on every tick
      await this.sendEvents()
    }, timeouts.aliveTimeout)
  }

  close (): void {
    this.stopTick?.()
  }

  async agents (): Promise<AgentRecordInfo[]> {
    return Array.from(this._agents.values()).map(({ api, containers }) => ({
      agentId: api.uuid,
      endpoint: api.endpoint,
      kinds: api.kinds,
      containers: containers.size
    }))
  }

  async kinds (): Promise<ContainerKind[]> {
    return Array.from(this._agents.values())
      .map((it) => it.kinds)
      .flatMap((it) => it)
  }

  async list (kind?: ContainerKind): Promise<ContainerRecord[]> {
    return Array.from(this._containers.values())
      .filter((it) => kind === undefined || it.record.kind === kind)
      .map((it) => it.record)
  }

  async request (target: ContainerUuid, operation: string, data?: any): Promise<any> {
    const container = this._containers.get(target)
    if (container === undefined) {
      throw new Error(`Container ${target} not found`)
    }
    return await container.agent?.api.request(target, operation, data)
  }

  async register (record: AgentRecord, agent: NetworkAgent): Promise<ContainerUuid[]> {
    const newContainers: ContainerRecord[] = record.containers
    const newContainersMap = new Map<ContainerUuid, ContainerRecordImpl>(
      newContainers.map((record) => [
        record.uuid,
        {
          record,
          request: { kind: record.kind },
          endpoint: record.endpoint,
          clients: new Set<ClientUuid>([]),
          agent: null as any // Temporarily
        }
      ])
    )

    const containerEvent: NetworkEvent = {
      agents: [],
      containers: []
    }

    // update agent record
    const agentRecord: AgentRecordImpl = {
      id: record.agentId,
      api: agent,
      containers: new Set(),
      endpoint: record.endpoint,
      kinds: record.kinds,
      lastSeen: this.tickManager.now()
    }

    const oldAgent = this._agents.get(record.agentId)
    this._agents.set(record.agentId, agentRecord)

    const containersToShutdown: ContainerUuid[] = []

    // Find removed containers
    for (const cid of oldAgent?.containers ?? []) {
      if (!newContainersMap.has(cid)) {
        const container = this._containers.get(cid)
        if (container !== undefined) {
          containerEvent.containers.push({
            container: container.record,
            event: NetworkEventKind.removed
          })
          this._containers.delete(cid)
        }
      }
    }

    // Update active container registry.
    for (const containerImpl of newContainersMap.values()) {
      containerImpl.agent = agentRecord

      const existingContainer = this._containers.get(containerImpl.record.uuid)
      if (existingContainer === undefined) {
        containerEvent.containers.push({
          container: containerImpl.record,
          event: NetworkEventKind.added
        })
        this._containers.set(containerImpl.record.uuid, containerImpl)
        agentRecord.containers.add(containerImpl.record.uuid)
      } else {
        if (existingContainer.agent.id !== record.agentId) {
          // Container already started on different agent, need to shutdown old one.
          containersToShutdown.push(containerImpl.record.uuid)
        }

        if (existingContainer.record.endpoint !== containerImpl.record.endpoint) {
          containerEvent.containers.push({
            container: containerImpl.record,
            event: NetworkEventKind.updated
          })
        }
      }
    }

    containerEvent.agents.push({
      id: agent.uuid,
      kinds: record.kinds,
      event: oldAgent !== undefined ? NetworkEventKind.updated : NetworkEventKind.added
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
    await this.processAgentRemove(agentId)
  }

  async sendEvents (): Promise<void> {
    const events = [...this.eventQueue]
    this.eventQueue = []
    if (events.length === 0) {
      return
    }
    // Combine events

    const agents = new Map<AgentUuid, NetworkEvent['agents'][0]>()
    const containers = new Map<ContainerUuid, NetworkEvent['containers'][0]>()

    for (const event of events) {
      for (const agent of event.agents) {
        const curAgent = agents.get(agent.id)
        if (curAgent?.event === NetworkEventKind.removed) {
          // If we have already agent remove, skip further updates for it.
          continue
        }
        if (curAgent?.event === NetworkEventKind.added && agent.event === NetworkEventKind.updated) {
          // Skip update, if we have create event.
          continue
        }
        agents.set(agent.id, agent)
      }
      for (const container of event.containers) {
        const curContainer = containers.get(container.container.uuid)

        if (curContainer?.event === NetworkEventKind.removed) {
          // If we have already container remove, skip further updates for it.
          continue
        }
        if (curContainer?.event === NetworkEventKind.added && container.event === NetworkEventKind.updated) {
          // Skip update, if we have create event.
          continue
        }

        containers.set(container.container.uuid, container)
      }
    }

    const finalEvent: NetworkEvent = {
      agents: Array.from(agents.values()),
      containers: Array.from(containers.values())
    }

    for (const [clientUuid, client] of this._clients.entries()) {
      if (client.onContainer !== undefined) {
        try {
          // We should not block on broadcast to clients.
          void client.onContainer?.(finalEvent)?.catch((err) => {
            console.error(`Error in client ${clientUuid} onContainer callback:`, err)
          })
        } catch (err: any) {
          console.error(`Error in client ${clientUuid} onContainer callback:`, err)
        }
      }
    }
  }

  addClient (clientUuid: ClientUuid, onContainer?: (event: NetworkEvent) => Promise<void>): void {
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

  async get (
    clientUuid: ClientUuid,
    kind: ContainerKind,
    options: GetOptions
  ): Promise<[ContainerUuid, ContainerEndpointRef]> {
    let client = this._clients.get(clientUuid)
    if (client === undefined) {
      client = { lastSeen: this.tickManager.now(), containers: new Set(), agents: new Set() }
      this._clients.set(clientUuid, client)
    }

    const record: ContainerRecordImpl = await this.getContainer(kind, options, [clientUuid])
    client.containers.add(record.record.uuid)
    return [record.record.uuid, record.endpoint]
  }

  async getContainer (kind: ContainerKind, options: GetOptions, clients: ClientUuid[]): Promise<ContainerRecordImpl> {
    // Reuse existing container if uuid is provided and container exists
    if (options.uuid !== undefined) {
      const existing = this._containers.get(options.uuid)
      if (existing !== undefined) {
        this._orphanedContainers.delete(existing.record.uuid)
        for (const cl of clients) {
          existing.clients.add(cl)
        }
        return existing
      }
      // Find if container is pending starting for our it
      for (const p of this.pending.values()) {
        if (p.kind === kind && p.options.uuid === options.uuid) {
          // Add to pendings list to properly track orphaned
          for (const cl of clients) {
            p.clients.add(cl)
          }
          const containerImpl = await p.promise
          for (const cl of clients) {
            containerImpl.clients.add(cl)
          }
          return containerImpl
        }
      }
    } else {
      // Check if we have a container pending if no uuid is provided
      for (const p of this.pending.values()) {
        if (
          p.kind === kind &&
          (options.labels === undefined ||
            (p.options.labels !== undefined && options.labels.every((l) => (p.options.labels ?? []).includes(l))))
        ) {
          // Add to pendings list to properly track orphaned
          for (const cl of clients) {
            p.clients.add(cl)
          }
          const containerImpl = await p.promise
          for (const cl of clients) {
            containerImpl.clients.add(cl)
          }
          return containerImpl
        }
      }
    }

    // Select agent using round/robin and register it in agent
    const suitableAgents = Array.from(this._agents.values().filter((it) => it.kinds.includes(kind)))
    if (suitableAgents.length === 0) {
      throw new Error(`No suitable agents found for container ${kind}`)
    }
    const agent = Array.from(suitableAgents)[++this.idx % suitableAgents.length]

    const record: Promise<ContainerRecordImpl> = agent.api.get(kind, options).then(([uuid, endpoint]) => ({
      agent,
      record: {
        uuid,
        agentId: agent.api.uuid,
        kind,
        lastVisit: this.tickManager.now(),
        endpoint: '' as ContainerEndpointRef, // Placeholder, will be updated later
        labels: options.labels,
        extra: options.extra
      },
      clients: new Set(clients),
      endpoint
    }))

    const pid = ++this.pidCounter
    this.pending.set(pid, { agent: agent.id, kind, options, promise: record, clients: new Set(clients) })

    // Wait for endpoint to be established
    try {
      const recordImpl = await record

      agent.containers.add(recordImpl.record.uuid)

      this.eventQueue.push({
        agents: [],
        containers: [{ container: recordImpl.record, event: NetworkEventKind.added }]
      })

      // TODO:  What if container started with same id?
      this._containers.set(recordImpl.record.uuid, recordImpl)
      return recordImpl
    } catch (err: any) {
      throw new Error(`Failed to get endpoint for container ${kind}: ${err.message}`)
    } finally {
      this.pending.delete(pid)
    }
  }

  async release (client: ClientUuid, uuid: ContainerUuid): Promise<void> {
    const _client = this._clients.get(client)
    _client?.containers.delete(uuid)

    const existing = this._containers.get(uuid)
    if (existing !== undefined) {
      existing.clients.delete(client)
      if (existing.clients.size === 0) {
        this._orphanedContainers.set(existing.record.uuid, {
          container: existing,
          time: this.tickManager.now()
        })
      }
    }
  }

  async terminate (container: ContainerRecordImpl): Promise<void> {
    this._containers.delete(container.record.uuid) // Remove from active container registry
    this._orphanedContainers.delete(container.record.uuid)
    this.eventQueue.push({
      agents: [],
      containers: [{ container: container.record, event: NetworkEventKind.removed }]
    })
    container.agent.containers.delete(container.record.uuid)

    await container.agent.api.terminate(container.record.uuid)
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
      await this.processAgentRemove(agentId)
    }

    // Handle termination of orphaned containers
    for (const { container, time } of [...this._orphanedContainers.values()]) {
      if (now - time > timeouts.unusedContainerTimeout * 1000) {
        void this.terminate(container).catch((err) => {
          console.error(`Failed to terminate orphaned container ${container.record.uuid}: ${err.message}`)
        })
      }
    }
  }

  /**
   * Remove a dead agent and clean up its containers
   */
  private async processAgentRemove (agentId: AgentUuid): Promise<void> {
    const agent = this._agents.get(agentId)
    if (agent == null) {
      return
    }

    console.log(`Removing agent ${agentId} and its ${agent.containers.size} containers`)

    // Collect containers to remove
    const affectedContainers: ContainerRecordImpl[] = []
    for (const containerId of agent.containers.values()) {
      const c = this._containers.get(containerId)
      if (c !== undefined) {
        affectedContainers.push(c)
      }
      this._containers.delete(containerId)
    }

    // We need to clean pending ones
    for (const [pid, p] of this.pending.entries()) {
      if (p.agent === agentId) {
        this.pending.delete(pid)
      }
    }

    // Remove agent
    this._agents.delete(agentId)

    const containerEvent: NetworkEvent = {
      agents: [{ id: agentId, kinds: agent.kinds, event: NetworkEventKind.removed }],
      containers: []
    }

    // We need to add requests for all used containers
    for (const container of affectedContainers) {
      this._orphanedContainers.delete(container.record.uuid)
      // We just send container is deleted, so clients should re-request whem again.
      containerEvent.containers.push({ container: container.record, event: NetworkEventKind.removed })
    }
    if (affectedContainers.length > 0) {
      this.eventQueue.push(containerEvent)
    }
  }
}
