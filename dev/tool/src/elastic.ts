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

import { Client as ElasticClient } from '@elastic/elasticsearch'
import { Attachment } from '@hcengineering/attachment'
import core, {
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  Domain,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  generateId,
  Hierarchy,
  MeasureMetricsContext,
  metricsToString,
  ModelDb,
  newMetrics,
  Ref,
  ServerStorage,
  StorageIterator,
  toWorkspaceString,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxResult,
  TxUpdateDoc,
  WorkspaceId
} from '@hcengineering/core'
import { createElasticAdapter } from '@hcengineering/elastic'
import { MinioService } from '@hcengineering/minio'
import { DOMAIN_ATTACHMENT } from '@hcengineering/model-attachment'
import { createMongoAdapter, createMongoTxAdapter, getWorkspaceDB } from '@hcengineering/mongo'
import {
  createServerStorage,
  DbAdapter,
  DbConfiguration,
  FullTextAdapter,
  FullTextIndex,
  IndexedDoc,
  TxAdapter
} from '@hcengineering/server-core'
import { Db, MongoClient } from 'mongodb'

export async function rebuildElastic (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  minio: MinioService,
  elasticUrl: string
): Promise<void> {
  await dropElastic(elasticUrl, workspaceId)
  return await restoreElastic(mongoUrl, workspaceId, minio, elasticUrl)
}

async function dropElastic (elasticUrl: string, workspaceId: WorkspaceId): Promise<void> {
  console.log('drop existing elastic docment')
  const client = new ElasticClient({
    node: elasticUrl
  })
  const productWs = toWorkspaceString(workspaceId)
  await new Promise((resolve, reject) => {
    client.indices.exists(
      {
        index: productWs
      },
      (err: any, result: any) => {
        if (err != null) reject(err)
        if (result.body === true) {
          client.indices.delete(
            {
              index: productWs
            },
            (err: any, result: any) => {
              if (err != null) reject(err)
              resolve(result)
            }
          )
        } else {
          resolve(result)
        }
      }
    )
  })
  await client.close()
}

export class ElasticTool {
  mongoClient: MongoClient
  elastic!: FullTextAdapter & { close: () => Promise<void> }
  storage!: ServerStorage
  db!: Db
  fulltext!: FullTextIndex

  constructor (
    readonly mongoUrl: string,
    readonly workspaceId: WorkspaceId,
    readonly minio: MinioService,
    readonly elasticUrl: string
  ) {
    this.mongoClient = new MongoClient(mongoUrl)
  }

  async connect (): Promise<() => Promise<void>> {
    await this.mongoClient.connect()

    this.db = getWorkspaceDB(this.mongoClient, this.workspaceId)
    this.elastic = await createElasticAdapter(this.elasticUrl, this.workspaceId)
    this.storage = await createStorage(this.mongoUrl, this.elasticUrl, this.workspaceId)
    this.fulltext = new FullTextIndex(this.storage.hierarchy, this.elastic, this.storage, true)

    return async () => {
      await this.mongoClient.close()
      await this.elastic.close()
      await this.storage.close()
    }
  }

  async indexAttachment (name: string): Promise<void> {
    const doc: Attachment | null = await this.db.collection<Attachment>(DOMAIN_ATTACHMENT).findOne({ file: name })
    if (doc == null) return

    const buffer = await this.minio.read(this.workspaceId, name)
    await this.indexAttachmentDoc(doc, Buffer.concat(buffer))
  }

  async indexAttachmentDoc (doc: Attachment, buffer: Buffer): Promise<void> {
    const id: Ref<Doc> = (generateId() + '/attachments/') as Ref<Doc>

    const indexedDoc: IndexedDoc = {
      id,
      _class: doc._class,
      space: doc.space,
      modifiedOn: doc.modifiedOn,
      modifiedBy: core.account.System,
      attachedTo: doc.attachedTo,
      data: buffer.toString('base64')
    }

    await this.elastic.index(indexedDoc)
  }
}

async function restoreElastic (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  minio: MinioService,
  elasticUrl: string
): Promise<void> {
  const tool = new ElasticTool(mongoUrl, workspaceId, minio, elasticUrl)
  const done = await tool.connect()
  try {
    const data = await tool.db.collection<Tx>(DOMAIN_TX).find().toArray()
    const m = newMetrics()
    const metricsCtx = new MeasureMetricsContext('elastic', {}, m)

    const isCreateTx = (tx: Tx): boolean => tx._class === core.class.TxCreateDoc
    const isCollectionCreateTx = (tx: Tx): boolean =>
      tx._class === core.class.TxCollectionCUD &&
      (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class === core.class.TxCreateDoc
    const isMixinTx = (tx: Tx): boolean =>
      tx._class === core.class.TxMixin ||
      (tx._class === core.class.TxCollectionCUD &&
        (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class === core.class.TxMixin)

    const createTxes = data.filter((tx) => isCreateTx(tx))
    const collectionTxes = data.filter((tx) => isCollectionCreateTx(tx))
    const mixinTxes = data.filter((tx) => isMixinTx(tx))
    const removedDocument = new Set<Ref<Doc>>()

    const startCreate = Date.now()
    console.log('replay elastic create transactions', createTxes.length)
    await Promise.all(
      createTxes.map(async (tx) => {
        const createTx = tx as TxCreateDoc<Doc>
        try {
          const docSnapshot = (
            await tool.storage.findAll(metricsCtx, createTx.objectClass, { _id: createTx.objectId }, { limit: 1 })
          ).shift()
          if (docSnapshot !== undefined) {
            // If there is no doc, then it is removed, not need to do something with elastic.
            const { _class, _id, modifiedBy, modifiedOn, space, ...docData } = docSnapshot
            try {
              const newTx: TxCreateDoc<Doc> = {
                ...createTx,
                attributes: docData,
                modifiedBy,
                modifiedOn,
                objectSpace: space // <- it could be moved, let's take actual one.
              }
              await tool.fulltext.tx(metricsCtx, newTx)
            } catch (err: any) {
              console.error('failed to replay tx', tx, err.message)
            }
          } else {
            removedDocument.add(createTx.objectId)
          }
        } catch (e) {
          console.error('failed to find object', tx, e)
        }
      })
    )
    console.log('replay elastic create transactions done', Date.now() - startCreate)

    const startCollection = Date.now()
    console.log('replay elastic collection transactions', collectionTxes.length)
    await Promise.all(
      collectionTxes.map(async (tx) => {
        const collTx = tx as TxCollectionCUD<Doc, AttachedDoc>
        const createTx = collTx.tx as unknown as TxCreateDoc<AttachedDoc>
        try {
          const docSnapshot = (
            await tool.storage.findAll(metricsCtx, createTx.objectClass, { _id: createTx.objectId }, { limit: 1 })
          ).shift() as AttachedDoc
          if (docSnapshot !== undefined) {
            // If there is no doc, then it is removed, not need to do something with elastic.
            const { _class, _id, modifiedBy, modifiedOn, space, ...data } = docSnapshot
            try {
              const newTx: TxCreateDoc<AttachedDoc> = {
                ...createTx,
                attributes: data,
                modifiedBy,
                modifiedOn,
                objectSpace: space // <- it could be moved, let's take actual one.
              }
              collTx.tx = newTx
              collTx.modifiedBy = modifiedBy
              collTx.modifiedOn = modifiedOn
              collTx.objectSpace = space
              await tool.fulltext.tx(metricsCtx, collTx)
            } catch (err: any) {
              console.error('failed to replay tx', tx, err.message)
            }
          }
        } catch (e) {
          console.error('failed to find object', tx, e)
        }
      })
    )
    console.log('replay elastic collection transactions done', Date.now() - startCollection)

    const startMixin = Date.now()
    console.log('replay elastic mixin transactions', mixinTxes.length)
    await Promise.all(
      mixinTxes.map(async (tx) => {
        try {
          let deleted = false
          if (tx._class === core.class.TxMixin) {
            deleted = removedDocument.has((tx as TxMixin<Doc, Doc>).objectId)
          }
          if (
            tx._class === core.class.TxCollectionCUD &&
            (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class === core.class.TxMixin
          ) {
            deleted = removedDocument.has((tx as TxCollectionCUD<Doc, AttachedDoc>).tx.objectId)
          }
          if (!deleted) {
            await tool.storage.tx(metricsCtx, tx)
          }
        } catch (err: any) {
          console.error('failed to replay tx', tx, err.message)
        }
      })
    )
    console.log('replay elastic mixin transactions done', Date.now() - startMixin)

    let apos = 0
    if (await minio.exists(workspaceId)) {
      const minioObjects = await minio.list(workspaceId)
      console.log('reply elastic documents', minioObjects.length)
      for (const d of minioObjects) {
        apos++
        try {
          await tool.indexAttachment(d.name)
        } catch (err: any) {
          console.error(err)
        }
        if (apos % 100 === 0) {
          console.log('replay minio documents', apos, minioObjects.length)
        }
      }
    }
    console.log('replay elastic transactions done')
    console.log(metricsToString(m))
  } finally {
    console.log('Elastic restore done')
    await done()
  }
}

async function createStorage (mongoUrl: string, elasticUrl: string, workspace: WorkspaceId): Promise<ServerStorage> {
  const conf: DbConfiguration = {
    domains: {
      [DOMAIN_TX]: 'MongoTx'
    },
    defaultAdapter: 'Mongo',
    adapters: {
      MongoTx: {
        factory: createMongoReadOnlyTxAdapter,
        url: mongoUrl
      },
      Mongo: {
        factory: createMongoReadOnlyAdapter,
        url: mongoUrl
      }
    },
    fulltextAdapter: {
      factory: createElasticAdapter,
      url: elasticUrl
    },
    workspace
  }
  return await createServerStorage(conf, { skipUpdateAttached: true })
}

async function createMongoReadOnlyAdapter (
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb
): Promise<DbAdapter> {
  const adapter = await createMongoAdapter(hierarchy, url, workspaceId, modelDb)
  return new MongoReadOnlyAdapter(adapter)
}

async function createMongoReadOnlyTxAdapter (
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb
): Promise<TxAdapter> {
  const adapter = await createMongoTxAdapter(hierarchy, url, workspaceId, modelDb)
  return new MongoReadOnlyTxAdapter(adapter)
}

class MongoReadOnlyAdapter extends TxProcessor implements DbAdapter {
  constructor (protected readonly adapter: DbAdapter) {
    super()
  }

  protected txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  protected txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  protected txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  protected txMixin (tx: TxMixin<Doc, Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  async init (model: Tx[]): Promise<void> {
    return await this.adapter.init(model)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.adapter.findAll(_class, query, options)
  }

  override tx (tx: Tx): Promise<TxResult> {
    return new Promise((resolve) => resolve({}))
  }

  async close (): Promise<void> {
    await this.adapter.close()
  }

  find (domain: Domain): StorageIterator {
    return {
      next: async () => undefined,
      close: async () => {}
    }
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return []
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {}

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {}
}

class MongoReadOnlyTxAdapter extends MongoReadOnlyAdapter implements TxAdapter {
  constructor (protected readonly adapter: TxAdapter) {
    super(adapter)
  }

  async getModel (): Promise<Tx[]> {
    return await this.adapter.getModel()
  }
}
