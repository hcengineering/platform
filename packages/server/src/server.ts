import {
  type AgentEndpointRef,
  type AgentUuid,
  type ClientUuid,
  type Container,
  type ContainerEndpointRef,
  type ContainerKind,
  type ContainerRecord,
  type ContainerRequest,
  type ContainerUuid,
  type Network,
  type NetworkAgent,
  type NetworkWithClients,
  type TickManager
} from '@hcengineering/network-core'
import { BackRPCServer, type BackRPCResponseSend, type BackRPCServerHandler } from '@hcengineering/network-backrpc'
import { opNames } from '@hcengineering/network-client'

class AgentCallbackHandler implements NetworkAgent {
  constructor (
    readonly rpcServer: BackRPCServer<ClientUuid>,
    readonly uuid: AgentUuid,
    readonly endpoint: AgentEndpointRef,
    readonly kinds: ContainerKind[],
    readonly client: ClientUuid
  ) {}

  async get (uuid: ContainerUuid, request: ContainerRequest): Promise<ContainerEndpointRef> {
    return await this.rpcServer.request(this.client, opNames.getContainer, [this.uuid, [uuid, request]])
  }

  async list (kind?: ContainerKind): Promise<ContainerRecord[]> {
    return await this.rpcServer.request(this.client, opNames.listContainers, [this.uuid, [kind]])
  }

  async request (target: ContainerUuid, operation: string, data?: any): Promise<any> {
    return await this.rpcServer.request(this.client, opNames.sendContainer, [this.uuid, [target, operation, data]])
  }

  async terminate (containerUuid: ContainerUuid): Promise<void> {
    return await this.rpcServer.request(this.client, opNames.terminate, [this.uuid, [containerUuid]])
  }

  async getContainer (uuid: ContainerUuid): Promise<Container | undefined> {
    return undefined
  }
}

export class NetworkServer implements BackRPCServerHandler<ClientUuid> {
  rpcServer: BackRPCServer<ClientUuid>
  constructor (
    readonly network: Network & NetworkWithClients,
    readonly tickMgr: TickManager,
    host: string = '*',
    port: number = 3737
  ) {
    this.rpcServer = new BackRPCServer<ClientUuid>(this, tickMgr, host, port)

    this.tickMgr.register(async () => {
      console.log(
        'check alive:',
        this.clients.size,
        (await this.network.agents()).length,
        (await this.network.list()).length
      )
    }, 5)
  }

  async close (): Promise<void> {
    await this.rpcServer.close()
  }

  clients = new Set<ClientUuid>()

  async requestHandler (client: ClientUuid, method: string, params: any, send: BackRPCResponseSend): Promise<void> {
    switch (method) {
      case opNames.register: {
        // Handle register
        await this.handleRegister(params, this.rpcServer, client, send)
        break
      }
      case opNames.unregister: {
        await this.handleUnregister(params, client, send)
        break
      }
      case opNames.getAgents: {
        await send(await this.network.agents())
        break
      }
      case opNames.getKinds: {
        await send(await this.network.kinds())
        break
      }
      case opNames.getContainer: {
        const uuid: ContainerUuid = params.uuid
        const request: ContainerRequest = params.request
        await send(await this.network.get(client, uuid, request))
        break
      }
      case opNames.releaseContainer: {
        const uuid: ContainerUuid = params.uuid
        await this.network.release(client, uuid)
        await send('ok')
        break
      }
      case opNames.listContainers: {
        const kind: ContainerKind = params.kind
        await send(await this.network.list(kind))
        break
      }
      case opNames.sendContainer: {
        const target: ContainerUuid = params[0]
        const operation: string = params[1]
        const data: any = params[2]
        await send(await this.network.request(target, operation, data))
        break
      }

      default:
        throw new Error('Unknown method' + method)
    }
  }

  lastClients = 0
  async helloHandler (clientId: ClientUuid): Promise<void> {
    if (!this.clients.has(clientId)) {
      console.log(`Clients connected: ${this.clients.size}`)
    }
    this.clients.add(clientId)
    this.network.addClient(clientId, async (event) => {
      await this.rpcServer.send(clientId, event)
    })
  }

  onPing (client: ClientUuid): void {
    this.network.ping(client)
  }

  async closeHandler (client: ClientUuid, timeout: boolean = false): Promise<void> {
    this.clients.delete(client)
    this.network.removeClient(client)
    if (timeout) {
      console.log(`Client ${client} timed out ${this.clients.size}`)
    }
  }

  private async handleRegister (
    params: any,
    server: BackRPCServer<ClientUuid>,
    client: ClientUuid,
    send: (response: any) => Promise<void>
  ): Promise<void> {
    const agentUuid: AgentUuid = params.uuid
    const containers: ContainerRecord[] = params.containers
    const kinds: ContainerKind[] = params.kinds
    const endpoint: AgentEndpointRef = params.endpoint
    const res = await this.network.register(
      {
        agentId: agentUuid,
        containers,
        kinds,
        endpoint
      },
      new AgentCallbackHandler(server, agentUuid, endpoint, kinds, client)
    )
    this.network.mapAgent(client, agentUuid)
    await send(res)
  }

  private async handleUnregister (
    params: any,
    client: ClientUuid,
    send: (response: any) => Promise<void>
  ): Promise<void> {
    const agentUuid: AgentUuid = params.uuid
    await this.network.unregister(agentUuid)
    this.network.unmapAgent(client, agentUuid)
    await send('ok')
  }
}
