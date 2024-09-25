import { saveCollaborativeDoc } from '@hcengineering/collaboration'
import core, {
  type AnyAttribute,
  type Class,
  type Client as CoreClient,
  type CollaborativeDoc,
  type Doc,
  type DocIndexState,
  type Domain,
  type Hierarchy,
  type Markup,
  type MeasureContext,
  type Ref,
  type TxMixin,
  type TxCreateDoc,
  type TxUpdateDoc,
  type WorkspaceId,
  RateLimiter,
  collaborativeDocParse,
  makeCollaborativeDoc,
  SortingOrder,
  TxProcessor
} from '@hcengineering/core'
import { getMongoClient, getWorkspaceDB } from '@hcengineering/mongo'
import { type Pipeline, type StorageAdapter } from '@hcengineering/server-core'
import { connect } from '@hcengineering/server-tool'
import { isEmptyMarkup, jsonToText, markupToYDoc } from '@hcengineering/text'
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
  const hierarchy = pipeline.context.hierarchy

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

export async function restoreLostMarkup (
  ctx: MeasureContext,
  workspaceId: WorkspaceId,
  transactorUrl: string,
  storageAdapter: StorageAdapter,
  { command }: { command: 'show' | 'restore' }
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient

  try {
    const hierarchy = connection.getHierarchy()
    const classes = hierarchy.getDescendants(core.class.Doc)

    for (const _class of classes) {
      const isAttachedDoc = hierarchy.isDerived(_class, core.class.AttachedDoc)

      const attributes = hierarchy.getAllAttributes(_class)
      const attrs = Array.from(attributes.values()).filter((p) => p.type._class === core.class.TypeCollaborativeDoc)

      // ignore classes with no collaborative attributes
      if (attrs.length === 0) continue

      const docs = await connection.findAll(_class, { _class })
      for (const doc of docs) {
        for (const attr of attrs) {
          const value = hierarchy.isMixin(attr.attributeOf)
            ? ((doc as any)[attr.attributeOf]?.[attr.name] as CollaborativeDoc)
            : ((doc as any)[attr.name] as CollaborativeDoc)

          if (value == null || value === '') continue

          const { documentId } = collaborativeDocParse(value)
          const stat = await storageAdapter.stat(ctx, workspaceId, documentId)
          if (stat !== undefined) continue

          const query = isAttachedDoc
            ? {
                'tx.objectId': doc._id,
                'tx._class': { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc] }
              }
            : {
                objectId: doc._id
              }

          let restored = false

          // try to restore by txes
          // we need last tx that modified the attribute

          const txes = await connection.findAll(isAttachedDoc ? core.class.TxCollectionCUD : core.class.TxCUD, query, {
            sort: { modifiedOn: SortingOrder.Descending }
          })
          for (const tx of txes) {
            const innerTx = TxProcessor.extractTx(tx)

            let markup: string | undefined
            if (innerTx._class === core.class.TxMixin) {
              const mixinTx = innerTx as TxMixin<Doc, Doc>
              markup = (mixinTx.attributes as any)[attr.name]
            } else if (innerTx._class === core.class.TxCreateDoc) {
              const createTx = innerTx as TxCreateDoc<Doc>
              markup = (createTx.attributes as any)[attr.name]
            } else if (innerTx._class === core.class.TxUpdateDoc) {
              const updateTex = innerTx as TxUpdateDoc<Doc>
              markup = (updateTex.operations as any)[attr.name]
            } else {
              continue
            }

            if (markup === undefined || !markup.startsWith('{')) continue
            if (isEmptyMarkup(markup)) continue

            console.log(doc._class, doc._id, attr.name, markup)
            if (command === 'restore') {
              const ydoc = markupToYDoc(markup, attr.name)
              await saveCollaborativeDoc(storageAdapter, workspaceId, value, ydoc, ctx)
            }
            restored = true
            break
          }

          if (restored) continue

          // try to restore by doc index state
          const docIndexState = await connection.findOne(core.class.DocIndexState, {
            _id: doc._id as Ref<DocIndexState>
          })
          if (docIndexState !== undefined) {
            // document:class:Document%content#content#base64
            const attrName = `${doc._class}%${attr.name}#content#base64`
            const base64: string | undefined = docIndexState.attributes[attrName]
            if (base64 !== undefined) {
              const text = Buffer.from(base64, 'base64').toString()
              if (text !== '') {
                const markup: Markup = JSON.stringify({
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text, marks: [] }]
                    }
                  ]
                })
                console.log(doc._class, doc._id, attr.name, markup)
                if (command === 'restore') {
                  const ydoc = markupToYDoc(markup, attr.name)
                  await saveCollaborativeDoc(storageAdapter, workspaceId, value, ydoc, ctx)
                }
              }
            }
          }
        }
      }
    }
  } finally {
    await connection.close()
  }
}
