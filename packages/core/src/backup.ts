import type { WorkspaceUuid } from '.'
import { type Doc, type Domain, type Ref } from './classes'
import { type DocInfo } from './server'

/**
 * @public
 * Define a st of document + hashcode for chunk
 * So backup client could decide to download or not any of documents.
 */
export interface DocChunk {
  idx: number
  // _id => hash mapping
  docs: DocInfo[]

  size?: number // Estimated size of the chunk data
  finished: boolean
}

/**
 * @public
 */
export interface BackupClient {
  loadChunk: (workspaceId: WorkspaceUuid, domain: Domain, idx?: number) => Promise<DocChunk>
  closeChunk: (workspaceId: WorkspaceUuid, idx: number) => Promise<void>

  loadDocs: (workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>
  upload: (workspaceId: WorkspaceUuid, domain: Domain, docs: Doc[]) => Promise<void>
  clean: (workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]) => Promise<void>

  getDomainHash: (workspaceId: WorkspaceUuid, domain: Domain) => Promise<string>

  sendForceClose: (workspace: WorkspaceUuid) => Promise<void>
}
