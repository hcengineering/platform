//
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import contact from '@hcengineering/contact'
import core, {
  BackupClient,
  Client as CoreClient,
  DOMAIN_MIGRATION,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  groupByArray,
  Hierarchy,
  MeasureContext,
  MigrationState,
  ModelDb,
  Tx,
  WorkspaceId
} from '@hcengineering/core'
import { consoleModelLogger, MigrateOperation, ModelLogger } from '@hcengineering/model'
import { createMongoTxAdapter, DBCollectionHelper, getMongoClient, getWorkspaceDB } from '@hcengineering/mongo'
import { DomainIndexHelperImpl, StorageAdapter, StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { Db, Document } from 'mongodb'
import { connect } from './connect'
import toolPlugin from './plugin'
import { MigrateClientImpl } from './upgrade'

import fs from 'fs'
import path from 'path'

export * from './connect'
export * from './plugin'
export { toolPlugin as default }

export class FileModelLogger implements ModelLogger {
  handle: fs.WriteStream
  constructor (readonly file: string) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })

    this.handle = fs.createWriteStream(this.file, { flags: 'a' })
  }

  log (msg: string, data: any): void {
    this.handle.write(msg + ' : ' + JSON.stringify(data) + '\n')
  }

  error (msg: string, data: any): void {
    this.handle.write(msg + ': ' + JSON.stringify(data) + '\n')
  }

  close (): void {
    this.handle.close()
  }
}

/**
 * @public
 */
export function prepareTools (rawTxes: Tx[]): {
  mongodbUri: string
  txes: Tx[]
} {
  const mongodbUri = process.env.MONGO_URL
  if (mongodbUri === undefined) {
    console.error('please provide mongodb url.')
    process.exit(1)
  }

  return {
    mongodbUri,
    txes: JSON.parse(JSON.stringify(rawTxes)) as Tx[]
  }
}

/**
 * @public
 */
export async function initModel (
  ctx: MeasureContext,
  transactorUrl: string,
  workspaceId: WorkspaceId,
  rawTxes: Tx[],
  migrateOperations: [string, MigrateOperation][],
  logger: ModelLogger = consoleModelLogger,
  progress: (value: number) => Promise<void>
): Promise<void> {
  const { mongodbUri, txes } = prepareTools(rawTxes)
  if (txes.some((tx) => tx.objectSpace !== core.space.Model)) {
    throw Error('Model txes must target only core.space.Model')
  }

  const _client = getMongoClient(mongodbUri)
  const client = await _client.getClient()
  let connection: (CoreClient & BackupClient) | undefined
  const storageConfig: StorageConfiguration = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig, mongodbUri)
  try {
    const db = getWorkspaceDB(client, workspaceId)

    logger.log('creating model...', workspaceId)
    const result = await db.collection(DOMAIN_TX).insertMany(txes as Document[])
    logger.log('model transactions inserted.', { count: result.insertedCount })

    await progress(10)

    logger.log('creating data...', { transactorUrl })
    const { model } = await fetchModelFromMongo(ctx, mongodbUri, workspaceId)

    await progress(20)

    logger.log('create minio bucket', { workspaceId })

    await storageAdapter.make(ctx, workspaceId)

    logger.log('connecting to transactor', { workspaceId, transactorUrl })

    connection = (await connect(
      transactorUrl,
      workspaceId,
      undefined,
      {
        model: 'upgrade',
        admin: 'true'
      },
      model
    )) as unknown as CoreClient & BackupClient

    const states = await connection.findAll<MigrationState>(core.class.MigrationState, {})
    const sts = Array.from(groupByArray(states, (it) => it.plugin).entries())
    const migrateState = new Map(sts.map((it) => [it[0], new Set(it[1].map((q) => q.state))]))
    ;(connection as any).migrateState = migrateState

    try {
      let i = 0
      for (const op of migrateOperations) {
        logger.log('Migrate', { name: op[0] })
        await op[1].upgrade(connection as any, logger)
        i++
        await progress(20 + (((100 / migrateOperations.length) * i) / 100) * 10)
      }
      await progress(30)

      // Create update indexes
      await createUpdateIndexes(ctx, connection, db, logger, async (value) => {
        await progress(30 + (Math.min(value, 100) / 100) * 70)
      })
      await progress(100)
    } catch (e: any) {
      logger.error('error', { error: e })
      throw e
    }
  } catch (err: any) {
    ctx.error('Failed to create workspace', { error: err })
    throw err
  } finally {
    await storageAdapter.close()
    await connection?.sendForceClose()
    await connection?.close()
    _client.close()
  }
}

/**
 * @public
 */
export async function upgradeModel (
  ctx: MeasureContext,
  transactorUrl: string,
  workspaceId: WorkspaceId,
  rawTxes: Tx[],
  migrateOperations: [string, MigrateOperation][],
  logger: ModelLogger = consoleModelLogger,
  skipTxUpdate: boolean = false,
  progress: (value: number) => Promise<void>
): Promise<Tx[]> {
  const { mongodbUri, txes } = prepareTools(rawTxes)

  if (txes.some((tx) => tx.objectSpace !== core.space.Model)) {
    throw Error('Model txes must target only core.space.Model')
  }

  // const client = new MongoClient(mongodbUri)
  const _client = getMongoClient(mongodbUri)
  const client = await _client.getClient()
  const storageConfig: StorageConfiguration = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig, mongodbUri)

  try {
    const db = getWorkspaceDB(client, workspaceId)

    const prevModel = await fetchModelFromMongo(ctx, mongodbUri, workspaceId)
    const { migrateClient: preMigrateClient } = await prepareMigrationClient(
      db,
      prevModel.hierarchy,
      prevModel.modelDb,
      logger,
      storageAdapter,
      workspaceId
    )

    await progress(0)
    await ctx.with('pre-migrate', {}, async () => {
      let i = 0
      for (const op of migrateOperations) {
        if (op[1].preMigrate === undefined) {
          continue
        }

        const t = Date.now()
        try {
          await op[1].preMigrate(preMigrateClient, logger)
        } catch (err: any) {
          logger.error(`error during pre-migrate: ${op[0]} ${err.message}`, err)
          throw err
        }
        logger.log('pre-migrate:', { workspaceId: workspaceId.name, operation: op[0], time: Date.now() - t })
        await progress(((100 / migrateOperations.length) * i * 10) / 100)
        i++
      }
    })

    if (!skipTxUpdate) {
      logger.log('removing model...', { workspaceId: workspaceId.name })
      await progress(10)
      // we're preserving accounts (created by core.account.System).
      const result = await ctx.with(
        'mongo-delete',
        {},
        async () =>
          await db.collection(DOMAIN_TX).deleteMany({
            objectSpace: core.space.Model,
            modifiedBy: core.account.System,
            objectClass: { $nin: [contact.class.PersonAccount, 'contact:class:EmployeeAccount'] }
          })
      )
      logger.log('transactions deleted.', { workspaceId: workspaceId.name, count: result.deletedCount })

      logger.log('creating model...', { workspaceId: workspaceId.name })
      const insert = await ctx.with(
        'mongo-insert',
        {},
        async () => await db.collection(DOMAIN_TX).insertMany(txes as Document[])
      )

      logger.log('model transactions inserted.', { workspaceId: workspaceId.name, count: insert.insertedCount })
      await progress(20)
    }

    const { hierarchy, modelDb, model } = await fetchModelFromMongo(ctx, mongodbUri, workspaceId)
    const { migrateClient, migrateState } = await prepareMigrationClient(
      db,
      hierarchy,
      modelDb,
      logger,
      storageAdapter,
      workspaceId
    )

    await ctx.with('migrate', {}, async () => {
      let i = 0
      for (const op of migrateOperations) {
        const t = Date.now()
        try {
          await op[1].migrate(migrateClient, logger)
        } catch (err: any) {
          logger.error(`error during migrate: ${op[0]} ${err.message}`, err)
          throw err
        }
        logger.log('migrate:', { workspaceId: workspaceId.name, operation: op[0], time: Date.now() - t })
        await progress(20 + ((100 / migrateOperations.length) * i * 20) / 100)
        i++
      }
    })
    logger.log('Apply upgrade operations', { workspaceId: workspaceId.name })

    const connection = (await ctx.with(
      'connect-platform',
      {},
      async (ctx) =>
        await connect(
          transactorUrl,
          workspaceId,
          undefined,
          {
            mode: 'backup',
            model: 'upgrade',
            admin: 'true'
          },
          model
        )
    )) as CoreClient & BackupClient
    try {
      await ctx.with('upgrade', {}, async () => {
        let i = 0
        for (const op of migrateOperations) {
          const t = Date.now()
          ;(connection as any).migrateState = migrateState
          await op[1].upgrade(connection as any, logger)
          logger.log('upgrade:', { operation: op[0], time: Date.now() - t, workspaceId: workspaceId.name })
          await progress(60 + ((100 / migrateOperations.length) * i * 40) / 100)
          i++
        }
      })

      if (!skipTxUpdate) {
        // Create update indexes
        await ctx.with('create-indexes', {}, async (ctx) => {
          await createUpdateIndexes(ctx, connection, db, logger, async (value) => {
            await progress(40 + (Math.min(value, 100) / 100) * 20)
          })
        })
      }
    } finally {
      await connection.sendForceClose()
      await connection.close()
    }
    return model
  } finally {
    await storageAdapter.close()
    _client.close()
  }
}

async function prepareMigrationClient (
  db: Db,
  hierarchy: Hierarchy,
  model: ModelDb,
  logger: ModelLogger,
  storageAdapter: StorageAdapter,
  workspaceId: WorkspaceId
): Promise<{
    migrateClient: MigrateClientImpl
    migrateState: Map<string, Set<string>>
  }> {
  const migrateClient = new MigrateClientImpl(db, hierarchy, model, logger, storageAdapter, workspaceId)
  const states = await migrateClient.find<MigrationState>(DOMAIN_MIGRATION, { _class: core.class.MigrationState })
  const sts = Array.from(groupByArray(states, (it) => it.plugin).entries())
  const migrateState = new Map(sts.map((it) => [it[0], new Set(it[1].map((q) => q.state))]))
  migrateClient.migrateState = migrateState

  return { migrateClient, migrateState }
}

async function fetchModelFromMongo (
  ctx: MeasureContext,
  mongodbUri: string,
  workspaceId: WorkspaceId
): Promise<{ hierarchy: Hierarchy, modelDb: ModelDb, model: Tx[] }> {
  const hierarchy = new Hierarchy()
  const modelDb = new ModelDb(hierarchy)

  const txAdapter = await createMongoTxAdapter(ctx, hierarchy, mongodbUri, workspaceId, modelDb)

  const model = await ctx.with('get-model', {}, async (ctx) => await txAdapter.getModel(ctx))

  await ctx.with('build local model', {}, async () => {
    for (const tx of model) {
      try {
        hierarchy.tx(tx)
      } catch (err: any) {}
    }
    for (const tx of model) {
      try {
        await modelDb.tx(tx)
      } catch (err: any) {}
    }
  })
  await txAdapter.close()
  return { hierarchy, modelDb, model }
}

async function createUpdateIndexes (
  ctx: MeasureContext,
  connection: CoreClient,
  db: Db,
  logger: ModelLogger,
  progress: (value: number) => Promise<void>
): Promise<void> {
  const domainHelper = new DomainIndexHelperImpl(connection.getHierarchy(), connection.getModel())
  const dbHelper = new DBCollectionHelper(db)
  await dbHelper.init()
  let completed = 0
  const allDomains = connection.getHierarchy().domains()
  for (const domain of allDomains) {
    if (domain === DOMAIN_MODEL || domain === DOMAIN_TRANSIENT) {
      continue
    }
    const result = await domainHelper.checkDomain(ctx, domain, false, dbHelper)
    if (!result && dbHelper.exists(domain)) {
      try {
        logger.log('dropping domain', { domain })
        if ((await db.collection(domain).countDocuments({})) === 0) {
          await db.dropCollection(domain)
        }
      } catch (err) {
        logger.error('error: failed to delete collection', { domain, err })
      }
    }
    completed++
    await progress((100 / allDomains.length) * completed)
  }
}
