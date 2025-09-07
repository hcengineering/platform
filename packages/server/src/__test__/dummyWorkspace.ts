import { BackRPCServer } from '@hcengineering/network-backrpc'
import {
  type Container,
  type ClientUuid,
  type ContainerUuid,
  type AgentUuid,
  type NetworkClient,
  type TickManager,
  type ContainerEndpointRef,
  containerDirectRef
} from '@hcengineering/network-core'

export class DummyWorkspaceContainer implements Container {
  server!: BackRPCServer<ClientUuid>

  constructor (
    readonly uuid: ContainerUuid,
    readonly agentId: AgentUuid,
    readonly networkClient: NetworkClient
  ) {}

  async start (tickMgr: TickManager): Promise<ContainerEndpointRef> {
    this.server = new BackRPCServer<ClientUuid>(
      {
        requestHandler: async (client, method, params, send) => {
          // Handle incoming requests
          if (method === 'test') {
            await send('test-ok')
          }
          throw new Error('Unknown method')
        }
      },
      tickMgr,
      'localhost',
      0
    )
    const port = await this.server.getPort()
    return containerDirectRef('localhost', port, this.uuid, this.agentId)
  }

  async request (operation: string, data?: any): Promise<any> {
    return ''
  }

  // Called when the container is terminated
  onTerminated?: () => void

  async terminate (): Promise<void> {
    await this.server.close()
  }

  async ping (): Promise<void> {}

  connect (clientId: ClientUuid, handler: (data: any) => Promise<void>): void {
    this.eventHandlers.set(clientId, handler)
  }

  disconnect (clientId: ClientUuid): void {
    this.eventHandlers.delete(clientId)
  }

  private readonly eventHandlers = new Map<ClientUuid, (data: any) => Promise<void>>()
}
