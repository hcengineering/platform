import { Client, Doc, DocumentQuery, Domain, FindOptions, IncOptions, PushOptions } from '@anticrm/core'

/**
 * @public
 */
export type MigrateUpdate<T extends Doc> = Partial<T> & Omit<PushOptions<T>, '$move'> & IncOptions<T> & {
  // For any other mongo stuff
  [key: string]: any
}

/**
 * @public
 */
export interface MigrationResult {
  matched: number
  updated: number
}

/**
 * @public
 * Client to perform model upgrades
 */
export interface MigrationClient {
  // Raw collection operations

  // Raw FIND, allow to find documents inside domain.
  find: <T extends Doc>(domain: Domain, query: DocumentQuery<T>, options?: Omit<FindOptions<T>, 'lookup'>) => Promise<T[]>

  // Allow to raw update documents inside domain.
  update: <T extends Doc>(domain: Domain, query: DocumentQuery<T>, operations: MigrateUpdate<T>) => Promise<MigrationResult>
}

/**
 * @public
 */
export type MigrationUpgradeClient = Client

/**
 * @public
 */
export interface MigrateOperation {
  // Perform low level migration
  migrate: (client: MigrationClient) => Promise<void>
  // Perform high level upgrade operations.
  upgrade: (client: MigrationUpgradeClient) => Promise<void>
}
