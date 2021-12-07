import {
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  isOperator, SortingOrder
} from '@anticrm/core'
import { MigrationClient, MigrateUpdate, MigrationResult } from '@anticrm/model'
import { Db, Document, Filter, Sort, UpdateFilter } from 'mongodb'

/**
 * Upgrade client implementation.
 */
export class MigrateClientImpl implements MigrationClient {
  constructor (readonly db: Db) {
  }

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

  async update<T extends Doc>(domain: Domain, query: DocumentQuery<T>, operations: MigrateUpdate<T>): Promise<MigrationResult> {
    if (isOperator(operations)) {
      const result = await this.db
        .collection(domain)
        .updateMany(this.translateQuery(query), { ...operations } as unknown as UpdateFilter<any>)

      return { matched: result.matchedCount, updated: result.modifiedCount }
    } else {
      const result = await this.db.collection(domain).updateMany(this.translateQuery(query), { $set: operations })
      return { matched: result.matchedCount, updated: result.modifiedCount }
    }
  }
}
