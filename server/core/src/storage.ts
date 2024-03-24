import { type WorkspaceId, toWorkspaceString } from '@hcengineering/core'
import { type Readable } from 'stream'

export interface MetadataItem {
  Key: string
  Value: string
}
export type BucketItem =
  | {
    name: string
    size: number
    etag: string
    prefix?: never
    lastModified: Date
  }
  | {
    name?: never
    etag?: never
    lastModified?: never
    prefix: string
    size: 0
  }

export interface BucketItemStat {
  size: number
  etag: string
  lastModified: Date
  metaData: ItemBucketMetadata
  versionId?: string | null
}

export interface UploadedObjectInfo {
  etag: string
  versionId: string | null
}

export interface ItemBucketMetadataList {
  Items: MetadataItem[]
}
export type ItemBucketMetadata = Record<string, any>
export type BucketItemWithMetadata = BucketItem & {
  metadata?: ItemBucketMetadata | ItemBucketMetadataList
}
/**
 * @public
 */
export type WorkspaceItem = Required<BucketItem> & { metaData: ItemBucketMetadata }

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId, '.')
}

export interface StorageAdapter {
  exists: (workspaceId: WorkspaceId) => Promise<boolean>

  make: (workspaceId: WorkspaceId) => Promise<void>
  remove: (workspaceId: WorkspaceId, objectNames: string[]) => Promise<void>
  delete: (workspaceId: WorkspaceId) => Promise<void>
  list: (workspaceId: WorkspaceId, prefix?: string) => Promise<WorkspaceItem[]>
  stat: (workspaceId: WorkspaceId, objectName: string) => Promise<BucketItemStat>
  get: (workspaceId: WorkspaceId, objectName: string) => Promise<Readable>
  put: (
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    metaData?: ItemBucketMetadata
  ) => Promise<UploadedObjectInfo>
  read: (workspaceId: WorkspaceId, name: string) => Promise<Buffer[]>
  partial: (workspaceId: WorkspaceId, objectName: string, offset: number, length?: number) => Promise<Readable>
}
