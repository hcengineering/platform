//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import core, {
  Account,
  Class,
  Doc, DocumentQuery,
  DOMAIN_TX, FindOptions, FindResult,
  generateId,
  Hierarchy, MeasureMetricsContext, ModelDb,
  Ref,
  ServerStorage,
  Tx,
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
import { Attachment } from '@anticrm/attachment'
import { createMongoAdapter, createMongoTxAdapter } from '@anticrm/mongo'
import { addLocation } from '@anticrm/platform'
import { serverChunterId } from '@anticrm/server-chunter'
import {
  createServerStorage,
  DbAdapter,
  DbConfiguration,
  FullTextAdapter,
  IndexedDoc,
  TxAdapter
} from '@anticrm/server-core'
import { serverRecruitId } from '@anticrm/server-recruit'
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
  elastic!: FullTextAdapter & {close: () => Promise<void>}
  storage!: ServerStorage
  db!: Db
  constructor (readonly mongoUrl: string, readonly dbName: string, readonly minio: Client, readonly elasticUrl: string) {
    addLocation(serverChunterId, () => import('@anticrm/server-chunter-resources'))
    addLocation(serverRecruitId, () => import('@anticrm/server-recruit-resources'))
    this.mongoClient = new MongoClient(mongoUrl)
  }

  async connect (): Promise<() => Promise<void>> {
    await this.mongoClient.connect()

    this.db = this.mongoClient.db(this.dbName)
    this.elastic = await createElasticAdapter(this.elasticUrl, this.dbName)
    this.storage = await createStorage(this.mongoUrl, this.elasticUrl, this.dbName)

    return async () => {
      await this.mongoClient.close()
      await this.elastic.close()
    }
  }

  async indexAttachment (
    name: string
  ): Promise<void> {
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
      modifiedBy: 'core:account:System' as Ref<Account>,
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
    const txes = (await tool.db.collection<Tx>(DOMAIN_TX).find().sort({ _id: 1 }).toArray())
    const data = txes.filter((tx) => tx.objectSpace !== core.space.Model)
    const metricsCtx = new MeasureMetricsContext('elastic', {})
    for (const tx of data) {
      await tool.storage.tx(metricsCtx, tx)
    }
    if (await minio.bucketExists(dbName)) {
      const minioObjects = await listMinioObjects(minio, dbName)
      for (const d of minioObjects) {
        await tool.indexAttachment(d.name)
      }
    }
  } finally {
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
  return await createServerStorage(conf)
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
}

class MongoReadOnlyTxAdapter extends MongoReadOnlyAdapter implements TxAdapter {
  constructor (protected readonly adapter: TxAdapter) {
    super(adapter)
  }

  async getModel (): Promise<Tx[]> {
    return await this.adapter.getModel()
  }
}
