import core, {
  Client,
  DOMAIN_MIGRATION,
  Data,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  Hierarchy,
  IncOptions,
  MigrationState,
  ModelDb,
  ObjQueryType,
  PushOptions,
  Ref,
  TxOperations,
  UnsetOptions,
  generateId
} from '@hcengineering/core'
import { ModelLogger } from './utils'

/**
 * @public
 */
export type MigrateUpdate<T extends Doc> = Partial<T> &
Omit<PushOptions<T>, '$move'> &
IncOptions<T> &
UnsetOptions &
Record<string, any>

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
 */
export interface MigrationIterator<T extends Doc> {
  next: (count: number) => Promise<T[] | null>
  close: () => Promise<void>
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

  // Traverse documents
  traverse: <T extends Doc>(
    domain: Domain,
    query: MigrationDocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'lookup'>
  ) => Promise<MigrationIterator<T>>

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

  create: <T extends Doc>(domain: Domain, doc: T | T[]) => Promise<void>
  delete: <T extends Doc>(domain: Domain, _id: Ref<T>) => Promise<void>
  deleteMany: <T extends Doc>(domain: Domain, query: DocumentQuery<T>) => Promise<void>

  hierarchy: Hierarchy
  model: ModelDb

  migrateState: Map<string, Set<string>>
}

/**
 * @public
 */
export type MigrationUpgradeClient = Client & {
  migrateState: Map<string, Set<string>>
}

/**
 * @public
 */
export interface MigrateOperation {
  // Perform low level migration
  migrate: (client: MigrationClient, logger: ModelLogger) => Promise<void>
  // Perform high level upgrade operations.
  upgrade: (client: MigrationUpgradeClient, logger: ModelLogger) => Promise<void>
}

/**
 * @public
 */
export interface Migrations {
  state: string
  func: (client: MigrationClient) => Promise<void>
}

/**
 * @public
 */
export interface UpgradeOperations {
  state: string
  func: (client: MigrationUpgradeClient) => Promise<void>
}

/**
 * @public
 */
export async function tryMigrate (client: MigrationClient, plugin: string, migrations: Migrations[]): Promise<void> {
  const states = client.migrateState.get(plugin) ?? new Set()
  for (const migration of migrations) {
    if (states.has(migration.state)) continue
    await migration.func(client)
    const st: MigrationState = {
      plugin,
      state: migration.state,
      space: core.space.Configuration,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      _class: core.class.MigrationState,
      _id: generateId()
    }
    await client.create(DOMAIN_MIGRATION, st)
  }
}

/**
 * @public
 */
export async function tryUpgrade (
  client: MigrationUpgradeClient,
  plugin: string,
  migrations: UpgradeOperations[]
): Promise<void> {
  const states = client.migrateState.get(plugin) ?? new Set()
  for (const migration of migrations) {
    if (states.has(migration.state)) continue
    await migration.func(client)
    const st: Data<MigrationState> = {
      plugin,
      state: migration.state
    }
    const tx = new TxOperations(client, core.account.System)
    await tx.createDoc(core.class.MigrationState, core.space.Configuration, st)
  }
}
