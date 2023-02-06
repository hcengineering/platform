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

import contact from '@hcengineering/contact'
import core, { DOMAIN_TX, Tx, WorkspaceId } from '@hcengineering/core'
import { MinioService, MinioWorkspaceItem } from '@hcengineering/minio'
import { MigrateOperation } from '@hcengineering/model'
import { getWorkspaceDB } from '@hcengineering/mongo'
import { upgradeModel } from '@hcengineering/server-tool'
import { existsSync } from 'fs'
import { mkdir, open, readFile, writeFile } from 'fs/promises'
import { Document, MongoClient } from 'mongodb'
import { join } from 'path'
import { rebuildElastic } from './elastic'
import { generateModelDiff, printDiff } from './mdiff'

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
export async function dumpWorkspace (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  fileName: string,
  minio: MinioService
): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspaceId)

    console.log('dumping transactions...')

    if (!existsSync(fileName)) {
      await mkdir(fileName, { recursive: true })
    }

    const workspaceInfo: WorkspaceInfo = {
      version: '0.0.0',
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
    if (await minio.exists(workspaceId)) {
      workspaceInfo.minioData.push(...(await minio.list(workspaceId)))
      const minioDbLocation = fileName + '.minio'
      if (!existsSync(minioDbLocation)) {
        await mkdir(minioDbLocation)
      }
      for (const d of workspaceInfo.minioData) {
        const stat = await minio.stat(workspaceId, d.name)
        d.metaData = stat.metaData

        const fileHandle = await open(join(minioDbLocation, d.name), 'w')

        const chunks: Buffer[] = await minio.read(workspaceId, d.name)
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
  workspaceId: WorkspaceId,
  fileName: string,
  minio: MinioService,
  elasticUrl: string,
  transactorUrl: string,
  rawTxes: Tx[],
  migrateOperations: [string, MigrateOperation][]
): Promise<void> {
  console.log('Restoring workspace', mongoUrl, workspaceId, fileName)
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspaceId)

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

    if (await minio.exists(workspaceId)) {
      const objectNames = (await minio.list(workspaceId)).map((i) => i.name)
      await minio.remove(workspaceId, objectNames)
      await minio.delete(workspaceId)
    }
    await minio.make(workspaceId)

    const minioDbLocation = fileName + '.minio'
    console.log('Restore minio objects', workspaceInfo.minioData.length)
    let promises: Promise<void>[] = []
    for (const d of workspaceInfo.minioData) {
      const file = await open(join(minioDbLocation, d.name), 'r')
      const stream = file.createReadStream()
      promises.push(
        minio.put(workspaceId, d.name, stream, d.size, d.metaData).then(async () => {
          await file.close()
        })
      )
      if (promises.length > 10) {
        await Promise.all(promises)
        promises = []
      }
    }

    await upgradeModel(transactorUrl, workspaceId, rawTxes, migrateOperations)

    await rebuildElastic(mongoUrl, workspaceId, minio, elasticUrl)
  } finally {
    await client.close()
  }
}

export async function diffWorkspace (mongoUrl: string, workspace: WorkspaceId, rawTxes: Tx[]): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspace)

    console.log('diffing transactions...')

    const currentModel = await db
      .collection(DOMAIN_TX)
      .find<Tx>({
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      objectClass: { $ne: contact.class.EmployeeAccount }
    })
      .toArray()

    const txes = rawTxes.filter((tx) => {
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
