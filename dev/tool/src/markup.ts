import core, {
  type AnyAttribute,
  type Class,
  type Client as CoreClient,
  type Doc,
  type Domain,
  type MeasureContext,
  type Ref,
  type WorkspaceId,
  getCollaborativeDocId
} from '@hcengineering/core'
import { getWorkspaceDB } from '@hcengineering/mongo'
import { type StorageAdapter } from '@hcengineering/server-core'
import { connect } from '@hcengineering/server-tool'
import { jsonToText } from '@hcengineering/text'
import { type Db, MongoClient } from 'mongodb'

export async function fixJsonMarkup (
  ctx: MeasureContext,
  mongoUrl: string,
  storageAdapter: StorageAdapter,
  workspaceId: WorkspaceId,
  transactorUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient
  const hierarchy = connection.getHierarchy()

  const client = new MongoClient(mongoUrl)
  const db = getWorkspaceDB(client, workspaceId)

  try {
    const classes = hierarchy.getDescendants(core.class.Doc)
    for (const _class of classes) {
      const domain = hierarchy.findDomain(_class)
      if (domain === undefined) continue

      const attributes = hierarchy.getAllAttributes(_class)
      const filtered = Array.from(attributes.values()).filter((attribute) => {
        return hierarchy.isDerived(attribute.type._class, core.class.TypeMarkup)
      })
      if (filtered.length === 0) continue

      await processFixJsonMarkupFor(ctx, domain, _class, filtered, workspaceId, db, storageAdapter)
    }
  } finally {
    await client.close()
    await connection.close()
  }
}

async function processFixJsonMarkupFor (
  ctx: MeasureContext,
  domain: Domain,
  _class: Ref<Class<Doc>>,
  attributes: AnyAttribute[],
  workspaceId: WorkspaceId,
  db: Db,
  storageAdapter: StorageAdapter
): Promise<void> {
  console.log('processing', domain, _class)

  const collection = db.collection<Doc>(domain)
  const docs = await collection.find({ _class }).toArray()
  for (const doc of docs) {
    const update: Record<string, any> = {}
    const remove = []

    for (const attribute of attributes) {
      try {
        const value = (doc as any)[attribute.name]
        if (value != null) {
          let res = value
          while (true) {
            try {
              const json = JSON.parse(res)
              const text = jsonToText(json)
              JSON.parse(text)
              res = text
            } catch {
              break
            }
          }
          if (res !== value) {
            update[attribute.name] = res
            remove.push(getCollaborativeDocId(doc._id, attribute.name))
          }
        }
      } catch {}
    }

    if (Object.keys(update).length > 0) {
      try {
        await collection.updateOne({ _id: doc._id }, { $set: update })
      } catch (err) {
        console.error('failed to update document', doc._class, doc._id, err)
      }
    }

    if (remove.length > 0) {
      try {
        await storageAdapter.remove(ctx, workspaceId, remove)
      } catch (err) {
        console.error('failed to remove objects from storage', doc._class, doc._id, remove, err)
      }
    }
  }

  console.log('...processed', docs.length)
}
