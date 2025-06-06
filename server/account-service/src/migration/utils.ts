//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { getMongoClient } from '@hcengineering/mongo'

import { MongoAccountDB } from './collections/mongo'

export async function getMongoAccountDB (uri: string, dbNs?: string): Promise<[MongoAccountDB, () => void]> {
  const isMongo = uri.startsWith('mongodb://')

  if (!isMongo) {
    throw new Error('Can only move accounts from mongodb for now')
  }

  const client = getMongoClient(uri)
  const db = (await client.getClient()).db(dbNs ?? 'account')
  const mongoAccount = new MongoAccountDB(db)

  await mongoAccount.init()

  return [
    mongoAccount,
    () => {
      client.close()
    }
  ]
}

export function isShallowEqual (obj1: Record<string, any>, obj2: Record<string, any>): boolean {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  return keys1.length === keys2.length && keys1.every((k) => obj1[k] === obj2[k])
}
