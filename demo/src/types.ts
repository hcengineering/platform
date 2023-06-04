import { Client, WorkspaceId } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'

export interface InitOperation {
  initWS: (workspaceId: WorkspaceId, client: Client, fileStorage: MinioService) => Promise<void>
}
