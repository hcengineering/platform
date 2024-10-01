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
      console.log('move domain', domain)
      while (true) {
        const doc = (await cursor.next()) as Doc | null
        if (doc === null) break
        try {
          const converted = convertDoc(doc, ws.workspaceName ?? ws.workspace)
          await retryTxn(pgClient, async (client) => {
            await client.query(
              `INSERT INTO ${domain} (_id, "workspaceId", _class, "createdBy", "modifiedBy", "modifiedOn", "createdOn", space, "attachedTo", data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                converted._id,
                converted.workspaceId,
                converted._class,
                converted.createdBy ?? converted.modifiedBy,
                converted.modifiedBy,
                converted.modifiedOn,
                converted.createdOn ?? converted.modifiedOn,
                converted.space,
                converted.attachedTo,
                converted.data
              ]
            )
          })
        } catch (err) {
          console.log('error when move doc', doc._id, doc._class, err)
          continue
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

    const exists = await getAccount(pgDb, pgAccount.email)
    if (exists === null) {
      await pgDb.account.insertOne(pgAccount)
      ctx.info('Moved account', { email: pgAccount.email })

      for (const workspace of mongoAccount.workspaces) {
        workspaceAssignments.push([pgAccount._id, workspace.toString()])
      }
    }
  }

  for (const mongoWorkspace of workspaces) {
    const pgWorkspace = {
      ...mongoWorkspace,
      _id: mongoWorkspace._id.toString()
    }

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

  if (workspaceAssignments.length > 0) {
    for (const [accountId, workspaceId] of workspaceAssignments) {
      await pgDb.assignWorkspace(accountId, workspaceId)
    }
  }
}
