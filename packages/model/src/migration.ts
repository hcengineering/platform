import { AccountClient } from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import core, {
  Class,
  Client,
  DOMAIN_MIGRATION,
  DOMAIN_TX,
  Data,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  Hierarchy,
  MigrationState,
  ModelDb,
  ObjQueryType,
  Rank,
  Ref,
  SortingOrder,
  Space,
  TxOperations,
  UnsetOptions,
  WorkspaceIds,
  generateId
} from '@hcengineering/core'
import { makeRank } from '@hcengineering/rank'
import { StorageAdapter } from '@hcengineering/storage'
import { ModelLogger } from './utils'

/**
 * @public
 */
export type MigrateUpdate<T extends Doc> = Partial<T> & UnsetOptions & Record<string, any>

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

  // Raw group by, allow to group documents inside domain.
  groupBy: <T, P extends Doc>(domain: Domain, field: string, query?: DocumentQuery<P>) => Promise<Map<T, number>>

  // Traverse documents
  traverse: <T extends Doc>(
    domain: Domain,
    query: MigrationDocumentQuery<T>,
    options?: Pick<FindOptions<T>, 'sort' | 'limit' | 'projection'>
  ) => Promise<MigrationIterator<T>>

  // Allow to raw update documents inside domain.
  update: <T extends Doc>(
    domain: Domain,
    query: MigrationDocumentQuery<T>,
    operations: MigrateUpdate<T>
  ) => Promise<void>

  bulk: <T extends Doc>(
    domain: Domain,
    operations: { filter: MigrationDocumentQuery<T>, update: MigrateUpdate<T> }[]
  ) => Promise<void>

  // Move documents per domain
  move: <T extends Doc>(
    sourceDomain: Domain,
    query: DocumentQuery<T>,
    targetDomain: Domain,
    size?: number
  ) => Promise<void>

  create: <T extends Doc>(domain: Domain, doc: T | T[]) => Promise<void>
  delete: <T extends Doc>(domain: Domain, _id: Ref<T>) => Promise<void>
  deleteMany: <T extends Doc>(domain: Domain, query: DocumentQuery<T>) => Promise<void>

  hierarchy: Hierarchy
  model: ModelDb

  migrateState: Map<string, Set<string>>
  storageAdapter: StorageAdapter
  accountClient: AccountClient

  wsIds: WorkspaceIds
}

/**
 * @public
 */
export type MigrationUpgradeClient = Client
export type MigrateMode = 'create' | 'upgrade'

/**
 * @public
 */
export interface MigrateOperation {
  // Perform low level migration prior to the model update
  preMigrate?: (client: MigrationClient, logger: ModelLogger, mode: MigrateMode) => Promise<void>
  // Perform low level migration
  migrate: (client: MigrationClient, mode: MigrateMode) => Promise<void>
  // Perform high level upgrade operations.
  upgrade: (
    state: Map<string, Set<string>>,
    client: () => Promise<MigrationUpgradeClient>,
    mode: MigrateMode
  ) => Promise<void>
}

/**
 * @public
 */
export interface Migrations {
  state: string
  mode?: MigrateMode // If set only applied to specified mode
  func: (client: MigrationClient, mode: MigrateMode) => Promise<void>
}

/**
 * @public
 */
export interface UpgradeOperations {
  state: string
  mode?: MigrateMode // If set only applied to specified mode
  func: (client: MigrationUpgradeClient, mode: MigrateMode) => Promise<void>
}

/**
 * @public
 */
export async function tryMigrate (
  client: MigrationClient,
  plugin: string,
  migrations: Migrations[],
  mode: MigrateMode = 'upgrade'
): Promise<void> {
  const states = client.migrateState.get(plugin) ?? new Set()
  for (const migration of migrations) {
    if (states.has(migration.state)) continue
    if (migration.mode == null || migration.mode === mode) {
      try {
        console.log('running migration', plugin, migration.state)
        await migration.func(client, mode)
      } catch (err: any) {
        console.error(err)
        Analytics.handleError(err)
        continue
      }
    }
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
  state: Map<string, Set<string>>,
  client: () => Promise<MigrationUpgradeClient>,
  plugin: string,
  migrations: UpgradeOperations[],
  mode: MigrateMode = 'upgrade'
): Promise<void> {
  const states = state.get(plugin) ?? new Set()
  for (const upgrades of migrations) {
    if (states.has(upgrades.state)) continue
    const _client = await client()
    if (upgrades.mode == null || upgrades.mode === mode) {
      try {
        await upgrades.func(_client, mode)
      } catch (err: any) {
        console.error(err)
        Analytics.handleError(err)
        continue
      }
    }
    const st: Data<MigrationState> = {
      plugin,
      state: upgrades.state
    }
    const tx = new TxOperations(_client, core.account.System)
    await tx.createDoc(core.class.MigrationState, core.space.Configuration, st)
  }
}

type DefaultSpaceData<T extends Space> = Pick<T, 'description' | 'private' | 'archived' | 'members'>
type RequiredData<T extends Space> = Omit<Data<T>, keyof DefaultSpaceData<T>> & Partial<DefaultSpaceData<T>>

/**
 * @public
 */
export async function createDefaultSpace<T extends Space> (
  client: MigrationUpgradeClient,
  _id: Ref<T>,
  props: RequiredData<T>,
  _class: Ref<Class<T>> = core.class.SystemSpace
): Promise<void> {
  const defaults: DefaultSpaceData<T> = {
    description: '',
    private: false,
    archived: false,
    members: []
  }
  const data: Data<Space> = {
    ...defaults,
    ...props
  }
  const tx = new TxOperations(client, core.account.System)
  const current = await tx.findOne(core.class.Space, {
    _id
  })
  if (current === undefined || current._class !== _class) {
    if (current !== undefined && current._class !== _class) {
      await tx.remove(current)
    }
    await tx.createDoc(_class, core.space.Space, data, _id)
  }
}

/**
 * @public
 */
export async function migrateSpace (
  client: MigrationClient,
  from: Ref<Space>,
  to: Ref<Space>,
  domains: Domain[]
): Promise<void> {
  for (const domain of domains) {
    await client.update(domain, { space: from }, { space: to })
  }
  await client.update(DOMAIN_TX, { objectSpace: from }, { objectSpace: to })
}

export async function migrateSpaceRanks (client: MigrationClient, domain: Domain, space: Space): Promise<void> {
  type WithRank = Doc & { rank: Rank }

  const iterator = await client.traverse<WithRank>(
    domain,
    { space: space._id, rank: { $exists: true } },
    { sort: { rank: SortingOrder.Ascending } }
  )

  try {
    let rank = '0|100000:'

    while (true) {
      const docs = await iterator.next(1000)
      if (docs === null || docs.length === 0) {
        break
      }

      const updates: { filter: MigrationDocumentQuery<Doc<Space>>, update: MigrateUpdate<Doc<Space>> }[] = []
      for (const doc of docs) {
        rank = makeRank(rank, undefined)
        updates.push({ filter: { _id: doc._id }, update: { rank } })
      }

      await client.bulk(domain, updates)
    }
  } finally {
    await iterator.close()
  }
}
