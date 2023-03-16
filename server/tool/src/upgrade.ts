import {
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  Hierarchy,
  isOperator,
  ModelDb,
  Ref,
  SortingOrder
} from '@hcengineering/core'
import { MigrateUpdate, MigrationClient, MigrationResult } from '@hcengineering/model'
import { Db, Document, Filter, Sort, UpdateFilter } from 'mongodb'

/**
 * Upgrade client implementation.
 */
export class MigrateClientImpl implements MigrationClient {
  constructor (readonly db: Db, readonly hierarchy: Hierarchy, readonly model: ModelDb) {}

  private translateQuery<T extends Doc>(query: DocumentQuery<T>): Filter<Document> {
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
    return translated
  }

  async find<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<T[]> {
    let cursor = this.db.collection(domain).find<T>(this.translateQuery(query))
    if (options?.limit !== undefined) {
      cursor = cursor.limit(options.limit)
    }
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

  async update<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: MigrateUpdate<T>
  ): Promise<MigrationResult> {
    if (isOperator(operations)) {
      const result = await this.db
        .collection(domain)
        .updateMany(this.translateQuery(query), { ...operations } as unknown as UpdateFilter<Document>)

      return { matched: result.matchedCount, updated: result.modifiedCount }
    } else {
      const result = await this.db.collection(domain).updateMany(this.translateQuery(query), { $set: operations })
      return { matched: result.matchedCount, updated: result.modifiedCount }
    }
  }

  async bulk<T extends Doc>(
    domain: Domain,
    operations: { filter: DocumentQuery<T>, update: MigrateUpdate<T> }[]
  ): Promise<MigrationResult> {
    const result = await this.db.collection(domain).bulkWrite(
      operations.map((it) => ({
        updateOne: {
          filter: this.translateQuery(it.filter),
          update: { $set: it.update }
        }
      }))
    )

    return { matched: result.matchedCount, updated: result.modifiedCount }
  }

  async move<T extends Doc>(
    sourceDomain: Domain,
    query: DocumentQuery<T>,
    targetDomain: Domain
  ): Promise<MigrationResult> {
    const q = this.translateQuery(query)
    const cursor = this.db.collection(sourceDomain).find<T>(q)
    const target = this.db.collection(targetDomain)
    const result: MigrationResult = {
      matched: 0,
      updated: 0
    }
    let doc: Document | null
    while ((doc = await cursor.next()) != null) {
      await target.insertOne(doc)
      result.matched++
      result.updated++
    }
    await this.db.collection(sourceDomain).deleteMany(q)
    return result
  }

  async create<T extends Doc>(domain: Domain, doc: T): Promise<void> {
    await this.db.collection(domain).insertOne(doc as Document)
  }

  async delete<T extends Doc>(domain: Domain, _id: Ref<T>): Promise<void> {
    await this.db.collection(domain).deleteOne({ _id })
  }
}
