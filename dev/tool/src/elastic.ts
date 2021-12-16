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

import core, { Account, Doc, DOMAIN_TX, generateId, Hierarchy, ModelDb, Ref, Tx } from '@anticrm/core'
import { Client as ElasticClient } from '@elastic/elasticsearch'
import { Db, MongoClient } from 'mongodb'
import { Client } from 'minio'
import { listMinioObjects } from './minio'
import { createElasticAdapter } from '@anticrm/elastic'
import { FullTextAdapter, FullTextIndex, IndexedDoc } from '@anticrm/server-core'
import { DOMAIN_ATTACHMENT } from '@anticrm/model-attachment'
import { createMongoAdapter } from '@anticrm/mongo'

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
  return await new Promise((resolve, reject) => {
    const client = new ElasticClient({
      node: elasticUrl
    })
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
          resolve()
        }
      }
    )
  })
}

async function restoreElastic (mongoUrl: string, dbName: string, minio: Client, elasticUrl: string): Promise<void> {
  const mongoClient = new MongoClient(mongoUrl)
  try {
    await mongoClient.connect()
    const db = mongoClient.db(dbName)
    const elastic = await createElasticAdapter(elasticUrl, dbName)
    const fullTextIndex = await createFullTextIndex(db, elastic, mongoUrl, dbName)
    const txes = (await db.collection(DOMAIN_TX).find().toArray()) as Tx[]
    for (const tx of txes) {
      try {
        await fullTextIndex.tx(tx)
      } catch {}
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

async function createFullTextIndex (
  db: Db,
  elastic: FullTextAdapter,
  mongoUrl: string,
  dbName: string
): Promise<FullTextIndex> {
  const modelTxes = await db
    .collection(DOMAIN_TX)
    .find<Tx>({ objectSpace: core.space.Model })
    .sort({ _id: 1 })
    .toArray()
  const hierarchy = new Hierarchy()
  const modelDb = new ModelDb(hierarchy)
  modelTxes.map((tx) => hierarchy.tx(tx))
  for (const tx of modelTxes) {
    await modelDb.tx(tx)
  }
  const mongoAdapter = await createMongoAdapter(hierarchy, mongoUrl, dbName, modelDb)
  return new FullTextIndex(hierarchy, elastic, mongoAdapter)
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
