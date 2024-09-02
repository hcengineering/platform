import { saveCollaborativeDoc } from '@hcengineering/collaboration'
import core, {
  type AnyAttribute,
  type Class,
  type Client as CoreClient,
  type Doc,
  type Domain,
  type Hierarchy,
  type MeasureContext,
  type Ref,
  type WorkspaceId,
  RateLimiter,
  collaborativeDocParse,
  makeCollaborativeDoc
} from '@hcengineering/core'
import { getMongoClient, getWorkspaceDB } from '@hcengineering/mongo'
import { type Pipeline, type StorageAdapter } from '@hcengineering/server-core'
import { connect, fetchModel } from '@hcengineering/server-tool'
import { jsonToText, markupToYDoc } from '@hcengineering/text'
import { type Db, type FindCursor, type MongoClient } from 'mongodb'

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

  const client = getMongoClient(mongoUrl)
  const _client = await client.getClient()
  const db = getWorkspaceDB(_client, workspaceId)

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
    client.close()
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
            remove.push(makeCollaborativeDoc(doc._id, attribute.name))
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

export async function migrateMarkup (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  workspaceId: WorkspaceId,
  client: MongoClient,
  pipeline: Pipeline,
  concurrency: number
): Promise<void> {
  const { hierarchy } = await fetchModel(ctx, pipeline)

  const workspaceDb = client.db(workspaceId.name)

  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const allAttributes = hierarchy.getAllAttributes(_class)
    const attributes = Array.from(allAttributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, 'core:class:TypeCollaborativeMarkup' as Ref<Class<Doc>>)
    })

    if (attributes.length === 0) continue
    if (hierarchy.isMixin(_class) && attributes.every((p) => p.attributeOf !== _class)) continue

    const collection = workspaceDb.collection(domain)

    const filter = hierarchy.isMixin(_class) ? { [_class]: { $exists: true } } : { _class }

    const count = await collection.countDocuments(filter)
    const iterator = collection.find<Doc>(filter)

    try {
      console.log('processing', _class, '->', count)
      await processMigrateMarkupFor(ctx, hierarchy, storageAdapter, workspaceId, attributes, iterator, concurrency)
    } finally {
      await iterator.close()
    }
  }
}

async function processMigrateMarkupFor (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  storageAdapter: StorageAdapter,
  workspaceId: WorkspaceId,
  attributes: AnyAttribute[],
  iterator: FindCursor<Doc>,
  concurrency: number
): Promise<void> {
  const rateLimiter = new RateLimiter(concurrency)

  let processed = 0

  while (true) {
    const doc = await iterator.next()
    if (doc === null) break

    const timestamp = Date.now()
    const revisionId = `${timestamp}`

    await rateLimiter.exec(async () => {
      for (const attribute of attributes) {
        const collaborativeDoc = makeCollaborativeDoc(doc._id, attribute.name, revisionId)
        const { documentId } = collaborativeDocParse(collaborativeDoc)

        const value = hierarchy.isMixin(attribute.attributeOf)
          ? ((doc as any)[attribute.attributeOf]?.[attribute.name] as string)
          : ((doc as any)[attribute.name] as string)

        if (value != null && value.startsWith('{')) {
          const blob = await storageAdapter.stat(ctx, workspaceId, documentId)
          // only for documents not in storage
          if (blob === undefined) {
            try {
              const ydoc = markupToYDoc(value, attribute.name)
              await saveCollaborativeDoc(storageAdapter, workspaceId, collaborativeDoc, ydoc, ctx)
            } catch (err) {
              console.error('failed to process document', doc._class, doc._id, err)
            }
          }
        }
      }
    })

    processed += 1

    if (processed % 100 === 0) {
      await rateLimiter.waitProcessing()
      console.log('...processing', processed)
    }
  }

  await rateLimiter.waitProcessing()

  console.log('processed', processed)
}
