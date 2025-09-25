import {
  BackRPCClient,
  BackRPCServer,
  type BackRPCResponseSend,
  type BackRPCServerHandler,
  type ClientId
} from '@hcengineering/network-backrpc'
import {
  agentDirectRef,
  type ClientUuid,
  type ContainerConnection,
  type ContainerUuid,
  type NetworkAgent,
  type NetworkEvent,
  type TickManager
} from '@hcengineering/network-core'
import { opNames } from './types'

/**
 * A server for an agent with connection abilities.
 *
 * start method should be called before agent will be registered on network.
 */
export class NetworkAgentServer implements BackRPCServerHandler<ClientUuid> {
  readonly rpcServer: BackRPCServer<ClientUuid>
  agent: NetworkAgent | undefined

  constructor (
    tickMgr: TickManager,
    readonly endpointHost: string, // An endpoint construction host, will be used to register
    host: string = '*', // A socket visibility
    port: number = 3738 // If 0, port will be free random one.
  ) {
    this.rpcServer = new BackRPCServer<ClientUuid>(this, tickMgr, host, port)
  }

  async start (agent: NetworkAgent): Promise<void> {
    this.agent = agent
    this.agent.endpoint = agentDirectRef(this.endpointHost, await this.rpcServer.getPort(), agent.uuid)

    // Now registration is possible, or update will be sent
    await this.agent.onAgentUpdate?.()
  }

  async onContainerUpdate (event: NetworkEvent): Promise<void> {
    // Handle container update
  }

  async getPort (): Promise<number> {
    return await this.rpcServer.getPort()
  }

  async close (): Promise<void> {
    await this.rpcServer.close()
  }

  async requestHandler (client: ClientUuid, method: string, params: any, send: BackRPCResponseSend): Promise<void> {
    if (this.agent === undefined) {
      return
    }
    switch (method) {
      case opNames.connect: {
        const uuids: ContainerUuid[] = Array.isArray(params.uuid) ? params.uuid : [params.uuid]
        const connected: number = 0
        for (const uuid of uuids) {
          const container = await this.agent.getContainer(uuid)
          if (container === undefined) {
            console.error(`Container ${uuid} not found`)
            continue
          }
          // Events will be routed via connectionId
          container.connect(client, async (data) => {
            await this.rpcServer.send(client, [uuid, data])
          })
        }
        await send(connected)
        break
      }
      case opNames.disconnect: {
        const uuid = params.uuid as ContainerUuid
        const container = await this.agent.getContainer(uuid)
        if (container === undefined) {
          throw new Error('Container not found')
        }
        container.disconnect(client)
        await send('ok')
        break
      }
      case opNames.sendContainer: {
        const target: ContainerUuid = params[0]
        const operation: string = params[1]
        const data: any = params[2]

        const container = await this.agent.getContainer(target)
        if (container === undefined) {
          throw new Error('Container not found')
        }
        await send(await container.request(operation, data, client))
        break
      }

      default:
        throw new Error('Unknown method' + method)
    }
  }

  async helloHandler (clientId: ClientUuid): Promise<void> {
    console.log(`Client ${clientId} connected`)
  }

  async closeHandler (client: ClientUuid): Promise<void> {
    console.log(`Client ${client} timed out`)
  }
}

/**
 * An routed connection to a container via agent.
 */
export class RoutedNetworkAgentConnectionImpl<ClientT extends string = ClientId> {
  private readonly client: BackRPCClient<ClientT>

  containers = new Map<ContainerUuid, ContainerConnection>()

  constructor (
    tickMgr: TickManager,
    readonly clientId: ClientT,
    readonly host: string,
    readonly port: number
  ) {
    this.client = new BackRPCClient(this.clientId, this, host, port, tickMgr)
  }

  async connect (containerUuid: ContainerUuid): Promise<ContainerConnection> {
    // Establish a connection to the specified container
    await this.client.request(opNames.connect, { uuid: containerUuid })

    const connection: ContainerConnection = {
      containerId: containerUuid,
      close: async () => {
        try {
          await this.client.request(opNames.disconnect, { uuid: containerUuid })
        } catch (err: any) {
          // Ignore if disconnected already
        }
      },
      request: async (operation, data) =>
        await this.client.request(opNames.sendContainer, [containerUuid, operation, data])
    }
    this.containers.set(containerUuid, connection)
    return connection
  }

  async requestHandler (method: string, params: any, send: BackRPCResponseSend): Promise<void> {
    // No callback is required
  }

  async onEvent (event: any): Promise<void> {
    const [container, data] = event
    const connection = this.containers.get(container)
    if (connection !== undefined) {
      await connection.on?.(data)
    }
  }

  async close (): Promise<void> {
    this.client.close()
  }

  async onRegister (): Promise<void> {
    // Handle registration logic here
  }
}

/**
 * A direct connection to container
 */
export class NetworkDirectConnectionImpl implements ContainerConnection {
  private readonly client: BackRPCClient<ClientUuid>

  on?: ((data: any) => Promise<void>) | undefined

  containers: ContainerUuid[] = []

  constructor (
    tickMgr: TickManager,
    readonly clientId: ClientUuid,
    readonly containerId: ContainerUuid,
    readonly host: string,
    readonly port: number
  ) {
    this.client = new BackRPCClient(this.clientId, this, host, port, tickMgr)
  }

  async request (operation: string, data?: any): Promise<any> {
    return await this.client.request(operation, data)
  }

  async requestHandler (method: string, params: any, send: BackRPCResponseSend): Promise<void> {
    // No callback is required
  }

  async onEvent (event: any): Promise<void> {
    await this.on?.(event)
  }

  async close (): Promise<void> {
    this.client.close()
  }

  async onRegister (): Promise<void> {
    // No registration is required
  }
}

/**
 * A direct connection to container
 */
export class ContainerConnectionImpl implements ContainerConnection {
  private connection!: ContainerConnection | Promise<ContainerConnection>

  onEndpointUpdate?: () => void

  on?: ((data: any) => Promise<void>) | undefined

  constructor (
    readonly containerId: ContainerUuid,
    connection: Promise<ContainerConnection> | ContainerConnection
  ) {
    this.setConnection(connection)
  }

  async connect (): Promise<void> {
    if (this.connection instanceof Promise) {
      await this.connection
    }
  }

  setConnection (connection: Promise<ContainerConnection> | ContainerConnection): void {
    if (this.connection !== undefined) {
      if (this.connection instanceof Promise) {
        void this.connection.then((res) =>
          res.close().catch((err) => {
            console.error('Error closing connection', err)
          })
        )
      } else {
        void this.connection.close().catch((err) => {
          console.error('Error closing connection', err)
        })
      }
    }
    this.connection = connection
    if (connection instanceof Promise) {
      void connection.then((res) => {
        this.connection = res
        res.on = async (event) => {
          void this.on?.(event)
        }
      })
    } else {
      connection.on = async (event) => {
        void this.on?.(event)
      }
    }
    this.onEndpointUpdate?.()
  }

  async request (operation: string, data?: any): Promise<any> {
    if (this.connection instanceof Promise) {
      this.connection = await this.connection
    }
    return await this.connection.request(operation, data)
  }

  async close (): Promise<void> {
    if (this.connection instanceof Promise) {
      this.connection = await this.connection
    }
    await this.connection.close()
  }
}
