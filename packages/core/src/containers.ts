import type { ClientUuid, ContainerEndpointRef, ContainerUuid, GetOptions } from './api/types'
import { v4 as uuidv4 } from 'uuid'

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
  request: GetOptions
) => Promise<{ uuid: ContainerUuid, container: Container, endpoint: ContainerEndpointRef }>

export function containerUuid (): ContainerUuid {
  return uuidv4() as ContainerUuid
}
