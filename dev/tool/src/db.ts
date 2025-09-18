/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  type AccountDB,
  type MongoAccountDB,
  type Workspace,
  addSocialIdToPerson,
  ensurePerson,
  findFullSocialIdBySocialKey,
  findPersonBySocialKey,
  mergeSpecifiedPersons,
  mergeSpecifiedAccounts,
  createAccount
} from '@hcengineering/account'
import { getFirstName, getLastName } from '@hcengineering/contact'
import {
  systemAccountUuid,
  type BackupClient,
  type Client,
  type Doc,
  MeasureMetricsContext,
  SocialIdType,
  type PersonUuid,
  type SocialKey,
  type AccountUuid,
  parseSocialIdString,
  DOMAIN_SPACE,
  AccountRole,
  generateId,
  type WorkspaceDataId,
  type WorkspaceUuid,
  generateUuid,
  type WorkspaceMode,
  type Tx
} from '@hcengineering/core'
import { getMongoClient, getWorkspaceMongoDB } from '@hcengineering/mongo'
import {
  convertDoc,
  createTables,
  getDBClient,
  getDocFieldsByDomains,
  retryTxn,
  translateDomain,
  setDBExtraOptions
} from '@hcengineering/postgres'
import { type DBDoc } from '@hcengineering/postgres/types/utils'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { connect, sendTransactorEvent } from '@hcengineering/server-tool'
import {
  type MongoAccountDB as v6MongoAccountDB,
  type Account as OldAccount,
  type Workspace as OldWorkspace
} from '@hcengineering/account-service'
import { type MongoClient } from 'mongodb'
import type postgres from 'postgres'
import { type Row } from 'postgres'
import { getToolToken } from './utils'
import { type BackupStorage, createFileBackupStorage, restore } from '@hcengineering/server-backup'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { getPlatformQueue } from '@hcengineering/kafka'
import {
  type Pipeline,
  QueueTopic,
  type QueueWorkspaceMessage,
  type StorageAdapter,
  workspaceEvents
} from '@hcengineering/server-core'
import { createBackupPipeline, createEmptyBroadcastOps } from '@hcengineering/server-pipeline'

export async function moveFromMongoToPG (
  accountDb: AccountDB,
  mongoUrl: string,
  dbUrl: string | undefined,
  workspaces: Workspace[],
  region: string
): Promise<void> {
  if (dbUrl === undefined) {
    throw new Error('dbUrl is required')
  }
  const client = getMongoClient(mongoUrl)
  const mongo = await client.getClient()
  const pg = getDBClient(dbUrl)
  const pgClient = await pg.getClient()

  for (let index = 0; index < workspaces.length; index++) {
    const ws = workspaces[index]
    try {
      await moveWorkspace(accountDb, mongo, pgClient, ws, region)
      console.log('Move workspace', index, workspaces.length)
    } catch (err) {
      console.log('Error when move workspace', ws.name ?? ws.url, err)
      throw err
    }
  }
  pg.close()
  client.close()
}

async function moveWorkspace (
  accountDb: AccountDB,
  mongo: MongoClient,
  pgClient: postgres.Sql,
  ws: Workspace,
  region: string,
  include?: Set<string>,
  force = false
): Promise<void> {
  try {
    console.log('move workspace', ws.name ?? ws.url)
    const wsId = ws.uuid
    // TODO: get workspace mongoDB
    const mongoDB = getWorkspaceMongoDB(mongo, ws.dataId ?? wsId)
    const collections = await mongoDB.collections()
    let tables = collections.map((c) => c.collectionName)
    if (include !== undefined) {
      tables = tables.filter((t) => include.has(t))
    }

    await createTables(new MeasureMetricsContext('', {}), pgClient, '', tables)
    const token = generateToken(systemAccountUuid, wsId, { service: 'tool' })
    const endpoint = await getTransactorEndpoint(token, 'external')
    const connection = (await connect(endpoint, wsId, undefined, {
      model: 'upgrade'
    })) as unknown as Client & BackupClient
    for (const collection of collections) {
      const domain = translateDomain(collection.collectionName)
      if (include !== undefined && !include.has(domain)) {
        continue
      }
      const cursor = collection.find()
      const current = await pgClient`SELECT _id FROM ${pgClient(domain)} WHERE "workspaceId" = ${ws.uuid}`
      const currentIds = new Set(current.map((r) => r._id))
      console.log('move domain', domain)
      const docs: Doc[] = []
      const fields = getDocFieldsByDomains(domain)
      const filedsWithData = [...fields, 'data']
      const insertFields: string[] = ['workspaceId']
      for (const field of filedsWithData) {
        insertFields.push(field)
      }
      while (true) {
        const toRemove: string[] = []
        while (docs.length < 5000) {
          const doc = (await cursor.next()) as Doc | null
          if (doc === null) break
          if (currentIds.has(doc._id)) {
            if (force) {
              toRemove.push(doc._id)
            } else {
              continue
            }
          }
          docs.push(doc)
        }
        while (toRemove.length > 0) {
          const part = toRemove.splice(0, 100)
          await retryTxn(pgClient, async (client) => {
            await client.unsafe(
              `DELETE FROM ${translateDomain(domain)} WHERE "workspaceId" = '${ws.uuid}' AND _id IN (${part.map((c) => `'${c}'`).join(', ')})`
            )
          })
        }
        if (docs.length === 0) break
        while (docs.length > 0) {
          const part = docs.splice(0, 100)
          const values: DBDoc[] = []
          for (let i = 0; i < part.length; i++) {
            const doc = part[i]
            const d = convertDoc(domain, doc, wsId)
            values.push(d)
          }
          try {
            await retryTxn(pgClient, async (client) => {
              await client`INSERT INTO ${client(translateDomain(domain))} ${client(values, insertFields)}`
            })
          } catch (err) {
            console.log('Error when insert', domain, err)
          }
        }
      }
    }
    // TODO: FIXME
    // await updateWorkspace(accountDb, ws, { region })
    await connection.sendForceClose()
    await connection.close()
  } catch (err) {
    console.log('Error when move workspace', ws.name ?? ws.url, err)
    throw err
  }
}

export async function moveWorkspaceFromMongoToPG (
  accountDb: AccountDB,
  mongoUrl: string,
  dbUrl: string | undefined,
  ws: Workspace,
  region: string,
  include?: Set<string>,
  force?: boolean
): Promise<void> {
  if (dbUrl === undefined) {
    throw new Error('dbUrl is required')
  }
  const client = getMongoClient(mongoUrl)
  const mongo = await client.getClient()
  const pg = getDBClient(dbUrl)
  const pgClient = await pg.getClient()

  await moveWorkspace(accountDb, mongo, pgClient, ws, region, include, force)
  pg.close()
  client.close()
}

export async function moveAccountDbFromMongoToPG (
  ctx: MeasureMetricsContext,
  mongoDb: AccountDB,
  pgDb: AccountDB
): Promise<void> {
  const mdb = mongoDb as MongoAccountDB
  const BATCH_SIZE = 5000
  const WS_BATCH_SIZE = 2000

  ctx.info('Starting migration of persons...')
  const personsCursor = mdb.person.findCursor({})
  try {
    let personsCount = 0
    let personsBatch: any[] = []

    while (await personsCursor.hasNext()) {
      const person = await personsCursor.next()
      if (person == null) break

      const exists = await pgDb.person.findOne({ uuid: person.uuid })
      if (exists == null) {
        if (person.firstName == null) {
          person.firstName = 'n/a'
        }

        if (person.lastName == null) {
          person.lastName = ''
        }

        personsBatch.push(person)
        if (personsBatch.length >= BATCH_SIZE) {
          await pgDb.person.insertMany(personsBatch)
          personsCount += personsBatch.length
          ctx.info(`Migrated ${personsCount} persons...`)
          personsBatch = []
        }
      }
    }
    // Insert remaining batch
    if (personsBatch.length > 0) {
      await pgDb.person.insertMany(personsBatch)
      personsCount += personsBatch.length
    }
    ctx.info(`Migrated ${personsCount} persons`)
  } finally {
    await personsCursor.close()
  }

  ctx.info('Starting migration of accounts...')
  const accountsCursor = mdb.account.findCursor({})
  try {
    let accountsCount = 0
    let accountsBatch: any[] = []
    let passwordsBatch: any[] = []

    while (await accountsCursor.hasNext()) {
      const account = await accountsCursor.next()
      if (account == null) break

      const exists = await pgDb.account.findOne({ uuid: account.uuid })
      if (exists == null) {
        const { hash, salt } = account

        delete account.hash
        delete account.salt

        accountsBatch.push(account)
        if (hash != null && salt != null) {
          passwordsBatch.push([account.uuid, hash, salt])
        }

        if (accountsBatch.length >= BATCH_SIZE) {
          await pgDb.account.insertMany(accountsBatch)
          for (const [accountUuid, hash, salt] of passwordsBatch) {
            await pgDb.setPassword(accountUuid, hash, salt)
          }

          accountsCount += accountsBatch.length
          ctx.info(`Migrated ${accountsCount} accounts...`)
          accountsBatch = []
          passwordsBatch = []
        }
      }
    }
    // Insert remaining batch
    if (accountsBatch.length > 0) {
      await pgDb.account.insertMany(accountsBatch)
      accountsCount += accountsBatch.length
    }
    if (passwordsBatch.length > 0) {
      for (const [accountUuid, hash, salt] of passwordsBatch) {
        await pgDb.setPassword(accountUuid, hash, salt)
      }
    }
    ctx.info(`Migrated ${accountsCount} accounts`)
  } finally {
    await accountsCursor.close()
  }

  ctx.info('Starting migration of social IDs...')
  const socialIdsCursor = mdb.socialId.findCursor({})
  try {
    let socialIdsCount = 0
    let socialIdsBatch: any[] = []
    while (await socialIdsCursor.hasNext()) {
      const socialId = await socialIdsCursor.next()
      if (socialId == null) break

      const exists = await pgDb.socialId.findOne({ key: socialId.key })
      if (exists == null) {
        delete (socialId as any).key
        delete (socialId as any).id
        delete (socialId as any)._id // Types of _id are incompatible

        socialIdsBatch.push(socialId)

        if (socialIdsBatch.length >= BATCH_SIZE) {
          await pgDb.socialId.insertMany(socialIdsBatch)

          socialIdsCount += socialIdsBatch.length
          ctx.info(`Migrated ${socialIdsCount} social ids...`)
          socialIdsBatch = []
        }
      }
    }
    // Insert remaining batch
    if (socialIdsBatch.length > 0) {
      await pgDb.socialId.insertMany(socialIdsBatch)
      socialIdsCount += socialIdsBatch.length
    }
    ctx.info(`Migrated ${socialIdsCount} social IDs`)
  } finally {
    await socialIdsCursor.close()
  }

  ctx.info('Starting migration of account events...')
  const accountEventsCursor = mdb.accountEvent.findCursor({})
  try {
    let eventsCount = 0
    let eventsBatch: any[] = []
    while (await accountEventsCursor.hasNext()) {
      const accountEvent = await accountEventsCursor.next()
      if (accountEvent == null) break

      const exists = await pgDb.accountEvent.findOne({
        accountUuid: accountEvent.accountUuid,
        eventType: accountEvent.eventType,
        time: accountEvent.time
      })
      if (exists == null) {
        const account = await pgDb.account.findOne({ uuid: accountEvent.accountUuid })
        if (account == null) continue // Not a big deal if we don't move the event for non-existing account

        eventsBatch.push(accountEvent)

        if (eventsBatch.length >= BATCH_SIZE) {
          await pgDb.accountEvent.insertMany(eventsBatch)
          eventsCount += eventsBatch.length
          ctx.info(`Migrated ${eventsCount} account events...`)
          eventsBatch = []
        }
      }
    }
    // Insert remaining batch
    if (eventsBatch.length > 0) {
      await pgDb.accountEvent.insertMany(eventsBatch)
      eventsCount += eventsBatch.length
    }
    ctx.info(`Migrated ${eventsCount} account events`)
  } finally {
    await accountEventsCursor.close()
  }

  ctx.info('Starting migration of workspaces...')
  const workspacesCursor = mdb.workspace.findCursor({})
  try {
    let workspacesCount = 0
    let workspacesBatch: any[] = []
    let workspacesStatusesBatch: any[] = []
    let workspacesMembersBatch: any[] = []
    let membersCount = 0
    while (await workspacesCursor.hasNext()) {
      const workspace = await workspacesCursor.next()
      if (workspace == null) break

      const exists = await pgDb.workspace.findOne({ uuid: workspace.uuid })
      if (exists != null) continue

      const status = workspace.status
      if (status == null) continue
      delete (workspace as any).status

      if (workspace.createdBy === 'N/A') {
        delete workspace.createdBy
      }

      if (workspace.billingAccount === 'N/A') {
        delete workspace.billingAccount
      }

      if (workspace.createdOn == null) {
        workspace.createdOn = Date.now()
      }

      workspacesBatch.push(workspace)
      workspacesStatusesBatch.push(status)

      const members = await mdb.getWorkspaceMembers(workspace.uuid)
      for (const member of members) {
        const alreadyAssigned = await pgDb.getWorkspaceRole(member.person, workspace.uuid)
        if (alreadyAssigned != null) continue

        workspacesMembersBatch.push([member.person, workspace.uuid, member.role])
      }

      if (workspacesBatch.length >= WS_BATCH_SIZE) {
        const workspaceUuids = await pgDb.workspace.insertMany(workspacesBatch)
        workspacesCount += workspacesBatch.length
        workspacesBatch = []

        await pgDb.workspaceStatus.insertMany(
          workspacesStatusesBatch.map((s, i) => ({ ...s, workspaceUuid: workspaceUuids[i] }))
        )
        workspacesStatusesBatch = []

        await pgDb.batchAssignWorkspace(workspacesMembersBatch)
        membersCount += workspacesMembersBatch.length
        workspacesMembersBatch = []

        ctx.info(`Migrated ${workspacesCount} workspaces...`)
      }
    }

    // Insert remaining batch
    if (workspacesBatch.length > 0) {
      const workspaceUuids = await pgDb.workspace.insertMany(workspacesBatch)
      workspacesCount += workspacesBatch.length
      await pgDb.workspaceStatus.insertMany(
        workspacesStatusesBatch.map((s, i) => ({ ...s, workspaceUuid: workspaceUuids[i] }))
      )
      await pgDb.batchAssignWorkspace(workspacesMembersBatch)
      membersCount += workspacesMembersBatch.length
    }

    ctx.info(`Migrated ${workspacesCount} workspaces with ${membersCount} member assignments`)
  } finally {
    await workspacesCursor.close()
  }

  ctx.info('Starting migration of invites...')
  const invitesCursor = mdb.invite.findCursor({})
  try {
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    const MAX_INT_8 = 9223372036854775807
    let invitesCount = 0
    let invitesBatch: any[] = []
    while (await invitesCursor.hasNext()) {
      const invite = await invitesCursor.next()
      if (invite == null) break
      if (invite.migratedFrom == null) {
        invite.migratedFrom = invite.id
      }

      delete (invite as any).id

      if (invite.expiresOn > MAX_INT_8 || typeof invite.expiresOn !== 'number') {
        invite.expiresOn = -1
      }

      if (["USER'", 'ADMIN'].includes(invite.role as any)) {
        invite.role = AccountRole.User
      }

      const exists = await pgDb.invite.findOne({ migratedFrom: invite.migratedFrom })
      if (exists == null) {
        invitesBatch.push(invite)

        if (invitesBatch.length >= BATCH_SIZE) {
          await pgDb.invite.insertMany(invitesBatch)
          invitesCount += invitesBatch.length
          ctx.info(`Migrated ${invitesCount} invites...`)
          invitesBatch = []
        }
      }
    }
    if (invitesBatch.length > 0) {
      await pgDb.invite.insertMany(invitesBatch)
      invitesCount += invitesBatch.length
    }
    ctx.info(`Migrated ${invitesCount} invites`)
  } finally {
    await invitesCursor.close()
  }

  ctx.info('Account database migration completed')
}

export async function migrateCreatedModifiedBy (
  ctx: MeasureMetricsContext,
  dbUrl: string,
  workspace: Workspace,
  includeDomains?: string[],
  excludeDomains?: string[],
  maxLifetimeSec?: number,
  batchSize?: number,
  force: boolean = false,
  maxReconnects: number = 30,
  maxRetries: number = 50
): Promise<void> {
  if (!dbUrl.startsWith('postgresql')) {
    throw new Error('Only CockroachDB is supported')
  }

  const wsUuid = workspace.uuid
  ctx.info('Processing workspace', {
    workspaceUuid: workspace.uuid,
    workspaceName: workspace.name,
    workspaceUrl: workspace.url
  })

  if (maxLifetimeSec !== undefined) {
    setDBExtraOptions({ max_lifetime: maxLifetimeSec })
  }

  let progressMade = false
  let connectsCount = 0
  let retriesCount = 0
  let reconnecting = false
  let retrying = false
  let done = false
  let pg: ReturnType<typeof getDBClient> | undefined
  let pgClient: postgres.Sql | undefined

  while (!done && (connectsCount === 0 || retrying || (reconnecting && progressMade))) {
    try {
      if (connectsCount === 0 || reconnecting) {
        ctx.info(reconnecting ? '  Reconnecting...' : '  Connecting...')

        progressMade = false
        connectsCount++

        pg = getDBClient(dbUrl)
        pgClient = await pg.getClient()

        // Expect temp table with mapping to be created manually
        // Create mapping table
        await pgClient`
          CREATE TABLE IF NOT EXISTS temp_data.account_personid_mapping_v2 (
              workspace_id uuid,
              old_account_id text,
              new_person_id text,
              CONSTRAINT account_personid_mapping_v2_pk PRIMARY KEY (workspace_id, old_account_id)
          )
        `

        const [res] = await pgClient`SELECT COUNT(*) FROM temp_data.account_personid_mapping_v2`

        if (res.count === '0') {
          // Populate mapping table
          await pgClient`
            INSERT INTO temp_data.account_personid_mapping_v2
            WITH accounts as (
              SELECT 
                  tx."workspaceId" as workspace_id,
                  tx."objectId" as old_account_id,
                  COALESCE(
                      -- Get the latest email from updates
                      (
                          SELECT tx2.data->'operations'->>'email'
                          FROM model_tx tx2
                          WHERE tx2."objectId" = tx."objectId"
                              AND tx2."workspaceId" = tx."workspaceId"
                              AND tx2.data->>'objectClass' = 'contact:class:PersonAccount'
                              AND tx2.data->'operations'->>'email' IS NOT NULL
                          ORDER BY tx2."createdOn" DESC
                          LIMIT 1
                      ),
                      -- If no updates with email, get from create transaction
                      tx.data->'attributes'->>'email'
                  ) as latest_email
              FROM model_tx tx
              WHERE tx."_class" = 'core:class:TxCreateDoc'
              AND tx.data->>'objectClass' = 'contact:class:PersonAccount'
              AND tx.data->'attributes'->>'email' IS NOT null
            ),
            account_data as (
              SELECT
                workspace_id,
                old_account_id,
                CASE 
                    WHEN latest_email LIKE 'github:%' THEN lower(latest_email)
                    WHEN latest_email LIKE 'openid:%' THEN 'oidc:' || lower(substring(latest_email from 8))
                    ELSE 'email:' || lower(latest_email)
                END as social_key
              FROM accounts
              WHERE latest_email IS NOT NULL AND latest_email != ''
            )
            SELECT
              ad.workspace_id,
              ad.old_account_id,
              si."_id" as new_person_id
            FROM account_data ad
            JOIN global_account.social_id si ON si."key" = ad.social_key
            WHERE ad.old_account_id NOT IN ('core:account:System', 'core:account:ConfigUser')
            `
        }

        // Create progress table
        await pgClient`
          CREATE TABLE IF NOT EXISTS temp_data.account_personid_mapping_v2_progress (
              workspace_id text,
              domain text,
              field text,
              CONSTRAINT account_personid_mapping_v2_progress_pk PRIMARY KEY (workspace_id, domain, field)
          )
        `
      }

      if (pgClient == null) {
        throw new Error('Could not connect to postgres')
      }

      if (retrying) {
        retriesCount++
      }

      reconnecting = false
      retrying = false

      // Get list of tables to process
      const tables = await pgClient`
        SELECT table_name
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND column_name IN ('createdBy', 'modifiedBy')
        GROUP BY table_name
        HAVING COUNT(DISTINCT column_name) = 2
      `
      let filteredTables: Row[] = tables
      if (includeDomains != null && includeDomains.length > 0) {
        filteredTables = tables.filter((t) => includeDomains.includes(t.table_name))
      }
      if (excludeDomains != null && excludeDomains.length > 0) {
        filteredTables = filteredTables.filter((t) => !excludeDomains.includes(t.table_name))
      }

      ctx.info(`  Found ${filteredTables.length} tables to process`, {
        domains: filteredTables.map((t) => t.table_name)
      })

      // Process each table
      for (const table of filteredTables) {
        const tableName = table.table_name
        ctx.info(`  Processing table: ${tableName}`)

        const progress = await pgClient`
          SELECT field 
          FROM temp_data.account_personid_mapping_v2_progress
          WHERE workspace_id = ${wsUuid} AND domain = ${tableName}
        `

        const createdDone = !force && progress.some((p) => p.field === 'createdBy')
        const modifiedDone = !force && progress.some((p) => p.field === 'modifiedBy')

        // Get counts for logging
        const [createdByCount] = !createdDone
          ? await pgClient`
          SELECT COUNT(*) 
          FROM ${pgClient(tableName)} t
          JOIN temp_data.account_personid_mapping_v2 m ON t."workspaceId" = m.workspace_id AND t."createdBy" = m.old_account_id
          WHERE t."workspaceId" = ${wsUuid}
        `
          : [{ count: 0 }]

        const [modifiedByCount] = !modifiedDone
          ? await pgClient`
          SELECT COUNT(*) 
          FROM ${pgClient(tableName)} t
          JOIN temp_data.account_personid_mapping_v2 m ON t."workspaceId" = m.workspace_id AND t."modifiedBy" = m.old_account_id
          WHERE t."workspaceId" = ${wsUuid}
        `
          : [{ count: 0 }]

        ctx.info(
          `  Table ${tableName}: ${createdByCount.count} createdBy and ${modifiedByCount.count} modifiedBy records need updating`
        )

        if (createdByCount.count > 0) {
          ctx.info(`    Updating createdBy for ${tableName}...`)
          const startTime = Date.now()

          if (batchSize == null || batchSize > createdByCount.count) {
            ctx.info(`      Processing the whole table ${tableName}...`)
            await pgClient`
              UPDATE ${pgClient(tableName)}
              SET "createdBy" = m.new_person_id::text
              FROM temp_data.account_personid_mapping_v2 m
              WHERE ${pgClient(tableName)}."workspaceId" = ${wsUuid} AND ${pgClient(tableName)}."workspaceId" = m.workspace_id AND ${pgClient(tableName)}."createdBy" = m.old_account_id
            `
            progressMade = true
          } else {
            ctx.info(`      Processing the table ${tableName} in batches of ${batchSize}...`)
            let processed = 0
            while (true) {
              const res = await pgClient`
                UPDATE ${pgClient(tableName)}
                SET "createdBy" = m.new_person_id::text
                FROM temp_data.account_personid_mapping_v2 m
                WHERE ${pgClient(tableName)}."workspaceId" = ${wsUuid} AND ${pgClient(tableName)}."workspaceId" = m.workspace_id AND ${pgClient(tableName)}."createdBy" = m.old_account_id
                LIMIT ${batchSize}
              `
              progressMade = true
              if (res.count === 0) {
                break
              }
              processed += res.count
              const duration = (Date.now() - startTime) / 1000
              const rate = Math.round(processed / duration)
              ctx.info(
                `      Processing createdBy for ${tableName}: ${processed} rows in ${duration}s (${rate} rows/sec)`
              )
            }
          }

          await pgClient`INSERT INTO temp_data.account_personid_mapping_v2_progress (workspace_id, domain, field) VALUES (${wsUuid}, ${tableName}, 'createdBy') ON CONFLICT DO NOTHING`

          const duration = (Date.now() - startTime) / 1000
          const rate = Math.round(createdByCount.count / duration)
          ctx.info(
            `    Updated createdBy for ${tableName}: ${createdByCount.count} rows in ${duration}s (${rate} rows/sec)`
          )
        } else {
          if (createdDone) {
            ctx.info('    Skipping createdBy for table. Already done', { tableName })
          } else {
            await pgClient`INSERT INTO temp_data.account_personid_mapping_v2_progress (workspace_id, domain, field) VALUES (${wsUuid}, ${tableName}, 'createdBy') ON CONFLICT DO NOTHING`
          }
        }

        if (modifiedByCount.count > 0) {
          ctx.info(`    Updating modifiedBy for ${tableName}...`)
          const startTime = Date.now()

          if (batchSize == null || batchSize > modifiedByCount.count) {
            ctx.info(`    Processing the whole table ${tableName}...`)
            await pgClient`
              UPDATE ${pgClient(tableName)}
              SET "modifiedBy" = m.new_person_id::text
              FROM temp_data.account_personid_mapping_v2 m
              WHERE ${pgClient(tableName)}."workspaceId" = ${wsUuid} AND ${pgClient(tableName)}."workspaceId" = m.workspace_id AND ${pgClient(tableName)}."modifiedBy" = m.old_account_id
            `
            progressMade = true
          } else {
            ctx.info(`    Processing the table ${tableName} in batches of ${batchSize}...`)
            let processed = 0
            while (true) {
              const res = await pgClient`
                UPDATE ${pgClient(tableName)}
                SET "modifiedBy" = m.new_person_id::text
                FROM temp_data.account_personid_mapping_v2 m
                WHERE ${pgClient(tableName)}."workspaceId" = ${wsUuid} AND ${pgClient(tableName)}."workspaceId" = m.workspace_id AND ${pgClient(tableName)}."modifiedBy" = m.old_account_id
                LIMIT ${batchSize}
              `
              progressMade = true
              if (res.count === 0) {
                break
              }
              processed += res.count
              const duration = (Date.now() - startTime) / 1000
              const rate = Math.round(processed / duration)
              ctx.info(
                `    Processing modifiedBy for ${tableName}: ${processed} rows in ${duration}s (${rate} rows/sec)`
              )
            }
          }

          await pgClient`INSERT INTO temp_data.account_personid_mapping_v2_progress (workspace_id, domain, field) VALUES (${wsUuid}, ${tableName}, 'modifiedBy') ON CONFLICT DO NOTHING`

          const duration = (Date.now() - startTime) / 1000
          const rate = Math.round(modifiedByCount.count / duration)
          ctx.info(
            `    Updated modifiedBy for ${tableName}: ${modifiedByCount.count} rows in ${duration}s (${rate} rows/sec)`
          )
        } else {
          if (modifiedDone) {
            ctx.info('    Skipping modifiedBy for table. Already done', { tableName })
          } else {
            await pgClient`INSERT INTO temp_data.account_personid_mapping_v2_progress (workspace_id, domain, field) VALUES (${wsUuid}, ${tableName}, 'modifiedBy') ON CONFLICT DO NOTHING`
          }
        }
      }

      done = true
      ctx.info('Migration of created/modified completed successfully')
    } catch (err: any) {
      if (err.code === '40001' || err.code === '55P03') {
        // Retry transaction
        if (retriesCount === maxRetries) {
          ctx.error('Failed to migrate created/modified by. Max retries reached', { err })
        } else {
          retrying = true
          continue
        }
      }

      if (err.code === 'CONNECTION_CLOSED') {
        // Reconnect
        ctx.info('  Connection closed...')
        if (connectsCount === maxReconnects) {
          ctx.error('Failed to migrate created/modified by. Max reconnects reached', { err })
        } else {
          reconnecting = true
          continue
        }
      }

      throw err
    } finally {
      pg?.close()
    }
  }

  if (!done) {
    ctx.error('Failed to migrate created/modified by')
  }
}

async function fillAccountSocialKeyMapping (ctx: MeasureMetricsContext, pgClient: postgres.Sql): Promise<void> {
  ctx.info('Creating account to social key mapping table...')
  // Create schema
  await pgClient`CREATE SCHEMA IF NOT EXISTS temp_data`

  // Create mapping table
  await pgClient`
    CREATE TABLE IF NOT EXISTS temp_data.account_socialkey_mapping (
      workspace_id text,
      old_account_id text,
      new_social_key text,
      person_ref text,
      person_name text,
      INDEX idx_account_mapping_old_id (workspace_id, old_account_id)
  )
  `

  const [res] = await pgClient`SELECT COUNT(*) FROM temp_data.account_socialkey_mapping`

  if (res.count === '0') {
    // Populate mapping table
    await pgClient`
      INSERT INTO temp_data.account_socialkey_mapping
      WITH accounts AS (
        SELECT 
            tx."workspaceId",
            tx."objectId",
            COALESCE(
                -- Get the latest email from updates
                (
                    SELECT tx2.data->'operations'->>'email'
                    FROM model_tx tx2
                    WHERE tx2."objectId" = tx."objectId"
                        AND tx2."workspaceId" = tx."workspaceId"
                        AND tx2.data->>'objectClass' = 'contact:class:PersonAccount'
                        AND tx2.data->'operations'->>'email' IS NOT NULL
                    ORDER BY tx2."createdOn" DESC
                    LIMIT 1
                ),
                -- If no updates with email, get from create transaction
                tx.data->'attributes'->>'email'
            ) as latest_email,
            COALESCE(
                -- Get the latest person from updates
                (
                    SELECT (tx2.data->'operations'->>'person')::text
                    FROM model_tx tx2
                    WHERE tx2."objectId" = tx."objectId"
                        AND tx2."workspaceId" = tx."workspaceId"
                        AND tx2.data->>'objectClass' = 'contact:class:PersonAccount'
                        AND tx2.data->'operations'->>'person' IS NOT NULL
                    ORDER BY tx2."createdOn" DESC
                    LIMIT 1
                ),
                -- If no updates, get from create transaction
                (tx.data->'attributes'->>'person')::text
            ) as person_ref
        FROM model_tx tx
        WHERE tx."_class" = 'core:class:TxCreateDoc'
            AND tx.data->>'objectClass' = 'contact:class:PersonAccount'
            AND tx."objectId" NOT IN ('core:account:System', 'core:account:ConfigUser')
      )
      SELECT 
          a."workspaceId" as workspace_id,
          a."objectId" as old_account_id,
          CASE 
              WHEN a.latest_email LIKE 'github:%' THEN lower(a.latest_email)
              WHEN a.latest_email LIKE 'openid:%' THEN 'oidc:' || lower(substring(a.latest_email from 8))
              ELSE 'email:' || lower(a.latest_email)
          END as new_social_key,
          a.person_ref,
              c.data->>'name' as person_name
      FROM accounts as a
          LEFT JOIN public.contact c ON c."_id" = a.person_ref AND c."workspaceId" = a."workspaceId"
      WHERE a.latest_email IS NOT NULL 
          AND a.latest_email != ''
    `
  }
}

export async function migrateMergedAccounts (
  ctx: MeasureMetricsContext,
  dbUrl: string,
  accountDb: AccountDB
): Promise<void> {
  ctx.info('Migrating merged person accounts... ', {})

  if (!dbUrl.startsWith('postgresql')) {
    throw new Error('Only CockroachDB is supported')
  }

  const pg = getDBClient(dbUrl)
  const pgClient = await pg.getClient()
  const token = getToolToken()

  try {
    await fillAccountSocialKeyMapping(ctx, pgClient)

    const personsAccounts = await pgClient`
      SELECT workspace_id, person_ref, array_agg(new_social_key) as social_keys
      FROM temp_data.account_socialkey_mapping
      WHERE new_social_key != 'email:huly.ai.bot@hc.engineering'
      GROUP BY workspace_id, person_ref
      HAVING count(*) > 1 
    `

    ctx.info('Processing persons with merged accounts ', { count: personsAccounts.length })
    let processed = 0
    let errors = 0

    for (const personAccounts of personsAccounts) {
      try {
        const socialKeys = personAccounts.social_keys

        // Every social id in the old account might either be already in the new account or not in the accounts at all
        // So we want to
        // 1. Take the first social id with the existing account
        // 2. Merge all other accounts into the first one
        // 3. Create social ids for the first account which haven't had their own accounts
        const toAdd = new Set<SocialKey>()
        const toMergePersons = new Set<PersonUuid>()
        const toMergeAccounts = new Set<AccountUuid>()
        for (const socialKey of socialKeys) {
          const socialIdKey = parseSocialIdString(socialKey)
          const socialId = await findFullSocialIdBySocialKey(ctx, accountDb, null, token, { socialKey })
          const personUuid = socialId?.personUuid
          const accountUuid = (await findPersonBySocialKey(ctx, accountDb, null, token, {
            socialString: socialKey,
            requireAccount: true
          })) as AccountUuid

          if (personUuid == null) {
            toAdd.add(socialIdKey)
            // Means not attached to any account yet, simply add the social id to the primary account
          } else if (accountUuid == null) {
            toMergePersons.add(personUuid)
          } else {
            // This is the case when the social id is already attached to an account. Merge the accounts.
            toMergeAccounts.add(accountUuid)
          }
        }

        if (toMergeAccounts.size === 0) {
          // No existing accounts for the person's social ids. Normally this should never be the case.
          ctx.info('No existing accounts for person', personAccounts)
          continue
        }

        const toMergeAccountsArray = Array.from(toMergeAccounts)
        const primaryAccount = toMergeAccountsArray[0]

        for (let i = 1; i < toMergeAccountsArray.length; i++) {
          const accountToMerge = toMergeAccountsArray[i]
          await mergeSpecifiedAccounts(ctx, accountDb, null, token, {
            primaryAccount,
            secondaryAccount: accountToMerge
          })
        }

        const toMergePersonsArray = Array.from(toMergePersons)
        for (const personToMerge of toMergePersonsArray) {
          await mergeSpecifiedPersons(ctx, accountDb, null, token, {
            primaryPerson: primaryAccount,
            secondaryPerson: personToMerge
          })
        }

        for (const addTarget of Array.from(toAdd)) {
          await addSocialIdToPerson(ctx, accountDb, null, token, {
            person: primaryAccount,
            ...addTarget,
            confirmed: false
          })
        }

        processed++
        if (processed % 10 === 0) {
          ctx.info(`Processed ${processed} of ${personsAccounts.length} persons`)
        }
      } catch (err: any) {
        errors++
        ctx.error('Failed to merge accounts for person', { mergedGroup: personAccounts, err })
      }
    }

    ctx.info('Finished processing persons with merged accounts', { processed, of: personsAccounts.length, errors })
  } catch (err: any) {
    ctx.error('Failed to migrate merged accounts', { err })
  } finally {
    pg.close()
  }
}

export async function filterMergedAccountsInMembers (
  ctx: MeasureMetricsContext,
  dbUrl: string,
  accountDb: AccountDB
): Promise<void> {
  ctx.info('Filtering merged accounts in members... ', {})

  if (!dbUrl.startsWith('postgresql')) {
    throw new Error('Only CockroachDB is supported')
  }

  const pg = getDBClient(dbUrl)
  const pgClient = await pg.getClient()

  try {
    const mergedPersons = await accountDb.person.find({ migratedTo: { $ne: null } })

    if (mergedPersons.length === 0) {
      ctx.info('No merged persons to migrate')
      return
    }

    ctx.info('Merged persons found', { count: mergedPersons.length })

    const migrationMap = new Map<PersonUuid, PersonUuid>()
    for (const person of mergedPersons) {
      if (person.migratedTo == null) {
        continue
      }

      migrationMap.set(person.uuid, person.migratedTo)
    }

    const spacesToUpdate = await pgClient`
      SELECT "workspaceId", _id, members FROM ${pgClient(DOMAIN_SPACE)} WHERE members && ${pgClient.array(Array.from(migrationMap.keys()))}
    `

    ctx.info('Spaces to update', { count: spacesToUpdate.length })

    let processed = 0
    let errors = 0
    for (const space of spacesToUpdate) {
      try {
        const newMembers = new Set<PersonUuid>(space.members.map((it: PersonUuid) => migrationMap.get(it) ?? it))

        await pgClient`
          UPDATE ${pgClient(DOMAIN_SPACE)} SET members = ${pgClient.array(Array.from(newMembers))}
          WHERE "workspaceId" = ${space.workspaceId}
          AND "_id" = ${space._id}
        `
        processed++
      } catch (err: any) {
        errors++
        ctx.error('Failed to update space members', { space, err })
      }
    }

    ctx.info('Finished updating spaces', { processed, of: spacesToUpdate.length, errors })
  } finally {
    pg.close()
  }
}

export async function ensureGlobalPersonsForLocalAccounts (
  ctx: MeasureMetricsContext,
  dbUrl: string,
  accountDb: AccountDB
): Promise<void> {
  ctx.info('Ensuring global persons for local accounts... ', {})

  if (!dbUrl.startsWith('postgresql')) {
    throw new Error('Only CockroachDB is supported')
  }

  const pg = getDBClient(dbUrl)
  const pgClient = await pg.getClient()
  const token = getToolToken()

  try {
    await fillAccountSocialKeyMapping(ctx, pgClient)

    let count = 0
    let failed = 0
    const accountToSocialKey = await pgClient`SELECT * FROM temp_data.account_socialkey_mapping`
    for (const row of accountToSocialKey) {
      const newSocialKey = row.new_social_key
      const personName = row.person_name ?? ''

      const keyParts = newSocialKey.split(':')
      if (keyParts.length !== 2) {
        ctx.error('Invalid social key', row)
        continue
      }

      const keyType = keyParts[0]
      const keyValue = keyParts[1]

      if (!Object.values(SocialIdType).includes(keyType)) {
        ctx.error('Invalid social key type', row)
        continue
      }

      const firstName = getFirstName(personName)
      const lastName = getLastName(personName)
      const effectiveFirstName = firstName === '' ? keyValue : firstName

      try {
        await ensurePerson(ctx, accountDb, null, token, {
          socialType: keyType as SocialIdType,
          socialValue: keyValue,
          firstName: effectiveFirstName,
          lastName
        })
        count++
      } catch (err: any) {
        ctx.error('Failed to ensure person', {
          socialType: keyType as SocialIdType,
          socialValue: keyValue,
          firstName: effectiveFirstName,
          lastName
        })
        failed++
      }
    }

    ctx.info(`Successfully ensured ${count} people with failed count ${failed}`)
  } finally {
    pg.close()
  }
}

export async function migrateTrustedV6Accounts (
  ctx: MeasureMetricsContext,
  accountDB: AccountDB,
  mongoDb: v6MongoAccountDB,
  dryRun: boolean,
  skipWorkspaces: Set<string>,
  conflictSuffix?: string
): Promise<void> {
  // Mapping between <ObjectId, UUID>
  const accountsIdToUuid: Record<string, AccountUuid> = {}
  // Mapping between <email, UUID>
  const accountsEmailToUuid: Record<string, AccountUuid> = {}
  // Mapping between <OldId, UUID>
  const workspacesIdToUuid: Record<WorkspaceDataId, WorkspaceUuid> = {}

  console.log('Migrating accounts database...')
  let accountsProcessed = 0
  const accountsCursor = mongoDb.account.findCursor({})
  try {
    while (await accountsCursor.hasNext()) {
      const account = await accountsCursor.next()
      if (account == null) {
        break
      }

      try {
        const accountUuid = await migrateAccount(account, accountDB, dryRun)
        if (accountUuid == null) {
          console.log('Account not migrated', account)
          continue
        }
        accountsIdToUuid[account._id.toString()] = accountUuid
        accountsEmailToUuid[account.email] = accountUuid

        accountsProcessed++
        if (accountsProcessed % 100 === 0) {
          console.log('Processed accounts:', accountsProcessed)
        }
      } catch (err: any) {
        console.log('Failed to migrate account', account._id, account.email, err)
      }
    }
  } catch (err: any) {
    console.log('Failed to migrate accounts', err)
  } finally {
    await accountsCursor.close()
  }

  console.log('Total accounts processed:', accountsProcessed)

  let processedWorkspaces = 0
  const workspacesCursor = mongoDb.workspace.findCursor({})
  try {
    while (await workspacesCursor.hasNext()) {
      const workspace = await workspacesCursor.next()
      if (workspace == null) {
        break
      }

      if (
        skipWorkspaces.has(workspace.workspace) ||
        (workspace.workspaceUrl != null && skipWorkspaces.has(workspace.workspaceUrl))
      ) {
        console.log('Skipping workspace', workspace.workspace, workspace.workspaceUrl)
        continue
      }

      try {
        const [workspaceUuid] =
          (await migrateWorkspace(
            workspace,
            accountDB,
            accountsIdToUuid,
            accountsEmailToUuid,
            dryRun,
            'manual-creation',
            conflictSuffix
          )) ?? []

        if (workspaceUuid !== undefined) {
          workspacesIdToUuid[workspace.workspace] = workspaceUuid
        }
        processedWorkspaces++
        if (processedWorkspaces % 100 === 0) {
          console.log('Processed workspaces:', processedWorkspaces)
        }
      } catch (err: any) {
        console.log('Failed to migrate workspace', workspace.workspaceUrl, workspace.workspace, err)
      }
    }
  } catch (err: any) {
    console.log('Failed to migrate workspaces', err)
  } finally {
    await workspacesCursor.close()
  }

  console.log('Total workspaces processed:', processedWorkspaces)
  console.log('Total workspaces created/ensured:', Object.values(workspacesIdToUuid).length)

  let invitesProcessed = 0
  const invitesCursor = mongoDb.invite.findCursor({})
  try {
    while (await invitesCursor.hasNext()) {
      const invite = await invitesCursor.next()
      if (invite == null) {
        break
      }

      try {
        const workspaceUuid = workspacesIdToUuid[invite.workspace.name]
        if (workspaceUuid === undefined) {
          console.log('No workspace with id', invite.workspace.name, 'found for invite', invite._id)
          continue
        }

        const existing = await accountDB.invite.findOne({ migratedFrom: invite._id.toString() })
        if (existing != null) {
          continue
        }

        const inviteRecord = {
          migratedFrom: invite._id.toString(),
          workspaceUuid,
          expiresOn: invite.exp,
          emailPattern: invite.emailMask,
          remainingUses: invite.limit,
          role: invite.role ?? AccountRole.User
        }

        if (!dryRun) {
          await accountDB.invite.insertOne(inviteRecord)
        } else {
          console.log('Creating invite record', inviteRecord)
        }

        invitesProcessed++
        if (invitesProcessed % 100 === 0) {
          console.log('Processed invites:', invitesProcessed)
        }
      } catch (err: any) {
        console.log('Failed to migrate invite', invite._id, err)
      }
    }
  } catch (err: any) {
    console.log('Failed to migrate invites', err)
  } finally {
    await invitesCursor.close()
  }

  console.log('Total invites processed:', invitesProcessed)
}

async function migrateAccount (
  account: OldAccount,
  accountDB: AccountDB,
  dryRun = true
): Promise<AccountUuid | undefined> {
  let primaryKey: SocialKey
  let secondaryKey: SocialKey | undefined

  if (account.githubId != null) {
    if (account.githubUser == null) {
      console.log('No github user found for github id', account.githubId)
      return
    }

    primaryKey = {
      type: SocialIdType.GITHUB,
      value: account.githubUser
    }
    secondaryKey = !account.email.startsWith('github:')
      ? {
          type: SocialIdType.EMAIL,
          value: account.email
        }
      : undefined
  } else if (account.openId != null) {
    primaryKey = {
      type: SocialIdType.OIDC,
      value: account.openId
    }
    secondaryKey = !account.email.startsWith('openid:')
      ? {
          type: SocialIdType.EMAIL,
          value: account.email
        }
      : undefined
  } else {
    primaryKey = {
      type: SocialIdType.EMAIL,
      value: account.email
    }
  }

  let personUuid: PersonUuid
  const verified = account.confirmed === true ? { verifiedOn: Date.now() } : {}

  const existing = await accountDB.socialId.findOne(primaryKey)
  if (existing == null) {
    // Create new global person
    const personRecord = {
      firstName: account.first,
      lastName: account.last
    }

    if (!dryRun) {
      personUuid = await accountDB.person.insertOne(personRecord)
    } else {
      console.log('Creating person record', personRecord)
      personUuid = generateUuid() as PersonUuid
    }

    const socialIdRecord = {
      ...primaryKey,
      personUuid,
      ...verified
    }

    if (!dryRun) {
      await accountDB.socialId.insertOne(socialIdRecord)
    } else {
      console.log('Creating social id record', socialIdRecord)
    }

    if (!dryRun) {
      await createAccount(accountDB, personUuid, account.confirmed, false, account.createdOn)
    } else {
      console.log('Creating account record', { personUuid, confirmed: account.confirmed })
    }

    if (account.hash != null && account.salt != null) {
      if (!dryRun) {
        await accountDB.setPassword(personUuid as AccountUuid, account.hash, account.salt)
      } else {
        console.log('Updating account password', { personUuid })
      }
    }
  } else {
    personUuid = existing.personUuid

    // if there's no existing account, create a new one
    const existingAcc = await accountDB.account.findOne({ uuid: personUuid as AccountUuid })
    if (existingAcc == null) {
      if (!dryRun) {
        await createAccount(accountDB, personUuid, account.confirmed, false, account.createdOn)
      } else {
        console.log('Creating account record', { personUuid, confirmed: account.confirmed })
      }

      if (account.hash != null && account.salt != null) {
        if (!dryRun) {
          await accountDB.setPassword(personUuid as AccountUuid, account.hash, account.salt)
        } else {
          console.log('Updating account password', { personUuid })
        }
      }
    }
  }

  if (secondaryKey != null) {
    const existingSecondary = await accountDB.socialId.findOne(secondaryKey)
    if (existingSecondary == null) {
      if (!dryRun) {
        await accountDB.socialId.insertOne({
          ...secondaryKey,
          personUuid,
          ...verified
        })
      } else {
        console.log('Creating secondary social id', { personUuid, confirmed: account.confirmed, secondaryKey })
      }
    }
  }

  return personUuid as AccountUuid
}

async function migrateWorkspace (
  workspace: OldWorkspace,
  accountDB: AccountDB,
  accountsIdToUuid: Record<string, AccountUuid>,
  accountsEmailToUuid: Record<string, AccountUuid>,
  dryRun = true,
  forcedMode?: WorkspaceMode,
  conflictSuffix?: string,
  throwExisting?: boolean,
  region?: string,
  branding?: string
): Promise<[WorkspaceUuid, string] | undefined> {
  if (workspace.workspaceUrl == null) {
    console.log('No workspace url, skipping', workspace.workspace)
    return
  }

  const createdBy = workspace.createdBy !== undefined ? accountsEmailToUuid[workspace.createdBy] : undefined
  if (createdBy === undefined) {
    console.log('No account found for workspace', workspace.workspace, 'created by', workspace.createdBy)
  }

  let existingByUrl = await accountDB.workspace.findOne({ url: workspace.workspaceUrl })
  const existingByUuid = await accountDB.workspace.findOne({ uuid: workspace.uuid })

  let workspaceUuid: WorkspaceUuid
  let url = workspace.workspaceUrl

  if (existingByUuid == null) {
    if (existingByUrl != null && (conflictSuffix ?? '') !== '') {
      url = `${url}-${conflictSuffix}`
      existingByUrl = await accountDB.workspace.findOne({ url })
    }
    if (existingByUrl != null) {
      console.log('Conflicting workspace url', url)
      // generate new url
      url = `${url}-${generateId('-')}`
      console.log('Generating new url', url)
    }

    const workspaceRecord = {
      uuid: workspace.uuid,
      name: workspace.workspaceName,
      url,
      dataId: workspace.workspace,
      branding: branding ?? workspace.branding,
      region: region ?? workspace.region,
      createdBy,
      billingAccount: createdBy,
      createdOn: workspace.createdOn ?? Date.now()
    }

    if (!dryRun) {
      workspaceUuid = await accountDB.workspace.insertOne(workspaceRecord)
    } else {
      console.log('Creating workspace record', workspaceRecord)
      workspaceUuid = generateUuid() as WorkspaceUuid
    }
  } else {
    if (throwExisting === true) {
      throw new Error(`Workspace with the same uuid ${workspace.uuid} already exists`)
    }

    workspaceUuid = existingByUuid.uuid
  }

  const existingStatus = await accountDB.workspaceStatus.findOne({ workspaceUuid })

  if (existingStatus == null) {
    const statusRecord = {
      workspaceUuid,
      mode: forcedMode ?? workspace.mode,
      processingProgress: workspace.progress !== undefined ? Math.floor(workspace.progress) : undefined,
      versionMajor: workspace.version?.major,
      versionMinor: workspace.version?.minor,
      versionPatch: workspace.version?.patch,
      lastProcessingTime: workspace.lastProcessingTime,
      lastVisit: workspace.lastVisit,
      isDisabled: workspace.disabled,
      processingAttempts: workspace.attempts,
      processingMessage: workspace.message,
      backupInfo: workspace.backupInfo
    }

    if (!dryRun) {
      await accountDB.workspaceStatus.insertOne(statusRecord)
    } else {
      console.log('Creating workspace status record', statusRecord)
    }
  }

  const uniqueAccounts = Array.from(new Set((workspace.accounts ?? []).map((it) => it.toString())))
  const existingMembers = new Set((await accountDB.getWorkspaceMembers(workspaceUuid)).map((mi) => mi.person))
  for (const member of uniqueAccounts) {
    const accountUuid = accountsIdToUuid[member]

    if (accountUuid === undefined) {
      console.log('No account found for workspace', workspace.workspace, 'member', member)
      continue
    }

    if (existingMembers.has(accountUuid)) {
      continue
    }

    if (!dryRun) {
      // Actual roles are being set in workspace migration
      await accountDB.assignWorkspace(accountUuid, workspaceUuid, AccountRole.Guest)
    } else {
      console.log('Assigning account', member, accountUuid, 'to workspace', workspaceUuid)
    }
  }

  return [workspaceUuid, url]
}

export async function restoreFromv6All (
  ctx: MeasureMetricsContext,
  accountDB: AccountDB,
  dirName: string,
  txes: Tx[],
  dbUrl: string
): Promise<void> {
  ctx.info('Restoring from v6 dump...')
  const v6AccountsFile = 'account.accounts.json'
  const v6WorkspacesFile = 'account.workspaces.json'
  const v6InvitesFile = 'account.invites.json'

  const storage = await createFileBackupStorage(dirName)

  if (!(await storage.exists(v6AccountsFile))) {
    ctx.error('file not pressent', { file: v6AccountsFile })
    throw new Error(`${v6AccountsFile} should present to restore`)
  }
  if (!(await storage.exists(v6WorkspacesFile))) {
    ctx.error('file not pressent', { file: v6WorkspacesFile })
    throw new Error(`${v6WorkspacesFile} should present to restore`)
  }
  if (!(await storage.exists(v6InvitesFile))) {
    ctx.error('file not pressent', { file: v6InvitesFile })
    throw new Error(`${v6InvitesFile} should present to restore`)
  }

  try {
    const v6AccountsRaw = JSON.parse((await storage.loadFile(v6AccountsFile)).toString())
    const v6Workspaces = JSON.parse((await storage.loadFile(v6WorkspacesFile)).toString()) as OldWorkspace[]
    const v6Invites = JSON.parse((await storage.loadFile(v6InvitesFile)).toString())

    const v6Accounts: OldAccount[] = []
    for (const rawAccount of v6AccountsRaw) {
      const hashTypedArray = rawAccount.hash != null ? new Uint8Array(rawAccount.hash.data) : null
      const saltTypedArray = new Uint8Array(rawAccount.salt.data)

      v6Accounts.push({
        ...rawAccount,
        hash: hashTypedArray != null ? Buffer.from(hashTypedArray.buffer) : null,
        salt: Buffer.from(saltTypedArray.buffer)
      })
    }

    // Generate UUIDs for workspaces where missing
    for (const workspace of v6Workspaces) {
      if (workspace.uuid == null) {
        workspace.uuid = generateUuid() as WorkspaceUuid
      }
    }

    // Mapping between <ObjectId, UUID>
    const accountsIdToUuid: Record<string, AccountUuid> = {}
    // Mapping between <email, UUID>
    const accountsEmailToUuid: Record<string, AccountUuid> = {}
    // Mapping between <OldId, UUID>
    const workspacesIdToUuid: Record<WorkspaceDataId, WorkspaceUuid> = {}

    ctx.info('Restoring accounts database...')

    let accountsProcessed = 0
    for (const account of v6Accounts) {
      try {
        const accountUuid = await migrateAccount(account, accountDB, false)
        if (accountUuid == null) {
          ctx.warn('Account not restored', account)
          continue
        }

        accountsIdToUuid[account._id.toString()] = accountUuid
        accountsEmailToUuid[account.email] = accountUuid

        accountsProcessed++
        if (accountsProcessed % 100 === 0) {
          ctx.info('Processed accounts:', { accountsProcessed })
        }
      } catch (err: any) {
        ctx.error('Failed to restore account', { _id: account._id, email: account.email, err })
      }
    }

    ctx.info('Total accounts processed:', { accountsProcessed })

    let processedWorkspaces = 0
    const activeWorkspaces = new Set<WorkspaceUuid>()
    for (const workspace of v6Workspaces) {
      const isActive = workspace.mode === 'active'

      try {
        // Create active workspaces as archived until they are actually restored
        const [workspaceUuid] =
          (await migrateWorkspace(
            workspace,
            accountDB,
            accountsIdToUuid,
            accountsEmailToUuid,
            false,
            isActive ? 'archived' : undefined
          )) ?? []

        if (workspaceUuid !== undefined) {
          workspacesIdToUuid[workspace.workspace] = workspaceUuid

          if (isActive) {
            activeWorkspaces.add(workspaceUuid)
          }
        }
        processedWorkspaces++
        if (processedWorkspaces % 100 === 0) {
          ctx.info('Processed workspaces:', { processedWorkspaces })
        }
      } catch (err: any) {
        ctx.error('Failed to restore workspace', { url: workspace.workspaceUrl, workspace: workspace.workspace, err })
      }
    }

    ctx.info('Total workspaces processed:', { processedWorkspaces })
    ctx.info('Total workspaces created/ensured:', { count: Object.values(workspacesIdToUuid).length })

    let invitesProcessed = 0
    for (const invite of v6Invites) {
      try {
        const workspaceUuid = workspacesIdToUuid[invite.workspace.name]
        if (workspaceUuid === undefined) {
          ctx.error(`No workspace with id ${invite.workspace.name} found for invite ${invite._id}`)
          continue
        }

        const existing = await accountDB.invite.findOne({ migratedFrom: invite._id.toString() })
        if (existing != null) {
          continue
        }

        const inviteRecord = {
          migratedFrom: invite._id.toString(),
          workspaceUuid,
          expiresOn: invite.exp,
          emailPattern: invite.emailMask,
          remainingUses: invite.limit,
          role: invite.role ?? AccountRole.User
        }

        await accountDB.invite.insertOne(inviteRecord)

        invitesProcessed++
        if (invitesProcessed % 100 === 0) {
          ctx.info('Processed invites:', { invitesProcessed })
        }
      } catch (err: any) {
        ctx.error('Failed to restore invite', { _id: invite._id, err })
      }
    }

    ctx.info('Total invites processed:', { invitesProcessed })
    ctx.info('Successfully restored accounts backup')
    ctx.info('Restoring workspaces...')

    for (const workspace of v6Workspaces) {
      const dataId = workspace.workspace
      const url = workspace.workspaceUrl
      const uuid = workspacesIdToUuid[dataId]

      if (url == null) {
        ctx.error('Workspace url not set', { dataId })
        continue
      }

      if (uuid == null) {
        ctx.error('Workspace uuid not found', { dataId })
        continue
      }

      const wsIds = {
        uuid,
        dataId,
        url
      }

      const storage = await createFileBackupStorage(`${dirName}/${dataId}`)
      const storageConfig = storageConfigFromEnv()

      const queue = getPlatformQueue('tool', workspace.region)
      const wsProducer = queue.getProducer<QueueWorkspaceMessage>(ctx, QueueTopic.Workspace)

      await wsProducer.send(ctx, uuid, [workspaceEvents.restoring()])

      const workspaceStorage: StorageAdapter = buildStorageFromConfig(storageConfig)

      let pipeline: Pipeline | undefined
      try {
        pipeline = await createBackupPipeline(ctx, dbUrl, txes, {
          externalStorage: workspaceStorage,
          usePassedCtx: true
        })(ctx, wsIds, createEmptyBroadcastOps(), null)
        if (pipeline === undefined) {
          ctx.error('failed to restore, pipeline is undefined', { dataId })
          return
        }
        await sendTransactorEvent(uuid, 'force-maintenance')

        await restore(ctx, pipeline, wsIds, storage, {
          date: -1,
          merge: false,
          parallel: 1,
          recheck: false
        })

        await sendTransactorEvent(uuid, 'force-close')

        ctx.info('workspace restored', { dataId })
        await wsProducer.send(ctx, uuid, [workspaceEvents.restored()])

        if (activeWorkspaces.has(uuid)) {
          // set workspace back to active
          await accountDB.workspaceStatus.update({ workspaceUuid: uuid }, { mode: 'active' })
        }
      } catch (err) {
        ctx.error('failed to restore workspace', { dataId, err })
      } finally {
        await pipeline?.close()
        await queue.shutdown()
        await workspaceStorage?.close()
      }
    }

    ctx.info('Successfully restored v6 dump')
  } catch (err: any) {
    ctx.error('Failed to restore v6 dump', { err })
  }
}

export async function restoreTrustedV6Workspace (
  ctx: MeasureMetricsContext,
  accountDB: AccountDB,
  workspace: OldWorkspace,
  accounts: OldAccount[],
  invites: any[],
  backupWsStorage: BackupStorage,
  workspaceStorage: StorageAdapter,
  txes: Tx[],
  dbUrl: string,
  opts?: {
    conflictSuffix?: string
    region?: string
    branding?: string
    force?: boolean
  }
): Promise<void> {
  const { conflictSuffix, region, branding, force } = opts ?? {}
  // Mapping between <ObjectId, UUID>
  const accountsIdToUuid: Record<string, AccountUuid> = {}
  // Mapping between <email, UUID>
  const accountsEmailToUuid: Record<string, AccountUuid> = {}
  let workspaceUuid: WorkspaceUuid | undefined
  let newWorkspaceUrl: string | undefined

  ctx.info('Restoring workspace accounts...')

  let accountsProcessed = 0
  for (const account of accounts) {
    try {
      const accountUuid = await migrateAccount(account, accountDB, false)
      if (accountUuid == null) {
        ctx.warn('Account not restored', account)
        continue
      }

      accountsIdToUuid[account._id.toString()] = accountUuid
      accountsEmailToUuid[account.email] = accountUuid

      accountsProcessed++
      if (accountsProcessed % 100 === 0) {
        ctx.info('Processed accounts:', { accountsProcessed })
      }
    } catch (err: any) {
      ctx.error('Failed to restore account', { _id: account._id, email: account.email, err })
    }
  }

  ctx.info('Total accounts processed:', { accountsProcessed })

  const oldMode = workspace.mode

  try {
    // Create workspace with manual-creation mode until it is restored
    ;[workspaceUuid, newWorkspaceUrl] =
      (await migrateWorkspace(
        workspace,
        accountDB,
        accountsIdToUuid,
        accountsEmailToUuid,
        false,
        'manual-creation',
        conflictSuffix,
        force !== true,
        region,
        branding
      )) ?? []

    if (workspaceUuid === undefined) {
      ctx.error('Workspace uuid not set', { workspace: workspace.workspace })
      throw new Error(`Workspace uuid not set ${workspace.workspace}`)
    }

    if (newWorkspaceUrl == null) {
      ctx.error('Workspace url not set', { workspace: workspace.workspace })
      throw new Error(`Workspace url not set ${workspace.workspace}`)
    }

    let invitesProcessed = 0
    for (const invite of invites) {
      try {
        if (workspace.workspace !== invite.workspace.name) {
          ctx.error(
            `Invite workspace ${invite.workspace.name} doesn't match workspace being restored ${workspace.workspace}`
          )
          continue
        }

        const existing = await accountDB.invite.findOne({ migratedFrom: invite._id.toString() })
        if (existing != null) {
          continue
        }

        const inviteRecord = {
          migratedFrom: invite._id.toString(),
          workspaceUuid,
          expiresOn: invite.exp,
          emailPattern: invite.emailMask,
          remainingUses: invite.limit,
          role: invite.role ?? AccountRole.User
        }

        await accountDB.invite.insertOne(inviteRecord)

        invitesProcessed++
        if (invitesProcessed % 100 === 0) {
          ctx.info('Processed invites:', { invitesProcessed })
        }
      } catch (err: any) {
        ctx.error('Failed to restore invite', { _id: invite._id, err })
      }
    }

    ctx.info('Total invites processed:', { invitesProcessed })

    const dataId = workspace.workspace
    const url = newWorkspaceUrl
    const uuid = workspaceUuid

    const wsIds = {
      uuid,
      dataId,
      url
    }

    const queue = getPlatformQueue('tool', workspace.region)
    const wsProducer = queue.getProducer<QueueWorkspaceMessage>(ctx, QueueTopic.Workspace)

    await wsProducer.send(ctx, uuid, [workspaceEvents.restoring()])

    let pipeline: Pipeline | undefined
    try {
      pipeline = await createBackupPipeline(ctx, dbUrl, txes, {
        externalStorage: workspaceStorage,
        usePassedCtx: true
      })(ctx, wsIds, createEmptyBroadcastOps(), null)
      if (pipeline === undefined) {
        ctx.error('failed to restore, pipeline is undefined', { dataId })
        return
      }
      await sendTransactorEvent(uuid, 'force-maintenance')

      await restore(ctx, pipeline, wsIds, backupWsStorage, {
        date: -1,
        merge: false,
        parallel: 1,
        recheck: false
      })

      await sendTransactorEvent(uuid, 'force-close')

      ctx.info('workspace restored', { dataId })
      await wsProducer.send(ctx, uuid, [workspaceEvents.restored()])

      await accountDB.workspaceStatus.update({ workspaceUuid: uuid }, { mode: oldMode })
    } catch (err) {
      ctx.error('failed to restore backup of the workspace', { url, dataId, err })
    } finally {
      await pipeline?.close()
      await queue.shutdown()
      await workspaceStorage?.close()
    }
  } catch (err: any) {
    ctx.error('Failed to restore workspace', { url: workspace.workspaceUrl, workspace: workspace.workspace, err })
  }
}
