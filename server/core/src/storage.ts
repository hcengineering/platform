import { type Blob, type MeasureContext, type WorkspaceId, toWorkspaceString } from '@hcengineering/core'
import { type Readable } from 'stream'

export interface UploadedObjectInfo {
  etag: string
  versionId: string | null
}

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId, '.')
}

export type ListBlobResult = Omit<Blob, 'contentType' | 'version'>

export interface StorageAdapter {
  initialize: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>

  exists: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<boolean>
  make: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>
  delete: (ctx: MeasureContext, workspaceId: WorkspaceId) => Promise<void>

  remove: (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]) => Promise<void>
  list: (ctx: MeasureContext, workspaceId: WorkspaceId, prefix?: string) => Promise<ListBlobResult[]>
  stat: (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string) => Promise<Blob | undefined>
  get: (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string) => Promise<Readable>
  put: (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ) => Promise<UploadedObjectInfo>
  read: (ctx: MeasureContext, workspaceId: WorkspaceId, name: string) => Promise<Buffer[]>
  partial: (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number
  ) => Promise<Readable>
}
