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

import core, {
  DOMAIN_MODEL,
  DOMAIN_TX,
  SortingOrder,
  TxProcessor,
  cutObjectArray,
  escapeLikeForRegexp,
  isOperator,
  toFindResult,
  type AttachedDoc,
  type Class,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type Enum,
  type EnumOf,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type IndexingConfiguration,
  type Lookup,
  type MeasureContext,
  type Mixin,
  type ModelDb,
  type Projection,
  type QueryUpdate,
  type Ref,
  type ReverseLookups,
  type SortQuerySelector,
  type SortingQuery,
  type SortingRules,
  type StorageIterator,
  type Tx,
  type TxCUD,
  type TxCollectionCUD,
  type TxCreateDoc,
  type TxMixin,
  type TxRemoveDoc,
  type TxResult,
  type TxUpdateDoc,
  type WithLookup,
  type WorkspaceId
} from '@hcengineering/core'
import {
  estimateDocSize,
  updateHashForDoc,
  type DbAdapter,
  type DomainHelperOperations,
  type StorageAdapter,
  type TxAdapter
} from '@hcengineering/server-core'
import { calculateObjectSize } from 'bson'
import { createHash } from 'crypto'
import {
  type AbstractCursor,
  type AnyBulkWriteOperation,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type FindCursor,
  type Sort,
  type UpdateFilter
} from 'mongodb'
import { DBCollectionHelper, getMongoClient, getWorkspaceDB, type MongoClientReference } from './utils'

function translateDoc (doc: Doc): Document {
  return { ...doc, '%hash%': null }
}

function isLookupQuery<T extends Doc> (query: DocumentQuery<T>): boolean {
  for (const key in query) {
    if (key.includes('$lookup.')) return true
  }
  return false
}

function isLookupSort<T extends Doc> (sort: SortingQuery<T> | undefined): boolean {
  if (sort === undefined) return false
  for (const key in sort) {
    if (key.includes('$lookup.')) return true
  }
  return false
}

interface LookupStep {
  from: string
  localField?: string
  foreignField?: string
  as: string
  let?: any
  pipeline?: any
}

export async function toArray<T> (cursor: AbstractCursor<T>): Promise<T[]> {
  const data = await cursor.toArray()
  await cursor.close()
  return data
}

export interface DbAdapterOptions {
  calculateHash?: (doc: Doc) => string
}

abstract class MongoAdapterBase implements DbAdapter {
  _db: DBCollectionHelper

  constructor (
    protected readonly db: Db,
    protected readonly hierarchy: Hierarchy,
    protected readonly modelDb: ModelDb,
    protected readonly client: MongoClientReference,
    protected readonly options?: DbAdapterOptions
  ) {
    this._db = new DBCollectionHelper(db)
  }

  abstract init (): Promise<void>

  collection<TSchema extends Document = Document>(domain: Domain): Collection<TSchema> {
    return this._db.collection(domain)
  }

  helper (): DomainHelperOperations {
    return this._db
  }

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {
    for (const vv of config.indexes) {
      try {
        await this.collection(domain).createIndex(vv)
      } catch (err: any) {
        console.error('failed to create index', domain, vv, err)
      }
    }
  }

  async removeOldIndex (domain: Domain, deletePattern: RegExp, keepPattern: RegExp): Promise<void> {
    try {
      const existingIndexes = await this.collection(domain).indexes()
      for (const existingIndex of existingIndexes) {
        const name: string = existingIndex.name
        if (deletePattern.test(name) && !keepPattern.test(name)) {
          await this.collection(domain).dropIndex(existingIndex.name)
        }
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  async close (): Promise<void> {
    this.client.close()
  }

  private translateQuery<T extends Doc>(clazz: Ref<Class<T>>, query: DocumentQuery<T>): Filter<Document> {
    const translated: any = {}
    for (const key in query) {
      const value = (query as any)[key]

      const tkey = this.translateKey(key, clazz)
      if (value !== null && typeof value === 'object') {
        const keys = Object.keys(value)
        if (keys[0] === '$like') {
          translated[tkey] = translateLikeQuery(value.$like as string)
          continue
        }
      }
      translated[tkey] = value
    }
    const baseClass = this.hierarchy.getBaseClass(clazz)
    if (baseClass !== core.class.Doc) {
      const classes = this.hierarchy.getDescendants(baseClass)

      // Only replace if not specified
      if (translated._class === undefined) {
        translated._class = { $in: classes }
      } else if (typeof translated._class === 'string') {
        if (!classes.includes(translated._class)) {
          translated._class = { $in: classes.filter((it) => !this.hierarchy.isMixin(it)) }
        }
      } else if (typeof translated._class === 'object' && translated._class !== null) {
        let descendants: Ref<Class<Doc>>[] = classes

        if (Array.isArray(translated._class.$in)) {
          const classesIds = new Set(classes)
          descendants = translated._class.$in.filter((c: Ref<Class<Doc>>) => classesIds.has(c))
        }

        if (translated._class != null && Array.isArray(translated._class.$nin)) {
          const excludedClassesIds = new Set<Ref<Class<Doc>>>(translated._class.$nin)
          descendants = descendants.filter((c) => !excludedClassesIds.has(c))
        }

        translated._class = { $in: descendants.filter((it: any) => !this.hierarchy.isMixin(it as Ref<Class<Doc>>)) }
      }

      if (baseClass !== clazz) {
        // Add an mixin to be exists flag
        translated[clazz] = { $exists: true }
      }
    } else {
      // No need to pass _class in case of fixed domain search.
      if ('_class' in translated) {
        delete translated._class
      }
    }
    if (translated._class?.$in?.length === 1 && translated._class?.$nin === undefined) {
      translated._class = translated._class.$in[0]
    }
    return translated
  }

  private async getLookupValue<T extends Doc>(
    clazz: Ref<Class<T>>,
    lookup: Lookup<T>,
    result: LookupStep[],
    parent?: string
  ): Promise<void> {
    for (const key in lookup) {
      if (key === '_id') {
        await this.getReverseLookupValue(lookup, result, parent)
        continue
      }
      const value = (lookup as any)[key]
      if (Array.isArray(value)) {
        const [_class, nested] = value
        const tkey = this.checkMixinKey(key, clazz)
        const fullKey = parent !== undefined ? parent + '.' + tkey : tkey
        const domain = this.hierarchy.getDomain(_class)
        if (domain !== DOMAIN_MODEL) {
          result.push({
            from: domain,
            localField: fullKey,
            foreignField: '_id',
            as: fullKey.split('.').join('') + '_lookup',
            pipeline: [{ $project: { '%hash%': 0 } }]
          })
        }
        await this.getLookupValue(_class, nested, result, fullKey + '_lookup')
      } else {
        const _class = value as Ref<Class<Doc>>
        const tkey = this.checkMixinKey(key, clazz)
        const fullKey = parent !== undefined ? parent + '.' + tkey : tkey
        const domain = this.hierarchy.getDomain(_class)
        if (domain !== DOMAIN_MODEL) {
          result.push({
            from: domain,
            localField: fullKey,
            foreignField: '_id',
            as: fullKey.split('.').join('') + '_lookup',
            pipeline: [{ $project: { '%hash%': 0 } }]
          })
        }
      }
    }
  }

  private async getReverseLookupValue (
    lookup: ReverseLookups,
    result: LookupStep[],
    parent?: string
  ): Promise<any | undefined> {
    const fullKey = parent !== undefined ? parent + '.' + '_id' : '_id'
    const lid = lookup?._id ?? {}
    for (const key in lid) {
      const as = parent !== undefined ? parent + key : key
      const value = lid[key]

      let _class: Ref<Class<Doc>>
      let attr = 'attachedTo'

      if (Array.isArray(value)) {
        _class = value[0]
        attr = value[1]
      } else {
        _class = value
      }
      const domain = this.hierarchy.getDomain(_class)
      const desc = this.hierarchy.getDescendants(_class)
      if (domain !== DOMAIN_MODEL) {
        const asVal = as.split('.').join('') + '_lookup'
        const step: LookupStep = {
          from: domain,
          localField: fullKey,
          foreignField: attr,
          pipeline: [
            {
              $match: {
                _class: { $in: desc }
              }
            },
            { $project: { '%hash%': 0 } }
          ],
          as: asVal
        }
        result.push(step)
      }
    }
  }

  private async getLookups<T extends Doc>(
    _class: Ref<Class<T>>,
    lookup: Lookup<T> | undefined,
    parent?: string
  ): Promise<LookupStep[]> {
    if (lookup === undefined) return []
    const result: [] = []
    await this.getLookupValue(_class, lookup, result, parent)
    return result
  }

  private async fillLookup<T extends Doc>(
    _class: Ref<Class<T>>,
    object: any,
    key: string,
    fullKey: string,
    targetObject: any
  ): Promise<void> {
    if (targetObject.$lookup === undefined) {
      targetObject.$lookup = {}
    }
    const domain = this.hierarchy.getDomain(_class)
    if (domain !== DOMAIN_MODEL) {
      const arr = object[fullKey]
      if (arr !== undefined && Array.isArray(arr)) {
        if (arr.length === 1) {
          targetObject.$lookup[key] = arr[0]
        } else if (arr.length > 1) {
          targetObject.$lookup[key] = arr
        }
      }
    } else {
      targetObject.$lookup[key] = (await this.modelDb.findAll(_class, { _id: targetObject[key] }))[0]
    }
  }

  private async fillLookupValue<T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    lookup: Lookup<T> | undefined,
    object: any,
    parent?: string,
    parentObject?: any
  ): Promise<void> {
    if (lookup === undefined) return
    for (const key in lookup) {
      if (key === '_id') {
        await this.fillReverseLookup(clazz, lookup, object, parent, parentObject)
        continue
      }
      const value = (lookup as any)[key]
      const tkey = this.checkMixinKey(key, clazz).split('.').join('')
      const fullKey = parent !== undefined ? parent + tkey + '_lookup' : tkey + '_lookup'
      const targetObject = parentObject ?? object
      if (Array.isArray(value)) {
        const [_class, nested] = value
        await this.fillLookup(_class, object, key, fullKey, targetObject)
        await this.fillLookupValue(ctx, _class, nested, object, fullKey, targetObject.$lookup[key])
      } else {
        await this.fillLookup(value, object, key, fullKey, targetObject)
      }
    }
  }

  private async fillReverseLookup<T extends Doc>(
    clazz: Ref<Class<T>>,
    lookup: ReverseLookups,
    object: any,
    parent?: string,
    parentObject?: any
  ): Promise<void> {
    const targetObject = parentObject ?? object
    if (targetObject.$lookup === undefined) {
      targetObject.$lookup = {}
    }
    for (const key in lookup._id) {
      const value = lookup._id[key]
      let _class: Ref<Class<Doc>>
      let attr = 'attachedTo'

      if (Array.isArray(value)) {
        _class = value[0]
        attr = value[1]
      } else {
        _class = value
      }
      const domain = this.hierarchy.getDomain(_class)
      const tkey = this.checkMixinKey(key, clazz).split('.').join('')
      const fullKey = parent !== undefined ? parent + tkey + '_lookup' : tkey + '_lookup'
      if (domain !== DOMAIN_MODEL) {
        const arr = object[fullKey]
        targetObject.$lookup[key] = arr
      } else {
        const arr = await this.modelDb.findAll(_class, { [attr]: targetObject._id })
        targetObject.$lookup[key] = arr
      }
    }
  }

  private async fillSortPipeline<T extends Doc>(
    clazz: Ref<Class<T>>,
    options: FindOptions<T> | undefined,
    pipeline: any[]
  ): Promise<void> {
    if (options?.sort !== undefined) {
      const sort = {} as any
      for (const _key in options.sort) {
        const key = this.translateKey(_key, clazz)

        if (typeof options.sort[_key] === 'object') {
          const rules = options.sort[_key] as SortingRules<T>
          fillCustomSort(rules, key, pipeline, sort, options, _key)
        } else if (this.isDate(clazz, _key)) {
          fillDateSort(key, pipeline, sort, options, _key)
        } else {
          // Sort enum if no special sorting is defined.
          const enumOf = this.getEnumById(clazz, _key)
          if (enumOf !== undefined) {
            fillEnumSort(enumOf, key, pipeline, sort, options, _key)
          } else {
            // Ordinary sort field.
            sort[key] = options.sort[_key] === SortingOrder.Ascending ? 1 : -1
          }
        }
      }
      pipeline.push({ $sort: sort })
    }
  }

  private async findWithPipeline<T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> & {
      domain?: Domain // Allow to find for Doc's in specified domain only.
    }
  ): Promise<FindResult<T>> {
    const pipeline: any[] = []
    const match = { $match: this.translateQuery(clazz, query) }
    const slowPipeline = isLookupQuery(query) || isLookupSort(options?.sort)
    const steps = await this.getLookups(clazz, options?.lookup)
    if (slowPipeline) {
      for (const step of steps) {
        pipeline.push({ $lookup: step })
      }
    }
    pipeline.push(match)
    const totalPipeline: any[] = [...pipeline]
    await this.fillSortPipeline(clazz, options, pipeline)
    if (options?.limit !== undefined || typeof query._id === 'string') {
      pipeline.push({ $limit: options?.limit ?? 1 })
    }
    if (!slowPipeline) {
      for (const step of steps) {
        pipeline.push({ $lookup: step })
      }
    }
    if (options?.projection !== undefined) {
      const projection: Projection<T> = {}
      for (const key in options.projection) {
        const ckey = this.checkMixinKey<T>(key, clazz) as keyof T
        projection[ckey] = options.projection[key]
      }
      pipeline.push({ $project: projection })
    } else {
      pipeline.push({ $project: { '%hash%': 0 } })
    }

    // const domain = this.hierarchy.getDomain(clazz)
    const domain = options?.domain ?? this.hierarchy.getDomain(clazz)
    const cursor = this.collection(domain).aggregate<WithLookup<T>>(pipeline, {
      checkKeys: false,
      enableUtf8Validation: false
    })
    let result: WithLookup<T>[] = []
    let total = options?.total === true ? 0 : -1
    try {
      result = await ctx.with('toArray', {}, async (ctx) => await toArray(cursor), {
        domain,
        pipeline
      })
    } catch (e) {
      console.error('error during executing cursor in findWithPipeline', clazz, cutObjectArray(query), options, e)
      throw e
    }
    for (const row of result) {
      await ctx.with('fill-lookup', {}, async (ctx) => {
        await this.fillLookupValue(ctx, clazz, options?.lookup, row)
      })
      this.clearExtraLookups(row)
    }
    if (options?.total === true) {
      totalPipeline.push({ $count: 'total' })
      const totalCursor = this.collection(domain).aggregate(totalPipeline, {
        checkKeys: false
      })
      const arr = await toArray(totalCursor)
      total = arr?.[0]?.total ?? 0
    }
    return toFindResult(this.stripHash(result), total)
  }

  private translateKey<T extends Doc>(key: string, clazz: Ref<Class<T>>): string {
    const arr = key.split('.').filter((p) => p)
    let tKey = ''

    for (let i = 0; i < arr.length; i++) {
      const element = arr[i]
      if (element === '$lookup') {
        tKey += arr[++i] + '_lookup'
      } else {
        if (!tKey.endsWith('.') && i > 0) {
          tKey += '.'
        }
        tKey += arr[i]
        if (i !== arr.length - 1) {
          tKey += '.'
        }
      }
      // Check if key is belong to mixin class, we need to add prefix.
      tKey = this.checkMixinKey<T>(tKey, clazz)
    }

    return tKey
  }

  private clearExtraLookups (row: any): void {
    for (const key in row) {
      if (key.endsWith('_lookup')) {
        // eslint-disable-next-line
        delete row[key]
      }
    }
  }

  private checkMixinKey<T extends Doc>(key: string, clazz: Ref<Class<T>>): string {
    if (!key.includes('.')) {
      try {
        const attr = this.hierarchy.findAttribute(clazz, key)
        if (attr !== undefined && this.hierarchy.isMixin(attr.attributeOf)) {
          // It is mixin
          key = attr.attributeOf + '.' + key
        }
      } catch (err: any) {
        // ignore, if
      }
    }
    return key
  }

  private getEnumById<T extends Doc>(_class: Ref<Class<T>>, key: string): Enum | undefined {
    const attr = this.hierarchy.findAttribute(_class, key)
    if (attr !== undefined) {
      if (attr.type._class === core.class.EnumOf) {
        const ref = (attr.type as EnumOf).of
        return this.modelDb.getObject<Enum>(ref)
      }
    }
    return undefined
  }

  private isEnumSort<T extends Doc>(_class: Ref<Class<T>>, options?: FindOptions<T>): boolean {
    if (options?.sort === undefined) return false
    return Object.keys(options.sort).some(
      (key) => this.hierarchy.findAttribute(_class, key)?.type?._class === core.class.EnumOf
    )
  }

  private isDate<T extends Doc>(_class: Ref<Class<T>>, key: string): boolean {
    const attr = this.hierarchy.findAttribute(_class, key)
    if (attr !== undefined) {
      return attr.type._class === core.class.TypeDate
    }
    return false
  }

  private isRulesSort<T extends Doc>(options?: FindOptions<T>): boolean {
    if (options?.sort !== undefined) {
      return Object.values(options.sort).some((it) => typeof it === 'object')
    }
    return false
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> & {
      domain?: Domain // Allow to find for Doc's in specified domain only.
    }
  ): Promise<FindResult<T>> {
    if (options != null && (options?.lookup != null || this.isEnumSort(_class, options) || this.isRulesSort(options))) {
      return await ctx.with('pipeline', {}, async (ctx) => await this.findWithPipeline(ctx, _class, query, options))
    }
    const domain = options?.domain ?? this.hierarchy.getDomain(_class)
    const coll = this.collection(domain)
    const mongoQuery = this.translateQuery(_class, query)

    let cursor = coll.find<T>(mongoQuery, {
      checkKeys: false
    })

    if (options?.projection !== undefined) {
      const projection = this.calcProjection<T>(options, _class)
      if (projection != null) {
        cursor = cursor.project(projection)
      }
    }
    let total: number = -1
    if (options != null) {
      if (options.sort !== undefined) {
        const sort = this.collectSort<T>(options, _class)
        if (sort !== undefined) {
          cursor = cursor.sort(sort)
        }
      }
      if (options.limit !== undefined || typeof query._id === 'string') {
        if (options.total === true) {
          total = await coll.countDocuments(mongoQuery)
        }
        cursor = cursor.limit(options.limit ?? 1)
      }
    }

    // Error in case of timeout
    try {
      const res: T[] = await ctx.with('toArray', {}, async (ctx) => await toArray(cursor), {
        mongoQuery,
        options,
        domain
      })
      if (options?.total === true && options?.limit === undefined) {
        total = res.length
      }
      return toFindResult(this.stripHash(res), total)
    } catch (e) {
      console.error('error during executing cursor in findAll', _class, cutObjectArray(query), options, e)
      throw e
    }
  }

  private collectSort<T extends Doc>(
    options:
    | (FindOptions<T> & {
      domain?: Domain | undefined // Allow to find for Doc's in specified domain only.
    })
    | undefined,
    _class: Ref<Class<T>>
  ): Sort | undefined {
    if (options?.sort === undefined) {
      return undefined
    }
    const sort: Sort = {}
    let count = 0
    for (const key in options.sort) {
      const ckey = this.checkMixinKey<T>(key, _class)
      const order = options.sort[key] === SortingOrder.Ascending ? 1 : -1
      sort[ckey] = order
      count++
    }
    if (count === 0) {
      return undefined
    }
    return sort
  }

  private calcProjection<T extends Doc>(
    options:
    | (FindOptions<T> & {
      domain?: Domain | undefined // Allow to find for Doc's in specified domain only.
    })
    | undefined,
    _class: Ref<Class<T>>
  ): Projection<T> | undefined {
    if (options?.projection === undefined) {
      return undefined
    }
    const projection: Projection<T> = {}
    let count = 0
    for (const key in options.projection ?? []) {
      const ckey = this.checkMixinKey<T>(key, _class) as keyof T
      projection[ckey] = options.projection[key]
      count++
    }
    if (count === 0) {
      return undefined
    }
    return projection
  }

  stripHash<T extends Doc>(docs: T[]): T[] {
    docs.forEach((it) => {
      if ('%hash%' in it) {
        delete it['%hash%']
      }
      return it
    })
    return docs
  }

  find (_ctx: MeasureContext, domain: Domain, recheck?: boolean): StorageIterator {
    const ctx = _ctx.newChild('find', { domain })
    const coll = this.db.collection<Doc>(domain)
    let mode: 'hashed' | 'non-hashed' = 'hashed'
    let iterator: FindCursor<Doc>
    const bulkUpdate = new Map<Ref<Doc>, string>()
    const flush = async (flush = false): Promise<void> => {
      if (bulkUpdate.size > 1000 || flush) {
        if (bulkUpdate.size > 0) {
          await ctx.with(
            'bulk-write',
            {},
            async () =>
              await coll.bulkWrite(
                Array.from(bulkUpdate.entries()).map((it) => ({
                  updateOne: {
                    filter: { _id: it[0] },
                    update: { $set: { '%hash%': it[1] } }
                  }
                }))
              )
          )
        }
        bulkUpdate.clear()
      }
    }

    return {
      next: async () => {
        if (iterator === undefined) {
          if (recheck === true) {
            await coll.updateMany({ '%hash%': { $ne: null } }, { $set: { '%hash%': null } })
          }
          iterator = coll.find(
            { '%hash%': { $nin: ['', null] } },
            {
              projection: {
                '%hash%': 1,
                _id: 1
              }
            }
          )
        }
        let d = await ctx.with('next', { mode }, async () => await iterator.next())
        if (d == null && mode === 'hashed') {
          mode = 'non-hashed'
          iterator = coll.find({ '%hash%': { $in: ['', null] } })
          d = await ctx.with('next', { mode }, async () => await iterator.next())
        }
        if (d == null) {
          return undefined
        }
        let digest: string | null = (d as any)['%hash%']
        if ('%hash%' in d) {
          delete d['%hash%']
        }
        const pos = (digest ?? '').indexOf('|')
        if (digest == null || digest === '') {
          const cs = ctx.newChild('calc-size', {})
          const size = estimateDocSize(d)
          cs.end()

          if (this.options?.calculateHash !== undefined) {
            digest = this.options.calculateHash(d)
          } else {
            const hash = createHash('sha256')
            updateHashForDoc(hash, d)
            digest = hash.digest('base64')
          }

          bulkUpdate.set(d._id, `${digest}|${size.toString(16)}`)

          await ctx.with('flush', {}, async () => {
            await flush()
          })
          return {
            id: d._id,
            hash: digest,
            size
          }
        } else {
          return {
            id: d._id,
            hash: digest.slice(0, pos),
            size: parseInt(digest.slice(pos + 1), 16)
          }
        }
      },
      close: async () => {
        await ctx.with('flush', {}, async () => {
          await flush(true)
        })
        await ctx.with('close', {}, async () => {
          await iterator.close()
        })
        ctx.end()
      }
    }
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await ctx.with('load', { domain }, async () => {
      if (docs.length === 0) {
        return []
      }
      const cursor = this.db.collection<Doc>(domain).find<Doc>({ _id: { $in: docs } }, { limit: docs.length })
      const result = await toArray(cursor)
      return this.stripHash(result)
    })
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    await ctx.with('upload', { domain }, async () => {
      const coll = this.collection(domain)

      await uploadDocuments(ctx, docs, coll)
    })
  }

  async update (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {
    await ctx.with('update', { domain }, async () => {
      const coll = this.collection(domain)

      // remove old and insert new ones
      const ops = Array.from(operations.entries())
      let skip = 500
      while (ops.length > 0) {
        const part = ops.splice(0, skip)
        try {
          await ctx.with('bulk-write', {}, async () => {
            await coll.bulkWrite(
              part.map((it) => {
                const { $unset, ...set } = it[1] as any
                if ($unset !== undefined) {
                  for (const k of Object.keys(set)) {
                    if ($unset[k] === '') {
                      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                      delete $unset[k]
                    }
                  }
                }
                return {
                  updateOne: {
                    filter: { _id: it[0] },
                    update: {
                      $set: { ...set, '%hash%': null },
                      ...($unset !== undefined ? { $unset } : {})
                    }
                  }
                }
              })
            )
          })
        } catch (err: any) {
          ctx.error('failed on bulk write', { error: err, skip })
          if (skip !== 1) {
            ops.push(...part)
            skip = 1 // Let's update one by one, to loose only one failed variant.
          }
        }
      }
    })
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await ctx.with('clean', {}, async () => {
      await this.db.collection<Doc>(domain).deleteMany({ _id: { $in: docs } })
    })
  }
}

interface DomainOperation {
  raw: () => Promise<TxResult>
  domain: Domain
  bulk?: AnyBulkWriteOperation[]
}

class MongoAdapter extends MongoAdapterBase {
  async init (): Promise<void> {
    await this._db.init()
  }

  getOperations (tx: Tx): DomainOperation | undefined {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        return this.txCreateDoc(tx as TxCreateDoc<Doc>)
      case core.class.TxCollectionCUD:
        return this.txCollectionCUD(tx as TxCollectionCUD<Doc, AttachedDoc>)
      case core.class.TxUpdateDoc:
        return this.txUpdateDoc(tx as TxUpdateDoc<Doc>)
      case core.class.TxRemoveDoc:
        return this.txRemoveDoc(tx as TxRemoveDoc<Doc>)
      case core.class.TxMixin:
        return this.txMixin(tx as TxMixin<Doc, Doc>)
      case core.class.TxApplyIf:
        return undefined
    }

    console.error('Unknown/Unsupported operation:', tx._class, tx)
  }

  async tx (ctx: MeasureContext, ...txes: Tx[]): Promise<TxResult[]> {
    const result: TxResult[] = []

    const bulkOperations: DomainOperation[] = []

    let lastDomain: Domain | undefined

    const bulkExecute = async (): Promise<void> => {
      if (lastDomain === undefined || bulkOperations.length === 0) {
        return
      }
      const ops = bulkOperations.reduce<AnyBulkWriteOperation[]>((ops, op) => ops.concat(...(op.bulk ?? [])), [])
      try {
        await this.db.collection(lastDomain).bulkWrite(ops)
      } catch (err: any) {
        console.trace(err)
        throw err
      }
      bulkOperations.splice(0, bulkOperations.length)
      lastDomain = undefined
    }

    if (txes.length > 1) {
      for (const tx of txes) {
        const dop: DomainOperation | undefined = this.getOperations(tx)
        if (dop === undefined) {
          continue
        }
        if (dop.bulk === undefined) {
          // Execute previous bulk and capture result.
          await ctx.with(
            'bulkExecute',
            {},
            async () => {
              await bulkExecute()
            },
            { txes: cutObjectArray(tx) }
          )
          try {
            result.push(await dop.raw())
          } catch (err: any) {
            console.error(err)
          }
          continue
        }
        if (lastDomain === undefined) {
          lastDomain = dop.domain
        }
        if (lastDomain !== dop.domain) {
          // If we have domain switch, let's execute previous bulk and start new one.
          await ctx.with(
            'bulkExecute',
            {},
            async () => {
              await bulkExecute()
            },
            { operations: cutObjectArray(bulkOperations) }
          )
          lastDomain = dop.domain
        }
        bulkOperations.push(dop)
      }
      await ctx.with('bulkExecute', {}, async () => {
        await bulkExecute()
      })
    } else {
      const r = await this.getOperations(txes[0])?.raw()
      if (r !== undefined) {
        result.push(r)
      }
    }
    return result
  }

  protected txCollectionCUD (tx: TxCollectionCUD<Doc, AttachedDoc>): DomainOperation {
    // We need update only create transactions to contain attached, attachedToClass.
    if (tx.tx._class === core.class.TxCreateDoc) {
      const createTx = tx.tx as TxCreateDoc<AttachedDoc>
      const d: TxCreateDoc<AttachedDoc> = {
        ...createTx,
        attributes: {
          ...createTx.attributes,
          attachedTo: tx.objectId,
          attachedToClass: tx.objectClass,
          collection: tx.collection
        }
      }
      return this.txCreateDoc(d)
    }
    // We could cast since we know collection cud is supported.
    return this.getOperations(tx.tx) as DomainOperation
  }

  protected txRemoveDoc (tx: TxRemoveDoc<Doc>): DomainOperation {
    const domain = this.hierarchy.getDomain(tx.objectClass)
    return {
      raw: async () => await this.collection(domain).deleteOne({ _id: tx.objectId }),
      domain,
      bulk: [{ deleteOne: { filter: { _id: tx.objectId } } }]
    }
  }

  protected txMixin (tx: TxMixin<Doc, Doc>): DomainOperation {
    const domain = this.hierarchy.getDomain(tx.objectClass)

    const filter = { _id: tx.objectId }
    const modifyOp = {
      modifiedBy: tx.modifiedBy,
      modifiedOn: tx.modifiedOn
    }
    const attributes = this.excludeUnsupportedOperations(tx.attributes)
    if (isOperator(attributes)) {
      const operator = Object.keys(tx.attributes)[0]
      if (operator === '$move') {
        const keyval = (tx.attributes as any).$move
        const arr = tx.mixin + '.' + Object.keys(keyval)[0]
        const desc = keyval[arr]
        const ops: any = [
          { updateOne: { filter, update: { $pull: { [arr]: desc.$value } } } },
          {
            updateOne: {
              filter,
              update: { $set: modifyOp, $push: { [arr]: { $each: [desc.$value], $position: desc.$position } } }
            }
          }
        ]
        return {
          raw: async () => await this.collection(domain).bulkWrite(ops),
          domain,
          bulk: ops
        }
      }
      const update = { ...this.translateMixinAttrs(tx.mixin, attributes), $set: { ...modifyOp } }
      return {
        raw: async () => await this.collection(domain).updateOne(filter, update),
        domain,
        bulk: [
          {
            updateOne: {
              filter,
              update
            }
          }
        ]
      }
    }
    const update = { $set: { ...this.translateMixinAttrs(tx.mixin, attributes), ...modifyOp } }
    return {
      raw: async () => await this.collection(domain).updateOne(filter, update),
      domain,
      bulk: [
        {
          updateOne: {
            filter,
            update
          }
        }
      ]
    }
  }

  private excludeUnsupportedOperations (attributes: Record<string, any>): Record<string, any> {
    const operations = ['$markup', '$pushMixin']
    return Object.fromEntries(Object.entries(attributes).filter(([key]) => !operations.includes(key)))
  }

  private translateMixinAttrs (mixin: Ref<Mixin<Doc>>, attributes: Record<string, any>): Record<string, any> {
    const attrs: Record<string, any> = {}
    let count = 0
    for (const [k, v] of Object.entries(attributes)) {
      if (k.startsWith('$')) {
        attrs[k] = this.translateMixinAttrs(mixin, v)
      } else {
        attrs[mixin + '.' + k] = v
      }
      count++
    }

    if (count === 0) {
      // We need at least one attribute, to be inside for first time,
      // for mongo to create embedded object, if we don't want to get object first.
      attrs[mixin + '.' + '__mixin'] = 'true'
    }
    return attrs
  }

  protected txCreateDoc (tx: TxCreateDoc<Doc>): DomainOperation {
    const doc = TxProcessor.createDoc2Doc(tx)
    const domain = this.hierarchy.getDomain(doc._class)
    const tdoc = translateDoc(doc)
    return {
      raw: async () => await this.collection(domain).insertOne(tdoc),
      domain,
      bulk: [
        {
          insertOne: { document: tdoc }
        }
      ]
    }
  }

  protected txUpdateDoc (tx: TxUpdateDoc<Doc>): DomainOperation {
    const domain = this.hierarchy.getDomain(tx.objectClass)
    const operations = this.excludeUnsupportedOperations(tx.operations)
    if (isOperator(operations)) {
      const operator = Object.keys(operations)[0]
      if (operator === '$move') {
        const keyval = (tx.operations as any).$move
        const arr = Object.keys(keyval)[0]
        const desc = keyval[arr]

        const ops: any = [
          {
            updateOne: {
              filter: { _id: tx.objectId },
              update: {
                $set: {
                  '%hash%': null
                },
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
                $set: {
                  modifiedBy: tx.modifiedBy,
                  modifiedOn: tx.modifiedOn,
                  '%hash%': null
                },
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
        return {
          raw: async () => await this.collection(domain).bulkWrite(ops),
          domain,
          bulk: ops
        }
      } else if (operator === '$update') {
        const keyval = (operations as any).$update
        const arr = Object.keys(keyval)[0]
        const desc = keyval[arr] as QueryUpdate<any>
        const ops = [
          {
            updateOne: {
              filter: {
                _id: tx.objectId,
                ...Object.fromEntries(Object.entries(desc.$query).map((it) => [arr + '.' + it[0], it[1]]))
              },
              update: {
                $set: {
                  ...Object.fromEntries(Object.entries(desc.$update).map((it) => [arr + '.$.' + it[0], it[1]])),
                  '%hash%': null
                }
              }
            }
          },
          {
            updateOne: {
              filter: { _id: tx.objectId },
              update: {
                $set: {
                  modifiedBy: tx.modifiedBy,
                  modifiedOn: tx.modifiedOn,
                  '%hash%': null
                }
              }
            }
          }
        ]
        return {
          raw: async () => await this.collection(domain).bulkWrite(ops),
          domain,
          bulk: ops
        }
      } else {
        if (tx.retrieve === true) {
          const raw = async (): Promise<TxResult> => {
            const result = await this.collection(domain).findOneAndUpdate(
              { _id: tx.objectId },
              {
                ...tx.operations,
                $set: {
                  modifiedBy: tx.modifiedBy,
                  modifiedOn: tx.modifiedOn,
                  '%hash%': null
                }
              } as unknown as UpdateFilter<Document>,
              { returnDocument: 'after', includeResultMetadata: true }
            )
            return { object: result.value }
          }
          return {
            raw,
            domain,
            bulk: undefined
          }
        } else {
          const filter = { _id: tx.objectId }
          const update = {
            ...operations,
            $set: {
              modifiedBy: tx.modifiedBy,
              modifiedOn: tx.modifiedOn,
              '%hash%': null
            }
          }
          return {
            raw: async () => await this.collection(domain).updateOne(filter, update),
            domain,
            bulk: [{ updateOne: { filter, update } }]
          }
        }
      }
    } else {
      const filter = { _id: tx.objectId }
      const update = {
        $set: {
          ...operations,
          modifiedBy: tx.modifiedBy,
          modifiedOn: tx.modifiedOn,
          '%hash%': null
        }
      }
      const raw =
        tx.retrieve === true
          ? async (): Promise<TxResult> => {
            const result = await this.db
              .collection(domain)
              .findOneAndUpdate(filter, update, { returnDocument: 'after', includeResultMetadata: true })
            return { object: result.value }
          }
          : async () => await this.collection(domain).updateOne(filter, update)

      // Disable bulk for operators
      return {
        raw,
        domain,
        bulk: [{ updateOne: { filter, update } }]
      }
    }
  }
}

class MongoTxAdapter extends MongoAdapterBase implements TxAdapter {
  txColl: Collection | undefined

  async init (): Promise<void> {
    await this._db.init(DOMAIN_TX)
  }

  override async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    if (tx.length === 0) {
      return []
    }
    await ctx.with('insertMany', {}, async () => await this.txCollection().insertMany(tx.map((it) => translateDoc(it))))
    return []
  }

  private txCollection (): Collection {
    if (this.txColl !== undefined) {
      return this.txColl
    }
    this.txColl = this.db.collection(DOMAIN_TX)
    return this.txColl
  }

  async getModel (ctx: MeasureContext): Promise<Tx[]> {
    const cursor = await ctx.with('find', {}, async () =>
      this.db.collection<Tx>(DOMAIN_TX).find(
        { objectSpace: core.space.Model },
        {
          sort: {
            _id: 1,
            modifiedOn: 1
          },
          projection: {
            '%hash%': 0
          }
        }
      )
    )
    const model = await ctx.with('to-array', {}, async () => await toArray<Tx>(cursor))
    // We need to put all core.account.System transactions first
    const systemTx: Tx[] = []
    const userTx: Tx[] = []

    // Ignore Employee accounts.
    function isPersonAccount (tx: Tx): boolean {
      return (
        (tx._class === core.class.TxCreateDoc ||
          tx._class === core.class.TxUpdateDoc ||
          tx._class === core.class.TxRemoveDoc) &&
        ((tx as TxCUD<Doc>).objectClass === 'contact:class:PersonAccount' ||
          (tx as TxCUD<Doc>).objectClass === 'contact:class:EmployeeAccount')
      )
    }
    model.forEach((tx) => (tx.modifiedBy === core.account.System && !isPersonAccount(tx) ? systemTx : userTx).push(tx))
    return systemTx.concat(userTx)
  }
}

export async function uploadDocuments (ctx: MeasureContext, docs: Doc[], coll: Collection<Document>): Promise<void> {
  const ops = Array.from(docs)

  while (ops.length > 0) {
    const part = ops.splice(0, 500)
    await coll.bulkWrite(
      part.map((it) => {
        const digest: string | null = (it as any)['%hash%']
        if ('%hash%' in it) {
          delete it['%hash%']
        }
        const cs = ctx.newChild('calc-size', {})
        const size = calculateObjectSize(it)
        cs.end()

        return {
          replaceOne: {
            filter: { _id: it._id },
            replacement: { ...it, '%hash%': digest == null ? null : `${digest}|${size.toString(16)}` },
            upsert: true
          }
        }
      })
    )
  }
}

function fillEnumSort (
  enumOf: Enum,
  key: string,
  pipeline: any[],
  sort: any,
  options: FindOptions<Doc>,
  _key: string
): void {
  const branches = enumOf.enumValues.map((value, index) => {
    return { case: { $eq: [`$${key}`, value] }, then: index }
  })
  pipeline.push({
    $addFields: {
      [`sort_${key}`]: {
        $switch: {
          branches,
          default: enumOf.enumValues.length
        }
      }
    }
  })
  if (options.sort === undefined) {
    options.sort = {}
  }
  sort[`sort_${key}`] = options.sort[_key] === SortingOrder.Ascending ? 1 : -1
}
function fillDateSort (key: string, pipeline: any[], sort: any, options: FindOptions<Doc>, _key: string): void {
  if (options.sort === undefined) {
    options.sort = {}
  }
  pipeline.push({
    $addFields: {
      [`sort_isNull_${key}`]: { $or: [{ $eq: [`$${key}`, null] }, { $eq: [{ $type: `$${key}` }, 'missing'] }] }
    }
  })
  sort[`sort_isNull_${key}`] = options.sort[_key] === SortingOrder.Ascending ? 1 : -1
  sort[key] = options.sort[_key] === SortingOrder.Ascending ? 1 : -1
}
function fillCustomSort<T extends Doc> (
  rules: SortingRules<T>,
  key: string,
  pipeline: any[],
  sort: any,
  options: FindOptions<Doc>,
  _key: string
): void {
  const branches = rules.cases.map((selector) => {
    if (typeof selector.query === 'object') {
      const q = selector.query as SortQuerySelector<T>
      if (q.$in !== undefined) {
        return { case: { $in: { [key]: q.$in } }, then: selector.index }
      }
      if (q.$nin !== undefined) {
        return { case: { $nin: { [key]: q.$in } }, then: selector.index }
      }
      if (q.$ne !== undefined) {
        return { case: { $ne: [`$${key}`, q.$ne] }, then: selector.index }
      }
    }
    return { case: { $eq: [`$${key}`, selector.query] }, then: selector.index }
  })
  pipeline.push({
    $addFields: {
      [`sort_${key}`]: {
        $switch: {
          branches,
          default: rules.default ?? branches.length
        }
      }
    }
  })
  if (options.sort === undefined) {
    options.sort = {}
  }
  sort[`sort_${key}`] = rules.order === SortingOrder.Ascending ? 1 : -1
}

function translateLikeQuery (pattern: string): { $regex: string, $options: string } {
  return {
    $regex: `^${pattern
      .split('%')
      .map((it) => escapeLikeForRegexp(it))
      .join('.*')}$`,
    $options: 'i'
  }
}

/**
 * @public
 */
export async function createMongoAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb,
  storage?: StorageAdapter,
  options?: DbAdapterOptions
): Promise<DbAdapter> {
  const client = getMongoClient(url)
  const db = getWorkspaceDB(await client.getClient(), workspaceId)

  return new MongoAdapter(db, hierarchy, modelDb, client, options)
}

/**
 * @public
 */
export async function createMongoTxAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb
): Promise<TxAdapter> {
  const client = getMongoClient(url)
  const db = getWorkspaceDB(await client.getClient(), workspaceId)
  return new MongoTxAdapter(db, hierarchy, modelDb, client)
}
