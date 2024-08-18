import { type Doc, type WorkspaceId } from '@hcengineering/core'
import { getMongoClient, getWorkspaceDB } from '@hcengineering/mongo'
import { convertDoc, createTable, getDBClient, retryTxn, translateDomain } from '@hcengineering/postgres'

export async function moveFromMongoToPG (
  mongoUrl: string,
  dbUrl: string | undefined,
  workspaces: WorkspaceId[]
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
      const mongoDB = getWorkspaceDB(mongo, ws)
      const collections = await mongoDB.collections()
      await createTable(
        pgClient,
        collections.map((c) => c.collectionName)
      )
      for (const collection of collections) {
        const cursor = collection.find()
        const domain = translateDomain(collection.collectionName)
        while (true) {
          const doc = (await cursor.next()) as Doc | null
          if (doc === null) break
          try {
            const converted = convertDoc(doc, ws.name)
            await retryTxn(pgClient, async (client) => {
              await client.query(
                `INSERT INTO ${domain} (_id, "workspaceId", _class, "createdBy", "modifiedBy", "modifiedOn", "createdOn", space, "attachedTo", data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                  converted._id,
                  converted.workspaceId,
                  converted._class,
                  converted.createdBy,
                  converted.modifiedBy,
                  converted.modifiedOn,
                  converted.createdOn,
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
      if (index % 100 === 0) {
        console.log('Move workspace', index, workspaces.length)
      }
    } catch (err) {
      console.log('Error when move workspace', ws.name, err)
      throw err
    }
  }
  pg.close()
  client.close()
}
