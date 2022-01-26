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

import contact from '@anticrm/contact'
import core, { DOMAIN_TX, Tx } from '@anticrm/core'
import builder, { version } from '@anticrm/model-all'
import { upgradeModel } from '@anticrm/server-tool'
import { existsSync } from 'fs'
import { mkdir, open, readFile, writeFile } from 'fs/promises'
import { Client } from 'minio'
import { Document, MongoClient } from 'mongodb'
import { join } from 'path'
import { rebuildElastic } from './elastic'
import { generateModelDiff, printDiff } from './mdiff'
import { listMinioObjects, MinioWorkspaceItem } from './minio'
interface CollectionInfo {
  name: string
  file: string
}

interface WorkspaceInfo {
  version: string
  collections: CollectionInfo[]
  minioData: MinioWorkspaceItem[]
}

/**
 * @public
 */
export async function dumpWorkspace (mongoUrl: string, dbName: string, fileName: string, minio: Client): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log('dumping transactions...')

    if (!existsSync(fileName)) {
      await mkdir(fileName, { recursive: true })
    }

    const workspaceInfo: WorkspaceInfo = {
      version: `${version.major}.${version.minor}.${version.patch}`,
      collections: [],
      minioData: []
    }
    const collections = await db.collections()
    for (const c of collections) {
      const docs = await c.find().toArray()
      workspaceInfo.collections.push({ name: c.collectionName, file: c.collectionName + '.json' })
      await writeFile(fileName + c.collectionName + '.json', JSON.stringify(docs, undefined, 2))
    }

    console.log('Dump minio objects')
    if (await minio.bucketExists(dbName)) {
      workspaceInfo.minioData.push(...(await listMinioObjects(minio, dbName)))
      const minioDbLocation = fileName + '.minio'
      if (!existsSync(minioDbLocation)) {
        await mkdir(minioDbLocation)
      }
      for (const d of workspaceInfo.minioData) {
        const stat = await minio.statObject(dbName, d.name)
        d.metaData = stat.metaData

        const fileHandle = await open(join(minioDbLocation, d.name), 'w')

        const data = await minio.getObject(dbName, d.name)
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
        for (const b of chunks) {
          await fileHandle.write(b)
        }
        await fileHandle.close()
      }
    }

    await writeFile(fileName + '.workspace.json', JSON.stringify(workspaceInfo, undefined, 2))
  } finally {
    await client.close()
  }
}

export async function restoreWorkspace (
  mongoUrl: string,
  dbName: string,
  fileName: string,
  minio: Client,
  elasticUrl: string,
  transactorUrl: string
): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db(dbName)

    const workspaceInfo = JSON.parse((await readFile(fileName + '.workspace.json')).toString()) as WorkspaceInfo

    // Drop existing collections

    const cols = await db.collections()
    for (const c of cols) {
      console.log('dropping existing table', c.collectionName)
      await db.dropCollection(c.collectionName)
    }
    // Restore collections.
    for (const c of workspaceInfo.collections) {
      const collection = db.collection(c.name)
      await collection.deleteMany({})
      const data = JSON.parse((await readFile(fileName + c.name + '.json')).toString()) as Document[]
      if (data.length > 0) {
        console.log('restore existing collection', c.name, data.length)
        await collection.insertMany(data)
      }
    }

    if (await minio.bucketExists(dbName)) {
      const objectNames = (await listMinioObjects(minio, dbName)).map((i) => i.name)
      await minio.removeObjects(dbName, objectNames)
      await minio.removeBucket(dbName)
    }
    await minio.makeBucket(dbName, 'k8s')

    const minioDbLocation = fileName + '.minio'
    console.log('Restore minio objects', workspaceInfo.minioData.length)
    let promises: Promise<void>[] = []
    for (const d of workspaceInfo.minioData) {
      const file = await open(join(minioDbLocation, d.name), 'r')
      const stream = file.createReadStream()
      promises.push(minio.putObject(dbName, d.name, stream, d.size, d.metaData).then(async () => {
        await file.close()
      }))
      if (promises.length > 10) {
        await Promise.all(promises)
        promises = []
      }
    }

    await upgradeModel(dbName, transactorUrl)

    await rebuildElastic(mongoUrl, dbName, minio, elasticUrl)
  } finally {
    await client.close()
  }
}

export async function diffWorkspace (mongoUrl: string, dbName: string): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log('diffing transactions...')

    const currentModel = await db
      .collection(DOMAIN_TX)
      .find<Tx>({
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      objectClass: { $ne: contact.class.EmployeeAccount }
    })
      .toArray()

    const txes = builder.getTxes().filter((tx) => {
      return (
        tx.objectSpace === core.space.Model &&
        tx.modifiedBy === core.account.System &&
        (tx as any).objectClass !== contact.class.EmployeeAccount
      )
    })

    const { diffTx, dropTx } = await generateModelDiff(currentModel, txes)
    if (diffTx.length > 0) {
      console.log('DIFF Transactions:')

      printDiff(diffTx)
    }
    if (dropTx.length > 0) {
      console.log('Broken Transactions:')
      for (const tx of dropTx) {
        console.log(JSON.stringify(tx, undefined, 2))
      }
    }
  } finally {
    await client.close()
  }
}
