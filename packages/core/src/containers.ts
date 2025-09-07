import type { ClientUuid, ContainerEndpointRef, ContainerRecord, ContainerRequest, ContainerUuid } from './api/types'

export interface Container {
  request: (operation: string, data?: any, clientId?: ClientUuid) => Promise<any>

  // Called when the container is terminated
  onTerminated?: () => void

  terminate: () => Promise<void>

  ping: () => Promise<void>

  connect: (clientId: ClientUuid, broadcast: (data: any) => Promise<void>) => void
  disconnect: (clientId: ClientUuid) => void
}

export type ContainerFactory = (
  uuid: ContainerUuid,
  request: ContainerRequest
) => Promise<[Container, ContainerEndpointRef]>

export interface ContainerRecordImpl {
  record: ContainerRecord
  endpoint: ContainerEndpointRef | Promise<ContainerEndpointRef>

  clients: Set<ClientUuid>
}
