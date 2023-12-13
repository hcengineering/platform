import { Doc, Hierarchy, ModelDb, Ref, Storage, TxCUD, TxFactory } from '@hcengineering/core'

export interface DocObjectCache {
  docs: Map<Ref<Doc>, Doc | null>
  transactions: Map<Ref<Doc>, TxCUD<Doc>[]>
}

export interface ActivityControl {
  findAll: Storage['findAll']
  hierarchy: Hierarchy
  txFactory: TxFactory
  modelDb: ModelDb
}
