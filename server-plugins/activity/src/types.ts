import { Doc, Hierarchy, ModelDb, Ref, Storage, TxCUD, TxFactory, WorkspaceId } from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'

export interface DocObjectCache {
  docs: Map<Ref<Doc>, Doc | null>
  transactions: Map<Ref<Doc>, TxCUD<Doc>[]>
}

export interface ActivityControl {
  findAll: Storage['findAll']
  hierarchy: Hierarchy
  txFactory: TxFactory
  modelDb: ModelDb

  storageAdapter: StorageAdapter
  workspace: WorkspaceId
}
