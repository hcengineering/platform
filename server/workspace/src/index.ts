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
import { DOMAIN_TX } from '@anticrm/core'

import * as txJson from './model.tx.json'

const txes = (txJson as any).default

console.log(txes)

/**
 * @public
 */
export async function createModel (url: string, dbName: string): Promise<number> {
  const client = new MongoClient(url)
  try {
    await client.connect()
    const db = client.db(dbName)
    await db.dropDatabase()
    const result = await db.collection(DOMAIN_TX).insertMany(txes as Document[])
    return result.insertedCount
  } finally {
    await client.close()
  }
}
