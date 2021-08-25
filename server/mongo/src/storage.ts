//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { Tx, Ref, Doc, Class, DocumentQuery, FindResult, FindOptions, TxCreateDoc } from '@anticrm/core'
import core, { TxProcessor, Hierarchy, DOMAIN_TX, SortingOrder } from '@anticrm/core'
import type { DbAdapter } from '@anticrm/server-core'

import { MongoClient, Db, Filter, Document, Sort } from 'mongodb'

function translateQuery<T extends Doc> (query: DocumentQuery<T>): Filter<T> {
  return query as Filter<T>
}

function translateDoc (doc: Doc): Document {
  return doc as Document
}

class MongoAdapter extends TxProcessor implements DbAdapter {
  constructor (
    private readonly db: Db,
    private readonly hierarchy: Hierarchy
  ) {
    super()
  }

  async init (): Promise<void> {}

  override async tx (tx: Tx): Promise<void> {
    const p1 = this.db.collection(DOMAIN_TX).insertOne(translateDoc(tx))
    const p2 = super.tx(tx)
    await Promise.all([p1, p2])
  }

  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {
    const doc = TxProcessor.createDoc2Doc(tx)
    const domain = this.hierarchy.getDomain(doc._class)
    await this.db.collection(domain).insertOne(translateDoc(doc))
  }

  async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(_class)
    let cursor = this.db.collection(domain).find<T>(translateQuery(query))
    if (options !== null && options !== undefined) {
      if (options.sort !== undefined) {
        const sort: Sort = {}
        for (const key in options.sort) {
          const order = options.sort[key] === SortingOrder.Ascending ? 1 : -1
          sort[key] = order
        }
        cursor = cursor.sort(sort)
      }
    }
    return await cursor.toArray()
  }
}

/**
 * @public
 */
export async function createMongoAdapter (hierarchy: Hierarchy, url: string, dbName: string): Promise<[DbAdapter, Tx[]]> {
  const client = new MongoClient(url)
  await client.connect()
  const db = client.db(dbName)
  const txes = await db.collection(DOMAIN_TX).find<Tx>({ objectSpace: core.space.Model }).sort({ _id: 1 }).toArray()
  return [new MongoAdapter(db, hierarchy), txes]
}
