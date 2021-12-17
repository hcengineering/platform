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

import core, { Account, Doc, DOMAIN_TX, generateId, Ref, ServerStorage, Tx } from '@anticrm/core'
import { Client as ElasticClient } from '@elastic/elasticsearch'
import { Db, MongoClient } from 'mongodb'
import { Client } from 'minio'
import { createElasticAdapter } from '@anticrm/elastic'
import { createServerStorage, DbConfiguration, FullTextAdapter, IndexedDoc } from '@anticrm/server-core'
import { DOMAIN_ATTACHMENT } from '@anticrm/model-attachment'
import { createInMemoryAdapter, createInMemoryTxAdapter } from '@anticrm/dev-storage'
import { serverChunterId } from '@anticrm/server-chunter'
import { serverRecruitId } from '@anticrm/server-recruit'
import { serverViewId } from '@anticrm/server-task'
import { addLocation } from '@anticrm/platform'
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

async function restoreElastic (mongoUrl: string, dbName: string, minio: Client, elasticUrl: string): Promise<void> {
  addLocation(serverChunterId, () => import('@anticrm/server-chunter-resources'))
  addLocation(serverRecruitId, () => import('@anticrm/server-recruit-resources'))
  addLocation(serverViewId, () => import('@anticrm/server-task-resources'))
  const mongoClient = new MongoClient(mongoUrl)
  try {
    await mongoClient.connect()
    const db = mongoClient.db(dbName)
    const elastic = await createElasticAdapter(elasticUrl, dbName)
    const storage = await createStorage(mongoUrl, elasticUrl, dbName)
    const txes = (await db.collection(DOMAIN_TX).find().sort({ _id: 1 }).toArray()) as Tx[]
    const data = txes.filter((tx) => tx.objectSpace !== core.space.Model)
    for (const tx of data) {
      await storage.tx(tx)
    }
    if (await minio.bucketExists(dbName)) {
      const minioObjects = await listMinioObjects(minio, dbName)

      for (const d of minioObjects) {
        await indexAttachment(elastic, minio, db, dbName, d.name)
      }
    }
  } finally {
    await mongoClient.close()
  }
}

async function createStorage (mongoUrl: string, elasticUrl: string, workspace: string): Promise<ServerStorage> {
  const conf: DbConfiguration = {
    domains: {
      [DOMAIN_TX]: 'MongoTx'
    },
    defaultAdapter: 'InMemory',
    adapters: {
      MongoTx: {
        factory: createInMemoryTxAdapter,
        url: mongoUrl
      },
      InMemory: {
        factory: createInMemoryAdapter,
        url: ''
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

async function indexAttachment (
  elastic: FullTextAdapter,
  minio: Client,
  db: Db,
  dbName: string,
  name: string
): Promise<void> {
  const doc = await db.collection(DOMAIN_ATTACHMENT).findOne({
    file: name
  })
  if (doc == null) return

  const data = await minio.getObject(dbName, name)
  const chunks: Buffer[] = []

  await new Promise((resolve) => {
    data.on('readable', () => {
      let chunk
      while ((chunk = data.read()) !== null) {
        const b = chunk as Buffer
        chunks.push(b)
      }
    })

    data.on('end', () => {
      resolve(null)
    })
  })

  const id: Ref<Doc> = (generateId() + '/attachments/') as Ref<Doc>

  const indexedDoc: IndexedDoc = {
    id: id,
    _class: doc._class,
    space: doc.space,
    modifiedOn: doc.modifiedOn,
    modifiedBy: 'core:account:System' as Ref<Account>,
    attachedTo: doc.attachedTo,
    data: Buffer.concat(chunks).toString('base64')
  }

  await elastic.index(indexedDoc)
}
