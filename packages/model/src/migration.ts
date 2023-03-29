import {
  Client,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  Hierarchy,
  IncOptions,
  ModelDb,
  ObjQueryType,
  PushOptions,
  Ref,
  UnsetOptions
} from '@hcengineering/core'

/**
 * @public
 */
export type MigrateUpdate<T extends Doc> = Partial<T> &
Omit<PushOptions<T>, '$move'> &
IncOptions<T> &
UnsetOptions & {
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
 */
export type MigrationDocumentQuery<T extends Doc> = {
  [P in keyof T]?: ObjQueryType<T[P]> | null
} & {
  $search?: string
  // support nested queries e.g. 'user.friends.name'
  // this will mark all unrecognized properties as any (including nested queries)
  [key: string]: any
}

/**
 * @public
 * Client to perform model upgrades
 */
export interface MigrationClient {
  // Raw collection operations

  // Raw FIND, allow to find documents inside domain.
  find: <T extends Doc>(
    domain: Domain,
    query: MigrationDocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'lookup'>
  ) => Promise<T[]>

  // Allow to raw update documents inside domain.
  update: <T extends Doc>(
    domain: Domain,
    query: MigrationDocumentQuery<T>,
    operations: MigrateUpdate<T>
  ) => Promise<MigrationResult>

  bulk: <T extends Doc>(
    domain: Domain,
    operations: { filter: MigrationDocumentQuery<T>, update: MigrateUpdate<T> }[]
  ) => Promise<MigrationResult>

  // Move documents per domain
  move: <T extends Doc>(sourceDomain: Domain, query: DocumentQuery<T>, targetDomain: Domain) => Promise<MigrationResult>

  create: <T extends Doc>(domain: Domain, doc: T) => Promise<void>
  delete: <T extends Doc>(domain: Domain, _id: Ref<T>) => Promise<void>

  hierarchy: Hierarchy
  model: ModelDb
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
