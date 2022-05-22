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

import { Attachment } from '@anticrm/attachment'
import core, {
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
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
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxPutBag,
  TxRemoveDoc,
  TxResult,
  TxUpdateDoc
} from '@anticrm/core'
import { createElasticAdapter } from '@anticrm/elastic'
import { DOMAIN_ATTACHMENT } from '@anticrm/model-attachment'
import { createMongoAdapter, createMongoTxAdapter } from '@anticrm/mongo'
import { addLocation } from '@anticrm/platform'
import { serverAttachmentId } from '@anticrm/server-attachment'
import { serverBoardId } from '@anticrm/server-board'
import { serverCalendarId } from '@anticrm/server-calendar'
import { serverChunterId } from '@anticrm/server-chunter'
import { serverContactId } from '@anticrm/server-contact'
import {
  createServerStorage,
  DbAdapter,
  DbConfiguration,
  FullTextAdapter,
  FullTextIndex,
  IndexedDoc,
  TxAdapter
} from '@anticrm/server-core'
import { serverGmailId } from '@anticrm/server-gmail'
import { serverInventoryId } from '@anticrm/server-inventory'
import { serverLeadId } from '@anticrm/server-lead'
import { serverNotificationId } from '@anticrm/server-notification'
import { serverRecruitId } from '@anticrm/server-recruit'
import { serverSettingId } from '@anticrm/server-setting'
import { serverTagsId } from '@anticrm/server-tags'
import { serverTaskId } from '@anticrm/server-task'
import { serverTelegramId } from '@anticrm/server-telegram'
import { Client as ElasticClient } from '@elastic/elasticsearch'
import { Client } from 'minio'
import { Db, MongoClient } from 'mongodb'
import { listMinioObjects } from './minio'

export async function rebuildElastic (
  mongoUrl: string,
  dbName: string,
  minio: Client,
  elasticUrl: string
): Promise<void> {
  await dropElastic(elasticUrl, dbName)
  return await restoreElastic(mongoUrl, dbName, minio, elasticUrl)
}

async function dropElastic (elasticUrl: string, dbName: string): Promise<void> {
  console.log('drop existing elastic docment')
  const client = new ElasticClient({
    node: elasticUrl
  })
  await new Promise((resolve, reject) => {
    client.indices.exists(
      {
        index: dbName
      },
      (err: any, result: any) => {
        if (err != null) reject(err)
        if (result.body === true) {
          client.indices.delete(
            {
              index: dbName
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

  constructor (readonly mongoUrl: string, readonly dbName: string, readonly minio: Client, readonly elasticUrl: string) {
    addLocation(serverAttachmentId, () => import('@anticrm/server-attachment-resources'))
    addLocation(serverBoardId, () => import('@anticrm/server-board-resources'))
    addLocation(serverContactId, () => import('@anticrm/server-contact-resources'))
    addLocation(serverNotificationId, () => import('@anticrm/server-notification-resources'))
    addLocation(serverChunterId, () => import('@anticrm/server-chunter-resources'))
    addLocation(serverInventoryId, () => import('@anticrm/server-inventory-resources'))
    addLocation(serverLeadId, () => import('@anticrm/server-lead-resources'))
    addLocation(serverRecruitId, () => import('@anticrm/server-recruit-resources'))
    addLocation(serverSettingId, () => import('@anticrm/server-setting-resources'))
    addLocation(serverTaskId, () => import('@anticrm/server-task-resources'))
    addLocation(serverTagsId, () => import('@anticrm/server-tags-resources'))
    addLocation(serverCalendarId, () => import('@anticrm/server-calendar-resources'))
    addLocation(serverGmailId, () => import('@anticrm/server-gmail-resources'))
    addLocation(serverTelegramId, () => import('@anticrm/server-telegram-resources'))
    this.mongoClient = new MongoClient(mongoUrl)
  }

  async connect (): Promise<() => Promise<void>> {
    await this.mongoClient.connect()

    this.db = this.mongoClient.db(this.dbName)
    this.elastic = await createElasticAdapter(this.elasticUrl, this.dbName)
    this.storage = await createStorage(this.mongoUrl, this.elasticUrl, this.dbName)
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

    const buffer = await this.readMinioObject(name)
    await this.indexAttachmentDoc(doc, buffer)
  }

  async indexAttachmentDoc (doc: Attachment, buffer: Buffer): Promise<void> {
    const id: Ref<Doc> = (generateId() + '/attachments/') as Ref<Doc>

    const indexedDoc: IndexedDoc = {
      id: id,
      _class: doc._class,
      space: doc.space,
      modifiedOn: doc.modifiedOn,
      modifiedBy: core.account.System,
      attachedTo: doc.attachedTo,
      data: buffer.toString('base64')
    }

    await this.elastic.index(indexedDoc)
  }

  private async readMinioObject (name: string): Promise<Buffer> {
    const data = await this.minio.getObject(this.dbName, name)
    const chunks: Buffer[] = []
    await new Promise<void>((resolve) => {
      data.on('readable', () => {
        let chunk
        while ((chunk = data.read()) !== null) {
          const b = chunk as Buffer
          chunks.push(b)
        }
      })

      data.on('end', () => {
        resolve()
      })
    })
    return Buffer.concat(chunks)
  }
}

async function restoreElastic (mongoUrl: string, dbName: string, minio: Client, elasticUrl: string): Promise<void> {
  const tool = new ElasticTool(mongoUrl, dbName, minio, elasticUrl)
  const done = await tool.connect()
  try {
    const data = await tool.db.collection<Tx>(DOMAIN_TX).find().toArray()
    const m = newMetrics()
    const metricsCtx = new MeasureMetricsContext('elastic', {}, m)

    const isCreateTx = (tx: Tx): boolean => tx._class === core.class.TxCreateDoc
    const isCollectionCreateTx = (tx: Tx): boolean =>
      tx._class === core.class.TxCollectionCUD &&
      (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class === core.class.TxCreateDoc

    const createTxes = data.filter((tx) => isCreateTx(tx))
    const collectionTxes = data.filter((tx) => isCollectionCreateTx(tx))
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

    let apos = 0
    if (await minio.bucketExists(dbName)) {
      const minioObjects = await listMinioObjects(minio, dbName)
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

async function createStorage (mongoUrl: string, elasticUrl: string, workspace: string): Promise<ServerStorage> {
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
  dbName: string,
  modelDb: ModelDb
): Promise<DbAdapter> {
  const adapter = await createMongoAdapter(hierarchy, url, dbName, modelDb)
  return new MongoReadOnlyAdapter(adapter)
}

async function createMongoReadOnlyTxAdapter (
  hierarchy: Hierarchy,
  url: string,
  dbName: string,
  modelDb: ModelDb
): Promise<TxAdapter> {
  const adapter = await createMongoTxAdapter(hierarchy, url, dbName, modelDb)
  return new MongoReadOnlyTxAdapter(adapter)
}

class MongoReadOnlyAdapter extends TxProcessor implements DbAdapter {
  constructor (protected readonly adapter: DbAdapter) {
    super()
  }

  protected txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  protected txPutBag (tx: TxPutBag<any>): Promise<TxResult> {
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
}

class MongoReadOnlyTxAdapter extends MongoReadOnlyAdapter implements TxAdapter {
  constructor (protected readonly adapter: TxAdapter) {
    super(adapter)
  }

  async getModel (): Promise<Tx[]> {
    return await this.adapter.getModel()
  }
}
