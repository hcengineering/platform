import { Client, WorkspaceId } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { trackerInit } from './tracker'
import { InitOperation } from './types'

const plugins: InitOperation[] = [trackerInit]

/**
 * @public
 */
export async function initWorkspace (
  workspaceId: WorkspaceId,
  client: Client,
  fileStorage: MinioService
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.initWS(workspaceId, client, fileStorage)
  }
}
