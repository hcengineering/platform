import { Hierarchy, ModelDb, Storage, TxFactory } from '@hcengineering/core'

/**
 * @public
 */
export interface Content {
  text: string
  html: string
  subject: string
}

export interface NotificationControl {
  findAll: Storage['findAll']
  hierarchy: Hierarchy
  txFactory: TxFactory
  modelDb: ModelDb
}
