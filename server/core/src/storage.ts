import { type WorkspaceId, toWorkspaceString } from '@hcengineering/core'

export * from '@hcengineering/storage'

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId, '.')
}
