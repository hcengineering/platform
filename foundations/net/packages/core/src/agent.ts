import type { NetworkAgent } from './api/agent'
import type { Network } from './api/network'
import type {
  AgentEndpointRef,
  AgentUuid,
  ContainerEndpointRef,
  ContainerKind,
  ContainerRecord,
  GetOptions,
  ContainerUuid
} from './api/types'
import type { Container, ContainerFactory } from './containers'

interface ContainerRecordImpl {
  container: Container
  uuid: ContainerUuid
  endpoint: ContainerEndpointRef
  kind: ContainerKind

  labels?: string[]

  lastVisit: number
}

interface AgentPendingContainer {
  kind: ContainerKind
  options: GetOptions
  promise: Promise<ContainerRecordImpl>
}

export class AgentImpl implements NetworkAgent {
  // Own, managed containers
  private readonly _byId = new Map<ContainerUuid, ContainerRecordImpl>()
  private readonly _byKind = new Map<ContainerKind, Map<ContainerUuid, ContainerRecordImpl>>()

  // Containers pending startup
  pidCounter: number = 0
  private readonly pendings = new Map<number, AgentPendingContainer>()

  endpoint?: AgentEndpointRef | undefined

  // Stateless containers that need to be registered
  private readonly statelessContainers = new Map<ContainerUuid, ContainerRecordImpl>()

  constructor (
    readonly uuid: AgentUuid,
    private readonly factory: Record<ContainerKind, ContainerFactory>
  ) {}

  /**
   * Add a stateless container to the agent.
   * Stateless containers are pre-existing containers that the agent wants to register with the network.
   * Used for HA scenarios where multiple agents may try to register the same container UUID.
   */
  addStatelessContainer (
    uuid: ContainerUuid,
    kind: ContainerKind,
    endpoint: ContainerEndpointRef,
    container: Container
  ): void {
    const record: ContainerRecordImpl = {
      container,
      uuid,
      endpoint,
      kind,
      lastVisit: Date.now()
    }
    this.statelessContainers.set(uuid, record)
  }

  /**
   * Remove a stateless container from tracking.
   * This is called when the network rejects our registration (another agent won).
   */
  removeStatelessContainer (uuid: ContainerUuid): void {
    this.statelessContainers.delete(uuid)
  }

  /**
   * Activate a stateless container after successful registration.
   * Moves it from stateless tracking to active containers.
   */
  private activateStatelessContainer (uuid: ContainerUuid): void {
    const record = this.statelessContainers.get(uuid)
    if (record !== undefined) {
      this._byId.set(uuid, record)
      const byKind = this._byKind.get(record.kind)
      if (byKind !== undefined) {
        byKind.set(uuid, record)
      } else {
        this._byKind.set(record.kind, new Map([[uuid, record]]))
      }
      this.statelessContainers.delete(uuid)
    }
  }

  async register (network: Network): Promise<void> {
    const cleanContainers = await network.register(
      {
        agentId: this.uuid,
        containers: await this.list(),
        kinds: this.kinds,
        endpoint: this.endpoint
      },
      this
    )

    // Activate stateless containers that were accepted
    for (const record of this.statelessContainers.values()) {
      if (!cleanContainers.includes(record.uuid)) {
        this.activateStatelessContainer(record.uuid)
      }
    }

    // Terminate containers that network wants cleaned up
    for (const c of cleanContainers) {
      await this.terminate(c)
    }
  }

  async list (kind?: ContainerKind): Promise<ContainerRecord[]> {
    // Include both active and stateless containers
    const active = Array.from(kind !== undefined ? (this._byKind.get(kind)?.values() ?? []) : this._byId.values())
      .filter((it) => !(it instanceof Promise) && (kind === undefined || it.kind === kind))
      .map((it) => ({
        agentId: this.uuid,
        uuid: it.uuid,
        endpoint: it.endpoint,
        kind: it.kind,
        lastVisit: it.lastVisit
      }))

    const stateless = Array.from(this.statelessContainers.values())
      .filter((it) => kind === undefined || it.kind === kind)
      .map((it) => ({
        agentId: this.uuid,
        uuid: it.uuid,
        endpoint: it.endpoint,
        kind: it.kind,
        lastVisit: it.lastVisit
      }))

    return [...active, ...stateless]
  }

  get kinds (): ContainerKind[] {
    return Object.keys(this.factory) as ContainerKind[]
  }

  selectContainer (kind: ContainerKind, labels?: string[]): ContainerRecordImpl | undefined {
    const list = this._byKind.get(kind)
    if (list !== undefined) {
      let l = list.values()
      if (labels !== undefined) {
        l = l.filter((it) => it.labels !== undefined && labels.every((l) => (it.labels ?? []).includes(l)))
      }
      return l.next()?.value
    }
  }

  async getContainer (uuid: ContainerUuid): Promise<Container | undefined> {
    const active = this._byId.get(uuid)
    if (active !== undefined) {
      return active.container
    }
    // Check stateless containers too
    return this.statelessContainers.get(uuid)?.container
  }

  async get (kind: ContainerKind, options: GetOptions): Promise<[ContainerUuid, ContainerEndpointRef]> {
    // If uuid is fixed, we must return that one

    if (options.uuid !== undefined) {
      const current = this._byId.get(options.uuid)
      if (current !== undefined) {
        return [current.uuid, current.endpoint]
      }
      // Check pending requests
      for (const p of this.pendings.values()) {
        if (p.kind === kind && p.options.uuid === options.uuid) {
          const containerImpl = await p.promise
          return [containerImpl.uuid, containerImpl.endpoint]
        }
      }
    } else {
      // If we have one with kind, return it.
      const existing = this.selectContainer(kind, options.labels)
      if (existing !== undefined) {
        return [existing.uuid, existing.endpoint]
      }
    }

    // Check pending container by kind
    for (const p of this.pendings.values()) {
      if (
        p.kind === kind &&
        (options.labels === undefined ||
          (p.options.labels !== undefined && options.labels.every((l) => (p.options.labels ?? []).includes(l))))
      ) {
        const containerImpl = await p.promise
        return [containerImpl.uuid, containerImpl.endpoint]
      }
    }

    const pendingId = this.pidCounter++

    const container = this.factory[kind](options, this.endpoint).then(({ uuid, container, endpoint }) => ({
      container,
      endpoint,
      kind,
      lastVisit: Date.now(),
      uuid
    }))

    this.pendings.set(pendingId, { kind, promise: container, options })
    const containerImpl = await container
    this.pendings.delete(pendingId)

    this._byId.set(containerImpl.uuid, containerImpl)
    const byKind = this._byKind.get(kind)
    if (byKind !== undefined) {
      byKind.set(containerImpl.uuid, containerImpl)
    } else {
      this._byKind.set(kind, new Map([[containerImpl.uuid, containerImpl]]))
    }

    return [containerImpl.uuid, containerImpl.endpoint]
  }

  async terminate (uuid: ContainerUuid): Promise<void> {
    const current = this._byId.get(uuid)
    if (current !== undefined) {
      this._byId.delete(uuid)
      this._byKind.get(current.kind)?.delete(uuid)
      if (current instanceof Promise) {
        await (await current).container.terminate() // Await promise before terminating
      } else {
        await current.container.terminate()
      }
      return
    }

    // Also check stateless containers
    const stateless = this.statelessContainers.get(uuid)
    if (stateless !== undefined) {
      this.statelessContainers.delete(uuid)
      await stateless.container.terminate()
    }
  }

  async request (target: ContainerUuid, operation: string, data?: any): Promise<any> {
    const container = await this.getContainer(target)
    if (container === undefined) {
      throw new Error(`Container ${target} not found`)
    }
    return await container.request(operation, data)
  }
}
