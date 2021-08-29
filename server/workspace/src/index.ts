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

import { MongoClient, Document } from 'mongodb'
import core, { DOMAIN_TX, Tx } from '@anticrm/core'
import { createContributingClient } from '@anticrm/contrib'
import { encode } from 'jwt-simple'
import { Client } from 'minio'

import * as txJson from './model.tx.json'

const txes = (txJson as any).default as Tx[]

/**
 * @public
 */
export async function createWorkspace (mongoUrl: string, dbName: string, clientUrl: string, minio: Client): Promise<void> {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log('dropping database...')
    await db.dropDatabase()

    console.log('creating model...')
    const model = txes.filter(tx => tx.objectSpace === core.space.Model)
    const result = await db.collection(DOMAIN_TX).insertMany(model as Document[])
    console.log(`${result.insertedCount} model transactions inserted.`)

    console.log('creating data...')
    const data = txes.filter(tx => tx.objectSpace !== core.space.Model)
    const token = encode({ email: 'anticrm@hc.engineering', workspace: dbName }, 'secret')
    const url = new URL(`/${token}`, clientUrl)
    const contrib = await createContributingClient(url.href)
    for (const tx of data) {
      await contrib.tx(tx)
    }
    contrib.close()

    console.log('create minio bucket')
    if (!await minio.bucketExists(dbName)) { await minio.makeBucket(dbName, 'k8s') }
  } finally {
    await client.close()
  }
}
