import { Doc, Domain, Ref } from './classes'
import { DocInfo } from './server'

/**
 * @public
 * Define a st of document + hashcode for chunk
 * So backup client could decide to download or not any of documents.
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
