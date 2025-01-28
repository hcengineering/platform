import { Doc, Hierarchy, ModelDb, Ref, TxCUD, TxFactory, WorkspaceIds, type MeasureContext } from '@hcengineering/core'
import { StorageAdapter, type SessionFindAll } from '@hcengineering/server-core'

export interface DocObjectCache {
  docs: Map<Ref<Doc>, Doc | null>
  transactions: Map<Ref<Doc>, TxCUD<Doc>[]>
}

export interface ActivityControl {
  ctx: MeasureContext
  findAll: SessionFindAll
  hierarchy: Hierarchy
  txFactory: TxFactory
  modelDb: ModelDb
  storageAdapter: StorageAdapter
  workspace: WorkspaceIds
}
