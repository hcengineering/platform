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

import type { Tx, Ref, Doc, Class, DocumentQuery, FindResult, FindOptions, TxCreateDoc, ServerStorage } from '@anticrm/core'
import core, { DOMAIN_MODEL, TxProcessor, ModelDb, Hierarchy, DOMAIN_TX, TxFactory } from '@anticrm/core'

import { Triggers } from '@anticrm/server-core'
import { MongoClient, Db, Filter, Document } from 'mongodb'

function translateQuery<T extends Doc> (query: DocumentQuery<T>): Filter<T> {
  return query as Filter<T>
}

function translateDoc (doc: Doc): Document {
  return doc as Document
}

class MongoTxProcessor extends TxProcessor {
  constructor (
    private readonly db: Db,
    private readonly hierarchy: Hierarchy,
    private readonly modeldb: ModelDb
  ) {
    super()
  }

  override async tx (tx: Tx): Promise<void> {
    const p1 = this.db.collection(DOMAIN_TX).insertOne(translateDoc(tx))
    const p2 = tx.objectSpace === core.space.Model ? this.modeldb.tx(tx) : super.tx(tx)
    await Promise.all([p1, p2])
  }

  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {
    const doc = TxProcessor.createDoc2Doc(tx)
    const domain = this.hierarchy.getDomain(doc._class)
    await this.db.collection(domain).insertOne(translateDoc(doc))
  }
}

class MongoStorage implements ServerStorage {
  private readonly txProcessor: TxProcessor

  constructor (
    private readonly db: Db,
    private readonly hierarchy: Hierarchy,
    private readonly triggers: Triggers,
    private readonly modeldb: ModelDb
  ) {
    this.txProcessor = new MongoTxProcessor(db, hierarchy, modeldb)
  }

  async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(_class)
    if (domain === DOMAIN_MODEL) return await this.modeldb.findAll(_class, query, options)
    return await this.db.collection(domain).find<T>(translateQuery(query)).toArray()
  }

  async tx (tx: Tx): Promise<Tx[]> {
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.triggers.tx(tx)
    }
    await this.txProcessor.tx(tx)
    const derived = await this.triggers.apply(tx)
    for (const tx of derived) {
      await this.txProcessor.tx(tx)
    }
    return derived
  }
}

/**
 * @public
 */
export async function createStorage (url: string, dbName: string): Promise<ServerStorage> {
  const client = new MongoClient(url)
  await client.connect()
  const db = client.db(dbName)

  const hierarchy = new Hierarchy()
  const triggers = new Triggers(new TxFactory(core.account.System))

  const txes = await db.collection(DOMAIN_TX).find<Tx>({}).toArray()
  for (const tx of txes) {
    hierarchy.tx(tx)
    await triggers.tx(tx)
  }

  const model = new ModelDb(hierarchy)
  for (const tx of txes) {
    await model.tx(tx)
  }

  return new MongoStorage(db, hierarchy, triggers, model)
}
