import core, {
  Client,
  Doc,
  DOMAIN_MIGRATION,
  DocumentQuery,
  Domain,
  FindOptions,
  Hierarchy,
  IncOptions,
  ModelDb,
  ObjQueryType,
  PushOptions,
  Ref,
  UnsetOptions,
  MigrationState,
  generateId,
  TxOperations,
  Data
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
  const states = new Set(
    (await client.find<MigrationState>(DOMAIN_MIGRATION, { _class: core.class.MigrationState, plugin })).map(
      (p) => p.state
    )
  )
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
  const states = new Set((await client.findAll(core.class.MigrationState, { plugin })).map((p) => p.state))
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
