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

import type { Tx, Ref, Doc, Class, DocumentQuery, FindResult, FindOptions, TxCreateDoc, TxUpdateDoc, TxMixin, TxPutBag, TxRemoveDoc, TxResult } from '@anticrm/core'
import core, { DOMAIN_TX, DOMAIN_MODEL, SortingOrder, TxProcessor, Hierarchy, isOperator, ModelDb } from '@anticrm/core'

import type { DbAdapter, TxAdapter } from '@anticrm/server-core'

import { MongoClient, Db, Filter, Document, Sort } from 'mongodb'

function translateDoc (doc: Doc): Document {
  return doc as Document
}

abstract class MongoAdapterBase extends TxProcessor {
  constructor (
    protected readonly db: Db,
    protected readonly hierarchy: Hierarchy,
    protected readonly modelDb: ModelDb
  ) {
    super()
  }

  async init (): Promise<void> {}

  private translateQuery<T extends Doc> (clazz: Ref<Class<T>>, query: DocumentQuery<T>): Filter<Document> {
    const translated: any = {}
    for (const key in query) {
      const value = (query as any)[key]
      if (value !== null && typeof value === 'object') {
        const keys = Object.keys(value)
        if (keys[0] === '$like') {
          const pattern = value.$like as string
          translated[key] = {
            $regex: `^${pattern.split('%').join('.*')}$`,
            $options: 'i'
          }
          continue
        }
      }
      translated[key] = value
    }
    const classes = this.hierarchy.getDescendants(clazz)
    translated._class = { $in: classes }
    // return Object.assign({}, query, { _class: { $in: classes } })
    return translated
  }

  private async lookup<T extends Doc> (clazz: Ref<Class<T>>, query: DocumentQuery<T>, options: FindOptions<T>): Promise<FindResult<T>> {
    const pipeline = []
    pipeline.push({ $match: this.translateQuery(clazz, query) })
    const lookups = options.lookup as any
    for (const key in lookups) {
      const clazz = lookups[key]
      const domain = this.hierarchy.getDomain(clazz)
      if (domain !== DOMAIN_MODEL) {
        const step = {
          from: domain,
          localField: key,
          foreignField: '_id',
          as: key + '_lookup'
        }
        pipeline.push({ $lookup: step })
      }
    }
    const domain = this.hierarchy.getDomain(clazz)
    const cursor = this.db.collection(domain).aggregate(pipeline)
    const result = await cursor.toArray() as FindResult<T>
    for (const row of result) {
      const object = row as any
      object.$lookup = {}
      for (const key in lookups) {
        const clazz = lookups[key]
        const domain = this.hierarchy.getDomain(clazz)
        if (domain !== DOMAIN_MODEL) {
          const arr = object[key + '_lookup']
          object.$lookup[key] = arr[0]
        } else {
          object.$lookup[key] = this.modelDb.getObject(object[key])
        }
      }
    }
    return result
  }

  async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    // TODO: rework this
    if (options !== null && options !== undefined) {
      if (options.lookup !== undefined) { return await this.lookup(_class, query, options) }
    }
    const domain = this.hierarchy.getDomain(_class)
    let cursor = this.db.collection(domain).find<T>(this.translateQuery(_class, query))
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

class MongoAdapter extends MongoAdapterBase {
  protected override async txPutBag (tx: TxPutBag<any>): Promise<TxResult> {
    const domain = this.hierarchy.getDomain(tx.objectClass)
    console.log('mongo', { $set: { [tx.bag + '.' + tx.key]: tx.value } })
    await this.db.collection(domain).updateOne({ _id: tx.objectId }, { $set: { [tx.bag + '.' + tx.key]: tx.value } })
    return {}
  }

  protected txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  protected txMixin (tx: TxMixin<Doc, Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult> {
    const doc = TxProcessor.createDoc2Doc(tx)
    const domain = this.hierarchy.getDomain(doc._class)
    await this.db.collection(domain).insertOne(translateDoc(doc))
    return {}
  }

  protected override async txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<TxResult> {
    const domain = this.hierarchy.getDomain(tx.objectClass)
    if (isOperator(tx.operations)) {
      const operator = Object.keys(tx.operations)[0]
      if (operator === '$move') {
        const keyval = (tx.operations as any).$move
        const arr = Object.keys(keyval)[0]
        const desc = keyval[arr]
        const ops = [
          {
            updateOne: {
              filter: { _id: tx.objectId },
              update: {
                $pull: {
                  [arr]: desc.$value
                }
              }
            }
          },
          {
            updateOne: {
              filter: { _id: tx.objectId },
              update: {
                $push: {
                  [arr]: {
                    $each: [desc.$value],
                    $position: desc.$position
                  }
                }
              }
            }
          }
        ]
        console.log('ops', ops)
        return await this.db.collection(domain).bulkWrite(ops as any)
      } else {
        if (tx.retrieve === true) {
          const result = await this.db.collection(domain).findOneAndUpdate({ _id: tx.objectId }, tx.operations, { returnDocument: 'after' })
          return { object: result.value }
        } else {
          return await this.db.collection(domain).updateOne({ _id: tx.objectId }, tx.operations)
        }
      }
    } else {
      if (tx.retrieve === true) {
        const result = await this.db.collection(domain).findOneAndUpdate({ _id: tx.objectId }, { $set: tx.operations }, { returnDocument: 'after' })
        return { object: result.value }
      } else {
        return await this.db.collection(domain).updateOne({ _id: tx.objectId }, { $set: tx.operations })
      }
    }
  }

  override tx (tx: Tx): Promise<TxResult> {
    console.log('mongo', tx)
    return super.tx(tx)
  }
}

class MongoTxAdapter extends MongoAdapterBase implements TxAdapter {
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

  override async tx (tx: Tx): Promise<TxResult> {
    console.log('mongotx', tx)
    await this.db.collection(DOMAIN_TX).insertOne(translateDoc(tx))
    return {}
  }

  async getModel (): Promise<Tx[]> {
    return await this.db.collection(DOMAIN_TX).find<Tx>({ objectSpace: core.space.Model }).sort({ _id: 1 }).toArray()
  }
}

/**
 * @public
 */
export async function createMongoAdapter (hierarchy: Hierarchy, url: string, dbName: string, modelDb: ModelDb): Promise<DbAdapter> {
  const client = new MongoClient(url)
  await client.connect()
  const db = client.db(dbName)
  return new MongoAdapter(db, hierarchy, modelDb)
}

/**
 * @public
 */
export async function createMongoTxAdapter (hierarchy: Hierarchy, url: string, dbName: string, modelDb: ModelDb): Promise<TxAdapter> {
  const client = new MongoClient(url)
  await client.connect()
  const db = client.db(dbName)
  return new MongoTxAdapter(db, hierarchy, modelDb)
}
