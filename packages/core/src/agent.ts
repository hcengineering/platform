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

  constructor (
    readonly uuid: AgentUuid,
    private readonly factory: Record<ContainerKind, ContainerFactory>
  ) {}

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
    for (const c of cleanContainers) {
      await this.terminate(c)
    }
  }

  async list (kind?: ContainerKind): Promise<ContainerRecord[]> {
    return Array.from(kind !== undefined ? (this._byKind.get(kind)?.values() ?? []) : this._byId.values())
      .filter((it) => !(it instanceof Promise) && (kind === undefined || it.kind === kind))
      .map((it) => ({
        agentId: this.uuid,
        uuid: it.uuid,
        endpoint: it.endpoint,
        kind: it.kind,
        lastVisit: it.lastVisit
      }))
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
    return this._byId.get(uuid)?.container
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

    const container = this.factory[kind](options).then(({ uuid, container, endpoint }) => ({
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
