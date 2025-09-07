import type { NetworkAgent } from './api/agent'
import type { Network } from './api/server'
import type {
  AgentEndpointRef,
  AgentUuid,
  ContainerEndpointRef,
  ContainerKind,
  ContainerRecord,
  ContainerRequest,
  ContainerUuid
} from './api/types'
import type { Container, ContainerFactory } from './containers'

interface ContainerRecordImpl {
  container: Container
  uuid: ContainerUuid
  endpoint: ContainerEndpointRef
  kind: ContainerKind

  lastVisit: number
}

export class AgentImpl implements NetworkAgent {
  // Own, managed containers
  private readonly _byId = new Map<ContainerUuid, ContainerRecordImpl | Promise<ContainerRecordImpl>>()

  private readonly _containers = new Map<ContainerEndpointRef, ContainerRecordImpl>()

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
    return Array.from(this._containers.values())
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

  async getContainerImpl (uuid: ContainerUuid): Promise<ContainerRecordImpl | undefined> {
    let current = this._byId.get(uuid)
    if (current instanceof Promise) {
      current = await current
      this._byId.set(uuid, current)
    }
    return current
  }

  async getContainer (uuid: ContainerUuid): Promise<Container | undefined> {
    return (await this.getContainerImpl(uuid))?.container
  }

  async get (uuid: ContainerUuid, request: ContainerRequest): Promise<ContainerEndpointRef> {
    const current = await this.getContainerImpl(uuid)
    if (current !== undefined) {
      return current.endpoint
    }

    let container: ContainerRecordImpl | Promise<ContainerRecordImpl> = this.factory[request.kind](uuid, request).then(
      (r) => ({
        container: r[0],
        endpoint: r[1],
        kind: request.kind,
        lastVisit: Date.now(),
        uuid
      })
    )
    this._byId.set(uuid, container)
    container = await container
    this._containers.set(container.endpoint, container)
    this._byId.set(uuid, container)

    return container.endpoint
  }

  async terminate (endpoint: ContainerEndpointRef): Promise<void> {
    const current = this._containers.get(endpoint)
    if (current !== undefined) {
      this._containers.delete(endpoint)
      await current.container.terminate()
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
