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
  systemAccountEmail,
  type Doc,
  type MeasureMetricsContext
} from '@hcengineering/core'
import { getMongoClient, getWorkspaceMongoDB } from '@hcengineering/mongo'
import { convertDoc, createTable, getDBClient, retryTxn, translateDomain } from '@hcengineering/postgres'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'
import { type MongoClient } from 'mongodb'
import { type Pool } from 'pg'

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
  pgClient: Pool,
  ws: Workspace,
  region: string
): Promise<void> {
  try {
    const wsId = getWorkspaceId(ws.workspace)
    const mongoDB = getWorkspaceMongoDB(mongo, wsId)
    const collections = await mongoDB.collections()
    await createTable(
      pgClient,
      collections.map((c) => c.collectionName)
    )
    const token = generateToken(systemAccountEmail, wsId)
    const endpoint = await getTransactorEndpoint(token, 'external')
    const connection = (await connect(endpoint, wsId, undefined, {
      model: 'upgrade'
    })) as unknown as Client & BackupClient
    for (const collection of collections) {
      const cursor = collection.find()
      const domain = translateDomain(collection.collectionName)
      const current = await pgClient.query(`SELECT _id FROM ${domain} WHERE "workspaceId" = $1`, [ws.workspace])
      const currentIds = new Set(current.rows.map((r) => r._id))
      console.log('move domain', domain)
      const docs: Doc[] = []
      while (true) {
        while (docs.length < 50000) {
          const doc = (await cursor.next()) as Doc | null
          if (doc === null) break
          if (currentIds.has(doc._id)) continue
          docs.push(doc)
        }
        if (docs.length === 0) break
        while (docs.length > 0) {
          const part = docs.splice(0, 500)
          const values: any[] = []
          for (const doc of part) {
            const d = convertDoc(doc, ws.workspace)
            values.push(
              d._id,
              d.workspaceId,
              d._class,
              d.createdBy ?? d.modifiedBy,
              d.modifiedBy,
              d.modifiedOn,
              d.createdOn ?? d.modifiedOn,
              d.space,
              d.attachedTo ?? null,
              JSON.stringify(d.data)
            )
          }
          const vals = part
            .map(
              (_, i) =>
                `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10})`
            )
            .join(',')
          try {
            await retryTxn(pgClient, async (client) => {
              await client.query(
                `INSERT INTO ${translateDomain(domain)} (_id, "workspaceId", _class, "createdBy", "modifiedBy", "modifiedOn", "createdOn", space, "attachedTo", data) VALUES ${vals}`,
                values
              )
            })
          } catch (err) {
            console.log('error when move doc to', domain, err)
            continue
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
  region: string
): Promise<void> {
  if (dbUrl === undefined) {
    throw new Error('dbUrl is required')
  }
  const client = getMongoClient(mongoUrl)
  const mongo = await client.getClient()
  const pg = getDBClient(dbUrl)
  const pgClient = await pg.getClient()

  await moveWorkspace(accountDb, mongo, pgClient, ws, region)
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
