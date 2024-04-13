import { Doc, Domain, Ref } from './classes'
import { DocInfo } from './server'

/**
 * @public

 * Defines a 'chunk' of documents for backup. Each chunk, identified by an index, contains an 
 * array of `DocInfo` objects. Each `DocInfo` includes a unique ID and a hash code, used by
 * the backup client if a document needs to be downloaded. 
 * 
 * @property {number} idx - The index of the chunk.
 * @property {DocInfo[]} docs - The array of document information.
 * @property {boolean} finished - A flag indicating whether the chunk is finished and all documents have been processed.
 */
export interface DocChunk {
  idx: number
  // _id => hash mapping
  docs: DocInfo[]
  finished: boolean
}

/**
 * @public
 */
export interface BackupClient {
  loadChunk: (domain: Domain, idx?: number) => Promise<DocChunk>
  closeChunk: (idx: number) => Promise<void>

  loadDocs: (domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>
  upload: (domain: Domain, docs: Doc[]) => Promise<void>
  clean: (domain: Domain, docs: Ref<Doc>[]) => Promise<void>
}
