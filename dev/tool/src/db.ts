import {
  type AccountDB,
  listAccounts,
  listWorkspacesPure,
  listInvites,
  updateWorkspace,
  type Workspace,
  type ObjectId,
  getAccount,
  getWorkspaceById
} from '@hcengineering/account'
import {
  type BackupClient,
  type Client,
  getWorkspaceId,
  MeasureMetricsContext,
  systemAccountEmail,
  type Doc
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
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'
import { type MongoClient, UUID } from 'mongodb'
import type postgres from 'postgres'

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
      console.log('Error when move workspace', ws.workspaceName ?? ws.workspace, err)
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
    console.log('move workspace', ws.workspaceName ?? ws.workspace)
    const wsId = getWorkspaceId(ws.workspace)
    const mongoDB = getWorkspaceMongoDB(mongo, wsId)
    const collections = await mongoDB.collections()
    let tables = collections.map((c) => c.collectionName)
    if (include !== undefined) {
      tables = tables.filter((t) => include.has(t))
    }

    await createTables(new MeasureMetricsContext('', {}), pgClient, tables)
    const token = generateToken(systemAccountEmail, wsId)
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
      const current =
        await pgClient`SELECT _id FROM ${pgClient(domain)} WHERE "workspaceId" = ${ws.uuid ?? ws.workspace}`
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
              `DELETE FROM ${translateDomain(domain)} WHERE "workspaceId" = '${ws.workspace}' AND _id IN (${part.map((c) => `'${c}'`).join(', ')})`
            )
          })
        }
        if (docs.length === 0) break
        while (docs.length > 0) {
          const part = docs.splice(0, 100)
          const values: DBDoc[] = []
          for (let i = 0; i < part.length; i++) {
            const doc = part[i]
            const d = convertDoc(domain, doc, ws.workspace)
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
    await updateWorkspace(accountDb, ws, { region })
    await connection.sendForceClose()
    await connection.close()
  } catch (err) {
    console.log('Error when move workspace', ws.workspaceName ?? ws.workspace, err)
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
  // [accountId, workspaceId]
  const workspaceAssignments: [ObjectId, ObjectId][] = []
  const accounts = await listAccounts(mongoDb)
  const workspaces = await listWorkspacesPure(mongoDb)
  const invites = await listInvites(mongoDb)

  for (const mongoAccount of accounts) {
    const pgAccount = {
      ...mongoAccount,
      _id: mongoAccount._id.toString()
    }

    delete (pgAccount as any).workspaces

    if (pgAccount.createdOn == null) {
      pgAccount.createdOn = Date.now()
    }

    if (pgAccount.first == null) {
      pgAccount.first = 'NotSet'
    }

    if (pgAccount.last == null) {
      pgAccount.last = 'NotSet'
    }

    for (const workspaceString of new Set(mongoAccount.workspaces.map((w) => w.toString()))) {
      workspaceAssignments.push([pgAccount._id, workspaceString])
    }

    const exists = await getAccount(pgDb, pgAccount.email)
    if (exists === null) {
      await pgDb.account.insertOne(pgAccount)
      ctx.info('Moved account', { email: pgAccount.email })
    }
  }

  for (const mongoWorkspace of workspaces) {
    const pgWorkspace = {
      ...mongoWorkspace,
      _id: mongoWorkspace._id.toString()
    }

    if (pgWorkspace.createdOn == null) {
      pgWorkspace.createdOn = Date.now()
    }

    // delete deprecated fields
    delete (pgWorkspace as any).createProgress
    delete (pgWorkspace as any).creating
    delete (pgWorkspace as any).productId
    delete (pgWorkspace as any).organisation

    // assigned separately
    delete (pgWorkspace as any).accounts

    const exists = await getWorkspaceById(pgDb, pgWorkspace.workspace)
    if (exists === null) {
      await pgDb.workspace.insertOne(pgWorkspace)
      ctx.info('Moved workspace', {
        workspace: pgWorkspace.workspace,
        workspaceName: pgWorkspace.workspaceName,
        workspaceUrl: pgWorkspace.workspaceUrl
      })
    }
  }

  for (const mongoInvite of invites) {
    const pgInvite = {
      ...mongoInvite,
      _id: mongoInvite._id.toString()
    }

    const exists = await pgDb.invite.findOne({ _id: pgInvite._id })
    if (exists === null) {
      await pgDb.invite.insertOne(pgInvite)
    }
  }

  const pgAssignments = (await listAccounts(pgDb)).reduce<Record<ObjectId, ObjectId[]>>((assignments, acc) => {
    assignments[acc._id] = acc.workspaces

    return assignments
  }, {})
  const assignmentsToInsert = workspaceAssignments.filter(
    ([accountId, workspaceId]) =>
      pgAssignments[accountId] === undefined || !pgAssignments[accountId].includes(workspaceId)
  )

  for (const [accountId, workspaceId] of assignmentsToInsert) {
    await pgDb.assignWorkspace(accountId, workspaceId)
  }

  ctx.info('Assignments made', { count: assignmentsToInsert.length })
}

export async function generateUuidMissingWorkspaces (
  ctx: MeasureMetricsContext,
  db: AccountDB,
  dryRun = false
): Promise<void> {
  const workspaces = await listWorkspacesPure(db)
  let updated = 0
  for (const ws of workspaces) {
    if (ws.uuid !== undefined) continue

    const uuid = new UUID().toJSON()
    if (!dryRun) {
      await db.workspace.updateOne({ _id: ws._id }, { uuid })
    }
    updated++
  }
  ctx.info('Assigned uuids to workspaces', { updated, total: workspaces.length })
}

export async function updateDataWorkspaceIdToUuid (
  ctx: MeasureMetricsContext,
  accountDb: AccountDB,
  dbUrl: string | undefined,
  dryRun = false
): Promise<void> {
  if (dbUrl === undefined) {
    throw new Error('dbUrl is required')
  }

  const pg = getDBClient(dbUrl)
  try {
    const pgClient = await pg.getClient()

    // Generate uuids for all workspaces or verify they exist
    await generateUuidMissingWorkspaces(ctx, accountDb, dryRun)

    const workspaces = await listWorkspacesPure(accountDb)
    const noUuidWss = workspaces.filter((ws) => ws.uuid === undefined)
    if (noUuidWss.length > 0) {
      ctx.error('Workspace uuid is required but not defined', { workspaces: noUuidWss.map((it) => it.workspace) })
      throw new Error('workspace uuid is required but not defined')
    }

    const res = await pgClient`select t.table_name from information_schema.columns as c 
      join information_schema.tables as t on 
        c.table_catalog = t.table_catalog and
        c.table_schema  = t.table_schema and 
        c.table_name    = t.table_name
      where t.table_type = 'BASE TABLE' and t.table_schema = 'public' and c.column_name = 'workspaceId' and c.data_type <> 'uuid'`
    const tables: string[] = res.map((r) => r.table_name)

    ctx.info('Tables to be updated: ', { tables })

    for (const table of tables) {
      ctx.info('Altering table workspaceId type to uuid', { table })

      if (!dryRun) {
        await retryTxn(pgClient, async (client) => {
          await client`ALTER TABLE ${client(table)} RENAME COLUMN "workspaceId" TO "workspaceIdOld"`
          await client`ALTER TABLE ${client(table)} ADD COLUMN "workspaceId" UUID`
        })

        await retryTxn(pgClient, async (client) => {
          for (const ws of workspaces) {
            const uuid = ws.uuid
            if (uuid === undefined) {
              ctx.error('Workspace uuid is required but not defined', { workspace: ws.workspace })
              throw new Error('workspace uuid is required but not defined')
            }

            await client`UPDATE ${client(table)} SET "workspaceId" = ${uuid} WHERE "workspaceIdOld" = ${ws.workspace}`
          }
        })

        await retryTxn(pgClient, async (client) => {
          await client`ALTER TABLE ${client(table)} ALTER COLUMN "workspaceId" SET NOT NULL`
        })

        await retryTxn(pgClient, async (client) => {
          await client`ALTER TABLE ${client(table)} DROP CONSTRAINT ${client(`${table}_pkey`)}`
          await client`ALTER TABLE ${client(table)} ADD CONSTRAINT ${client(`${table}_pkey`)} PRIMARY KEY ("workspaceId", _id)`
        })
      }
    }

    ctx.info('Done updating workspaceId to uuid')
  } finally {
    pg.close()
  }
}
