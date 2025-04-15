/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  type AccountDB,
  type MongoAccountDB,
  type Workspace,
  ensurePerson
} from '@hcengineering/account'
import { getFirstName, getLastName } from '@hcengineering/contact'
import {
  systemAccountUuid,
  type BackupClient,
  type Client,
  type Doc,
  MeasureMetricsContext,
  SocialIdType
} from '@hcengineering/core'
import { getMongoClient, getWorkspaceMongoDB } from '@hcengineering/mongo'
import {
  convertDoc,
  createTables,
  getDBClient,
  getDocFieldsByDomains,
  retryTxn,
  translateDomain
} from '@hcengineering/postgres'
import { type DBDoc } from '@hcengineering/postgres/types/utils'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { sharedPipelineContextVars } from '@hcengineering/server-pipeline'
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'
import { type MongoClient } from 'mongodb'
import type postgres from 'postgres'
import { getToolToken } from './utils'

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
  const pg = getDBClient(sharedPipelineContextVars, dbUrl)
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
  const pg = getDBClient(sharedPipelineContextVars, dbUrl)
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

  ctx.info('Starting migration of persons...')
  const personsCursor = mdb.person.findCursor({})
  try {
    let personsCount = 0
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

        await pgDb.person.insertOne(person)
        personsCount++
        if (personsCount % 100 === 0) {
          ctx.info(`Migrated ${personsCount} persons...`)
        }
      }
    }
    ctx.info(`Migrated ${personsCount} persons`)
  } finally {
    await personsCursor.close()
  }

  ctx.info('Starting migration of accounts...')
  const accountsCursor = mdb.account.findCursor({})
  try {
    let accountsCount = 0
    while (await accountsCursor.hasNext()) {
      const account = await accountsCursor.next()
      if (account == null) break

      const exists = await pgDb.account.findOne({ uuid: account.uuid })
      if (exists == null) {
        const { hash, salt } = account

        delete account.hash
        delete account.salt

        await pgDb.account.insertOne(account)
        if (hash != null && salt != null) {
          await pgDb.setPassword(account.uuid, hash, salt)
        }
        accountsCount++
        if (accountsCount % 100 === 0) {
          ctx.info(`Migrated ${accountsCount} accounts...`)
        }
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
    while (await socialIdsCursor.hasNext()) {
      const socialId = await socialIdsCursor.next()
      if (socialId == null) break

      const exists = await pgDb.socialId.findOne({ key: socialId.key })
      if (exists == null) {
        delete (socialId as any).key
        delete (socialId as any).id
        delete (socialId as any)._id // Types of _id are incompatible

        await pgDb.socialId.insertOne(socialId)
        socialIdsCount++
        if (socialIdsCount % 100 === 0) {
          ctx.info(`Migrated ${socialIdsCount} social IDs...`)
        }
      }
    }
    ctx.info(`Migrated ${socialIdsCount} social IDs`)
  } finally {
    await socialIdsCursor.close()
  }

  ctx.info('Starting migration of account events...')
  const accountEventsCursor = mdb.accountEvent.findCursor({})
  try {
    let eventsCount = 0
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

        await pgDb.accountEvent.insertOne(accountEvent)
        eventsCount++
        if (eventsCount % 100 === 0) {
          ctx.info(`Migrated ${eventsCount} account events...`)
        }
      }
    }
    ctx.info(`Migrated ${eventsCount} account events`)
  } finally {
    await accountEventsCursor.close()
  }

  ctx.info('Starting migration of workspaces...')
  const workspacesCursor = mdb.workspace.findCursor({})
  try {
    let workspacesCount = 0
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
        delete workspace.createdOn
      }

      await pgDb.createWorkspace(workspace, status)
      workspacesCount++

      const members = await mdb.getWorkspaceMembers(workspace.uuid)
      for (const member of members) {
        const alreadyAssigned = await pgDb.getWorkspaceRole(member.person, workspace.uuid)
        if (alreadyAssigned != null) continue

        await pgDb.assignWorkspace(member.person, workspace.uuid, member.role)
        membersCount++
      }

      if (workspacesCount % 100 === 0) {
        ctx.info(`Migrated ${workspacesCount} workspaces...`)
      }
    }
    ctx.info(`Migrated ${workspacesCount} workspaces with ${membersCount} member assignments`)
  } finally {
    await workspacesCursor.close()
  }

  ctx.info('Starting migration of invites...')
  const invitesCursor = mdb.invite.findCursor({})
  try {
    let invitesCount = 0
    while (await invitesCursor.hasNext()) {
      const invite = await invitesCursor.next()
      if (invite == null) break
      if (invite.migratedFrom == null) {
        invite.migratedFrom = invite.id
      }

      delete (invite as any).id

      const exists = await pgDb.invite.findOne({ migratedFrom: invite.migratedFrom })
      if (exists == null) {
        await pgDb.invite.insertOne(invite)
        invitesCount++
        if (invitesCount % 100 === 0) {
          ctx.info(`Migrated ${invitesCount} invites...`)
        }
      }
    }
    ctx.info(`Migrated ${invitesCount} invites`)
  } finally {
    await invitesCursor.close()
  }

  ctx.info('Account database migration completed')
}

export async function migrateCreatedModifiedBy (ctx: MeasureMetricsContext, dbUrl: string): Promise<void> {
  if (!dbUrl.startsWith('postgresql')) {
    throw new Error('Only CockroachDB is supported')
  }

  const pg = getDBClient(sharedPipelineContextVars, dbUrl)
  const pgClient = await pg.getClient()
  try {
    ctx.info('Creating account to person id mapping table...')
    // Create schema
    await pgClient`CREATE SCHEMA IF NOT EXISTS temp_data`

    // Create mapping table
    await pgClient`
      CREATE TABLE IF NOT EXISTS temp_data.account_personid_mapping (
          old_account_id text,
          new_person_id text,
          INDEX idx_account_mapping_old_id (old_account_id)
      )
    `

    // Populate mapping table
    await pgClient`
      INSERT INTO temp_data.account_personid_mapping
      WITH account_data AS (
          SELECT 
              tx."objectId" as old_account_id,
              CASE 
                  WHEN tx.data->'attributes'->>'email' LIKE 'github:%' THEN lower(tx.data->'attributes'->>'email')
                  WHEN tx.data->'attributes'->>'email' LIKE 'openid:%' THEN 'oidc:' || lower(substring(tx.data->'attributes'->>'email' from 8))
                  ELSE 'email:' || lower(tx.data->'attributes'->>'email')
              END as social_key
          FROM model_tx tx
          WHERE tx."_class" = 'core:class:TxCreateDoc'
          AND tx.data->>'objectClass' = 'contact:class:PersonAccount'
          AND tx.data->'attributes'->>'email' IS NOT NULL
      )
      SELECT 
          ad.old_account_id,
          si."_id" as new_person_id
      FROM account_data ad
      JOIN global_account.social_id si ON si."key" = ad.social_key
      WHERE ad.old_account_id NOT IN ('core:account:System', 'core:account:ConfigUser')
    `

    // Get list of tables to process
    const tables = await pgClient`
      SELECT table_name
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND column_name IN ('createdBy', 'modifiedBy')
      GROUP BY table_name
    `

    // Process each table
    for (const table of tables) {
      const tableName = table.table_name
      ctx.info(`Processing table: ${tableName}`)

      // Get counts for logging
      const [createdByCount] = await pgClient`
        SELECT COUNT(*) 
        FROM ${pgClient(tableName)} 
        WHERE "createdBy" IN (SELECT old_account_id FROM temp_data.account_personid_mapping)
      `
      const [modifiedByCount] = await pgClient`
        SELECT COUNT(*) 
        FROM ${pgClient(tableName)} 
        WHERE "modifiedBy" IN (SELECT old_account_id FROM temp_data.account_personid_mapping)
      `

      ctx.info(
        `Table ${tableName}: ${createdByCount.count} createdBy and ${modifiedByCount.count} modifiedBy records need updating`
      )

      // Update createdBy
      if (createdByCount.count > 0) {
        ctx.info(`Updating createdBy for ${tableName}...`)
        const startTime = Date.now()
        await pgClient`
          UPDATE ${pgClient(tableName)}
          SET "createdBy" = m.new_person_id::text
          FROM temp_data.account_personid_mapping m
          WHERE ${pgClient(tableName)}."createdBy" = m.old_account_id
        `
        const duration = (Date.now() - startTime) / 1000
        const rate = Math.round(createdByCount.count / duration)
        ctx.info(`Updated createdBy for ${tableName}: ${createdByCount.count} rows in ${duration}s (${rate} rows/sec)`)
      }

      // Update modifiedBy
      if (modifiedByCount.count > 0) {
        ctx.info(`Updating modifiedBy for ${tableName}...`)
        const startTime = Date.now()
        await pgClient`
          UPDATE ${pgClient(tableName)}
          SET "modifiedBy" = m.new_person_id::text
          FROM temp_data.account_personid_mapping m
          WHERE ${pgClient(tableName)}."modifiedBy" = m.old_account_id
        `
        const duration = (Date.now() - startTime) / 1000
        const rate = Math.round(modifiedByCount.count / duration)
        ctx.info(
          `Updated modifiedBy for ${tableName}: ${modifiedByCount.count} rows in ${duration}s (${rate} rows/sec)`
        )
      }
    }

    ctx.info('Migration completed successfully')
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

  const pg = getDBClient(sharedPipelineContextVars, dbUrl)
  const pgClient = await pg.getClient()
  const token = getToolToken()

  try {
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
        WITH person_refs AS (
            SELECT 
              tx."workspaceId" as workspace_id,
              tx."objectId" as account_id,
              CASE 
                  WHEN tx.data->'attributes'->>'email' LIKE 'github:%' THEN lower(tx.data->'attributes'->>'email')
                  WHEN tx.data->'attributes'->>'email' LIKE 'openid:%' THEN 'oidc:' || lower(substring(tx.data->'attributes'->>'email' from 8))
                  ELSE 'email:' || lower(tx.data->'attributes'->>'email')
              END as new_social_key,
              COALESCE(
                -- Try to get person from most recent update
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
            AND tx.data->'attributes'->>'email' IS NOT NULL
            AND tx.data->'attributes'->>'email' != ''
            AND tx."objectId" NOT IN ('core:account:System', 'core:account:ConfigUser')
        )
        SELECT 
          p.workspace_id,
          p.account_id as old_account_id,
          p.new_social_key,
          p.person_ref,
          c.data->>'name' as person_name
        FROM person_refs p
        LEFT JOIN public.contact c ON c."_id" = p.person_ref
      `
    }

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
