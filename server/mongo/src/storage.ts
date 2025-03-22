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
  DOMAIN_MODEL_TX,
  DOMAIN_RELATION,
  DOMAIN_TX,
  SortingOrder,
  TxProcessor,
  addOperation,
  cutObjectArray,
  escapeLikeForRegexp,
  groupByArray,
  isOperator,
  matchQuery,
  platformNow,
  toFindResult,
  withContext,
  type AssociationQuery,
  type Class,
  type Doc,
  type DocInfo,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type Enum,
  type EnumOf,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type Iterator,
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
  type TxCreateDoc,
  type TxMixin,
  type TxRemoveDoc,
  type TxResult,
  type TxUpdateDoc,
  type WithLookup,
  type WorkspaceIds
} from '@hcengineering/core'
import {
  calcHashHash,
  type DbAdapter,
  type DbAdapterHandler,
  type DomainHelperOperations,
  type RawFindIterator,
  type ServerFindOptions,
  type StorageAdapter,
  type TxAdapter
} from '@hcengineering/server-core'
import {
  type AbstractCursor,
  type AnyBulkWriteOperation,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type FindCursor,
  type FindOptions as MongoFindOptions,
  type Sort,
  type UpdateFilter,
  type WithId
} from 'mongodb'
import { DBCollectionHelper, getMongoClient, getWorkspaceMongoDB, type MongoClientReference } from './utils'

function translateDoc (doc: Doc, hash: string): Doc {
  return { ...doc, '%hash%': hash } as any
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
  const data: T[] = []

  while (true) {
    const d = await cursor.next()
    if (d === null) {
      break
    }
    data.push(d)
    const batch = cursor.readBufferedDocuments()
    if (batch.length > 0) {
      data.push(...batch)
    }
  }
  await cursor.close()
  return data
}

export interface DbAdapterOptions {
  calculateHash?: (doc: Doc) => { digest: string, size: number }
}

abstract class MongoAdapterBase implements DbAdapter {
  _db: DBCollectionHelper

  handlers: DbAdapterHandler[] = []

  on (handler: DbAdapterHandler): void {
    this.handlers.push(handler)
  }

  handleEvent (domain: Domain, event: 'add' | 'update' | 'delete' | 'read', count: number): void {
    for (const handler of this.handlers) {
      handler(domain, event, count, this._db)
    }
  }

  constructor (
    protected readonly db: Db,
    protected readonly hierarchy: Hierarchy,
    protected readonly modelDb: ModelDb,
    protected readonly client: MongoClientReference,
    protected readonly options?: DbAdapterOptions
  ) {
    this._db = new DBCollectionHelper(db)
  }

  async traverse<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Pick<FindOptions<T>, 'sort' | 'limit' | 'projection'>
  ): Promise<Iterator<T>> {
    let cursor = this.db.collection(domain).find<T>(this.translateRawQuery(query))
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
    return {
      next: async (size: number) => {
        const docs: T[] = []
        while (docs.length < size && (await cursor.hasNext())) {
          try {
            const d = await cursor.next()
            if (d !== null) {
              docs.push(d)
            } else {
              break
            }
          } catch (err) {
            console.error(err)
            return null
          }
        }
        return docs
      },
      close: () => cursor.close()
    }
  }

  private translateRawQuery<T extends Doc>(query: DocumentQuery<T>): Filter<Document> {
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

  async rawFindAll<T extends Doc>(domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<T[]> {
    let cursor = this.db.collection(domain).find<T>(this.translateRawQuery(query))
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
    if (options?.projection !== undefined) {
      const projection: Projection<T> = {}
      for (const key in options.projection ?? []) {
        projection[key] = options.projection[key]
      }
      cursor = cursor.project(projection)
    }
    return await cursor.toArray()
  }

  async rawUpdate<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: DocumentUpdate<T>
  ): Promise<void> {
    if (isOperator(operations)) {
      await this.db.collection(domain).updateMany(this.translateRawQuery(query), { $set: { '%hash%': this.curHash() } })
      await this.db
        .collection(domain)
        .updateMany(this.translateRawQuery(query), { ...operations } as unknown as UpdateFilter<Document>)
    } else {
      await this.db
        .collection(domain)
        .updateMany(this.translateRawQuery(query), { $set: { ...operations, '%hash%': this.curHash() } })
    }
  }

  rawDeleteMany<T extends Doc>(domain: Domain, query: DocumentQuery<T>): Promise<void> {
    return this.db.collection(domain).deleteMany(this.translateRawQuery(query)).then()
  }

  abstract init (ctx: MeasureContext): Promise<void>

  collection<TSchema extends Document = Document>(domain: Domain): Collection<TSchema> {
    return this._db.collection(domain)
  }

  helper (): DomainHelperOperations {
    return this._db
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  close (): Promise<void> {
    this.client.close()
    return Promise.resolve()
  }

  private translateQuery<T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): { base: Filter<Document>, lookup: Filter<Document> } {
    const translatedBase: any = {}
    const translatedLookup: any = {}

    const mixins = new Set<Ref<Class<Doc>>>()
    for (const key in query) {
      const value = (query as any)[key]

      const tkey = this.translateKey(key, clazz, mixins)

      const translated = tkey.lookup ? translatedLookup : translatedBase
      if (value !== null && typeof value === 'object') {
        const keys = Object.keys(value)
        if (keys[0] === '$like') {
          translated[tkey.key] = translateLikeQuery(value.$like as string)
          continue
        }
      }
      translated[tkey.key] = value
    }
    if (options?.skipSpace === true) {
      delete translatedBase.space
    }
    if (options?.skipClass === true) {
      delete translatedBase._class
      return { base: translatedBase, lookup: translatedLookup }
    }
    const baseClass = this.hierarchy.getBaseClass(clazz)
    if (baseClass !== core.class.Doc) {
      const classes = Array.from(
        new Set(this.hierarchy.getDescendants(baseClass).filter((it) => !this.hierarchy.isMixin(it)))
      )

      // Only replace if not specified
      if (translatedBase._class === undefined) {
        translatedBase._class = { $in: classes }
      } else if (typeof translatedBase._class === 'string') {
        if (!classes.includes(translatedBase._class)) {
          translatedBase._class = classes.length === 1 ? classes[0] : { $in: classes }
        }
      } else if (typeof translatedBase._class === 'object' && translatedBase._class !== null) {
        let descendants: Ref<Class<Doc>>[] = classes

        if (Array.isArray(translatedBase._class.$in)) {
          const classesIds = new Set(classes)
          descendants = translatedBase._class.$in.filter((c: Ref<Class<Doc>>) => classesIds.has(c))
        }

        if (translatedBase._class != null && Array.isArray(translatedBase._class.$nin)) {
          const excludedClassesIds = new Set<Ref<Class<Doc>>>(translatedBase._class.$nin)
          descendants = descendants.filter((c) => !excludedClassesIds.has(c))
        }

        const desc = Array.from(
          new Set(descendants.filter((it: any) => !this.hierarchy.isMixin(it as Ref<Class<Doc>>)))
        )
        translatedBase._class = desc.length === 1 ? desc[0] : { $in: desc }
      }

      if (baseClass !== clazz && !mixins.has(clazz)) {
        // Add an mixin to be exists flag
        translatedBase[clazz] = { $exists: true }
      }
    } else {
      // No need to pass _class in case of fixed domain search.
      if ('_class' in translatedBase) {
        delete translatedBase._class
      }
    }
    if (translatedBase._class?.$in != null && Array.isArray(translatedBase._class.$in)) {
      translatedBase._class.$in = Array.from(new Set(translatedBase._class.$in))
    }
    if (translatedBase._class?.$in?.length === 1 && translatedBase._class?.$nin === undefined) {
      translatedBase._class = translatedBase._class.$in[0]
    }
    return { base: translatedBase, lookup: translatedLookup }
  }

  private getLookupValue<T extends Doc>(
    clazz: Ref<Class<T>>,
    lookup: Lookup<T>,
    result: LookupStep[],
    parent?: string
  ): void {
    for (const key in lookup) {
      if (key === '_id') {
        this.getReverseLookupValue(lookup, result, parent)
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
            as: fullKey.split('.').join('') + '_lookup'
          })
        }
        this.getLookupValue(_class, nested, result, fullKey + '_lookup')
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
            as: fullKey.split('.').join('') + '_lookup'
          })
        }
      }
    }
  }

  private getReverseLookupValue (lookup: ReverseLookups, result: LookupStep[], parent?: string): void {
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
      const desc = this.hierarchy
        .getDescendants(this.hierarchy.getBaseClass(_class))
        .filter((it) => !this.hierarchy.isMixin(it))
      if (domain !== DOMAIN_MODEL) {
        const asVal = as.split('.').join('') + '_lookup'
        const step: LookupStep = {
          from: domain,
          localField: fullKey,
          foreignField: attr,
          pipeline: [
            {
              $match: {
                _class: desc.length === 1 ? desc[0] : { $in: desc }
              }
            }
          ],
          as: asVal
        }
        result.push(step)
      }
    }
  }

  private getLookups<T extends Doc>(
    _class: Ref<Class<T>>,
    lookup: Lookup<T> | undefined,
    parent?: string
  ): LookupStep[] {
    if (lookup === undefined) return []
    const result: [] = []
    this.getLookupValue(_class, lookup, result, parent)
    return result
  }

  private getAssociations (associations: AssociationQuery[]): LookupStep[] {
    const res: LookupStep[] = []
    for (const association of associations) {
      const assoc = this.modelDb.findObject(association[0])
      if (assoc === undefined) continue
      const isReverse = association[1] === -1
      const _class = !isReverse ? assoc.classB : assoc.classA
      const targetDomain = this.hierarchy.getDomain(_class)
      if (targetDomain === DOMAIN_MODEL) continue
      const as = association[0] + '_hidden_association'
      res.push({
        from: DOMAIN_RELATION,
        localField: '_id',
        foreignField: isReverse ? 'docB' : 'docA',
        as
      })
      res.push({
        from: targetDomain,
        localField: as + '.' + (isReverse ? 'docA' : 'docB'),
        foreignField: '_id',
        as: association[0] + '_association'
      })
    }
    return res
  }

  private fillLookup<T extends Doc>(
    _class: Ref<Class<T>>,
    object: any,
    key: string,
    fullKey: string,
    targetObject: any
  ): void {
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
      targetObject.$lookup[key] = this.modelDb.findAllSync(_class, { _id: targetObject[key] })[0]
    }
  }

  private fillAssociationsValue (associations: AssociationQuery[], object: any): Record<string, Doc[]> {
    const res: Record<string, Doc[]> = {}
    for (const association of associations) {
      const assocKey = association[0] + '_hidden_association'
      const data = object[assocKey]
      if (data !== undefined && Array.isArray(data)) {
        const filtered = new Set(
          data.filter((it) => it.association === association[0]).map((it) => (association[1] === 1 ? it.docB : it.docA))
        )
        const fullKey = association[0] + '_association'
        const arr = object[fullKey]
        if (arr !== undefined && Array.isArray(arr)) {
          res[association[0]] = arr.filter((it) => filtered.has(it._id))
        }
      }
    }
    return res
  }

  private fillLookupValue<T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    lookup: Lookup<T> | undefined,
    object: any,
    parent?: string,
    parentObject?: any,
    domainLookup?: {
      field: string
      domain: Domain
    }
  ): void {
    if (lookup === undefined && domainLookup === undefined) return
    for (const key in lookup) {
      if (key === '_id') {
        this.fillReverseLookup(clazz, lookup, object, parent, parentObject)
        continue
      }
      const value = (lookup as any)[key]
      const tkey = this.checkMixinKey(key, clazz).split('.').join('')
      const fullKey = parent !== undefined ? parent + tkey + '_lookup' : tkey + '_lookup'
      const targetObject = parentObject ?? object
      if (Array.isArray(value)) {
        const [_class, nested] = value
        this.fillLookup(_class, object, key, fullKey, targetObject)
        this.fillLookupValue(ctx, _class, nested, object, fullKey, targetObject.$lookup[key])
      } else {
        this.fillLookup(value, object, key, fullKey, targetObject)
      }
    }
    if (domainLookup !== undefined) {
      if (object.$lookup === undefined) {
        object.$lookup = {}
      }
      object.$lookup._id = object['dl_' + domainLookup.field + '_lookup'][0]
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete object['dl_' + domainLookup.field + '_lookup']
    }
  }

  private fillReverseLookup<T extends Doc>(
    clazz: Ref<Class<T>>,
    lookup: ReverseLookups,
    object: any,
    parent?: string,
    parentObject?: any
  ): void {
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
        const arr = this.modelDb.findAllSync(_class, { [attr]: targetObject._id })
        targetObject.$lookup[key] = arr
      }
    }
  }

  private fillSortPipeline<T extends Doc>(
    clazz: Ref<Class<T>>,
    options: FindOptions<T> | undefined,
    pipeline: any[]
  ): void {
    if (options?.sort !== undefined) {
      const sort = {} as any
      for (const _key in options.sort) {
        const { key } = this.translateKey(_key, clazz)

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
    domain: Domain,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options: ServerFindOptions<T>,
    stTime: number
  ): Promise<FindResult<T>> {
    const st = platformNow()
    const pipeline: any[] = []
    const tquery = this.translateQuery(clazz, query, options)

    const slowPipeline = isLookupQuery(query) || isLookupSort(options?.sort) || options.domainLookup !== undefined
    const steps = this.getLookups(clazz, options?.lookup)

    if (options.domainLookup !== undefined) {
      steps.push({
        from: options.domainLookup.domain,
        localField: options.domainLookup.field,
        foreignField: '_id',
        as: 'dl_' + options.domainLookup.field + '_lookup'
      })
    }

    if (options.associations !== undefined && options.associations.length > 0) {
      const assoc = this.getAssociations(options.associations)
      steps.push(...assoc)
    }

    if (slowPipeline) {
      if (Object.keys(tquery.base).length > 0) {
        pipeline.push({ $match: tquery.base })
      }
      for (const step of steps) {
        pipeline.push({ $lookup: step })
      }
      if (Object.keys(tquery.lookup).length > 0) {
        pipeline.push({ $match: tquery.lookup })
      }
    } else {
      if (Object.keys(tquery.base).length > 0) {
        pipeline.push({ $match: { ...tquery.base, ...tquery.lookup } })
      }
    }
    const totalPipeline: any[] = [...pipeline]
    this.fillSortPipeline(clazz, options, pipeline)
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
      for (const step of steps) {
        // We also need to add lookup if original field are in projection.
        if ((projection as any)[step.from] === 1) {
          ;(projection as any)[step.as] = 1
        }
      }
      pipeline.push({ $project: projection })
    }

    const cursor = this.collection(domain).aggregate<WithLookup<T>>(pipeline)
    let result: WithLookup<T>[] = []
    let total = options?.total === true ? 0 : -1
    try {
      result = await ctx.with(
        'aggregate',
        {},
        (ctx) => toArray(cursor),
        () => ({
          domain,
          pipeline,
          clazz
        })
      )
    } catch (e) {
      console.error('error during executing cursor in findWithPipeline', clazz, cutObjectArray(query), options, e)
      throw e
    }
    for (const row of result) {
      ctx.withSync('fill-lookup', {}, (ctx) => {
        this.fillLookupValue(ctx, clazz, options?.lookup, row, undefined, undefined, options.domainLookup)
      })
      if (row.$lookup !== undefined) {
        for (const [, v] of Object.entries(row.$lookup)) {
          this.stripHash(v)
        }
      }
      if (options.associations !== undefined && options.associations.length > 0) {
        row.$associations = this.fillAssociationsValue(options.associations, row)
        for (const [, v] of Object.entries(row.$associations)) {
          this.stripHash(v)
        }
      }
      this.clearExtraLookups(row)
    }
    if (options?.total === true) {
      totalPipeline.push({ $count: 'total' })
      const totalCursor = this.collection(domain).aggregate(totalPipeline, {
        checkKeys: false
      })
      const arr = await ctx.with(
        'aggregate-total',
        {},
        (ctx) => toArray(totalCursor),
        () => ({
          domain,
          pipeline,
          clazz
        })
      )
      total = arr?.[0]?.total ?? 0
    }
    const edTime = platformNow()
    if (edTime - stTime > 1000 || st - stTime > 1000) {
      ctx.error('aggregate', {
        time: edTime - stTime,
        clazz,
        query: cutObjectArray(query),
        options,
        queueTime: st - stTime
      })
    }
    this.handleEvent(domain, 'read', result.length)
    return toFindResult(this.stripHash(result) as T[], total)
  }

  private translateKey<T extends Doc>(
    key: string,
    clazz: Ref<Class<T>>,
    mixins?: Set<Ref<Class<Doc>>>
  ): { key: string, lookup: boolean } {
    const arr = key.split('.').filter((p) => p)
    let tKey = ''
    let lookup = false

    for (let i = 0; i < arr.length; i++) {
      const element = arr[i]
      if (element === '$lookup') {
        tKey += arr[++i] + '_lookup'
        lookup = true
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
      tKey = this.checkMixinKey<T>(tKey, clazz, mixins)
    }

    return { key: tKey, lookup }
  }

  private clearExtraLookups (row: any): void {
    for (const key in row) {
      if (key.endsWith('_lookup') || key.endsWith('_association')) {
        // eslint-disable-next-line
        delete row[key]
      }
    }
  }

  private checkMixinKey<T extends Doc>(key: string, clazz: Ref<Class<T>>, mixins?: Set<Ref<Class<Doc>>>): string {
    if (!key.includes('.')) {
      try {
        const attr = this.hierarchy.findAttribute(clazz, key)
        if (attr !== undefined && this.hierarchy.isMixin(attr.attributeOf)) {
          // It is mixin
          key = attr.attributeOf + '.' + key
          mixins?.add(attr.attributeOf)
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

  @withContext('groupBy')
  groupBy<T, D extends Doc = Doc>(
    ctx: MeasureContext,
    domain: Domain,
    field: string,
    query?: DocumentQuery<D>
  ): Promise<Map<T, number>> {
    return ctx.with('groupBy', { domain }, async (ctx) => {
      const coll = this.collection(domain)
      const grResult = await coll
        .aggregate([
          ...(query !== undefined ? [{ $match: query }] : []),
          {
            $group: {
              _id: '$' + field,
              count: { $sum: 1 }
            }
          }
        ])
        .toArray()
      return new Map(grResult.map((it) => [it._id as unknown as T, it.count]))
    })
  }

  findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    const stTime = platformNow()
    const mongoQuery = this.translateQuery(_class, query, options)
    const fQuery = { ...mongoQuery.base, ...mongoQuery.lookup }
    return addOperation(ctx, 'find-all', {}, async () => {
      const st = platformNow()
      let result: FindResult<T>
      const domain = options?.domain ?? this.hierarchy.getDomain(_class)
      if (
        options?.lookup != null ||
        options?.associations != null ||
        this.isEnumSort(_class, options) ||
        this.isRulesSort(options) ||
        options?.domainLookup !== undefined
      ) {
        return await this.findWithPipeline(ctx, domain, _class, query, options ?? {}, stTime)
      }
      const coll = this.collection(domain)

      if (options?.limit === 1 || typeof query._id === 'string') {
        // Skip sort/projection/etc.
        return await ctx.with(
          'find-one',
          {},
          async (ctx) => {
            const findOptions: MongoFindOptions = {}

            if (options?.sort !== undefined) {
              findOptions.sort = this.collectSort<T>(options, _class)
            }
            if (options?.projection !== undefined) {
              findOptions.projection = this.calcProjection<T>(options, _class)
            }

            let doc: WithId<Document> | null

            if (typeof fQuery._id === 'string') {
              doc = await coll.findOne({ _id: fQuery._id }, findOptions)
              if (doc != null && matchQuery([doc as unknown as Doc], query, _class, this.hierarchy).length === 0) {
                doc = null
              }
            } else {
              doc = await coll.findOne(fQuery, findOptions)
            }

            let total = -1
            if (options?.total === true) {
              total = await coll.countDocuments({ ...mongoQuery.base, ...mongoQuery.lookup })
            }
            if (doc != null) {
              return toFindResult([this.stripHash<T>(doc as unknown as T) as T], total)
            }
            return toFindResult([], total)
          },
          { domain, mongoQuery, _idOnly: typeof fQuery._id === 'string' }
        )
      }

      let cursor = coll.find<T>(fQuery)

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
            total = await coll.countDocuments(fQuery)
          }
          cursor = cursor.limit(options.limit ?? 1)
        }
      }
      // Error in case of timeout
      try {
        const res: T[] = await ctx.with(
          'find-all',
          {},
          (ctx) => toArray(cursor),
          () => ({
            queueTime: stTime - st,
            mongoQuery,
            options,
            domain
          })
        )
        if (options?.total === true && options?.limit === undefined) {
          total = res.length
        }
        result = toFindResult(this.stripHash(res) as T[], total)
      } catch (e) {
        console.error('error during executing cursor in findAll', _class, cutObjectArray(query), options, e)
        throw e
      }

      const edTime = platformNow()
      if (edTime - st > 1000 || st - stTime > 1000) {
        ctx.error('FindAll', {
          time: edTime - st,
          _class,
          query: fQuery,
          options,
          queueTime: st - stTime
        })
      }
      this.handleEvent(domain, 'read', result.length)
      return result
    })
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
    if (options.sort != null) {
      for (const k of Object.keys(options.sort) as (keyof T)[]) {
        if (projection[k] == null) {
          ;(projection as any)[k] = 1
        }
      }
    }
    if (count === 0) {
      return undefined
    }
    return projection
  }

  stripHash<T extends Doc>(docs: T | T[]): T | T[] {
    if (Array.isArray(docs)) {
      docs.forEach((it) => {
        if ('%hash%' in it) {
          delete it['%hash%']
        }
        return it
      })
    } else if (typeof docs === 'object' && docs != null) {
      if ('%hash%' in docs) {
        delete docs['%hash%']
      }
    }
    return docs
  }

  curHash (): string {
    return Date.now().toString(16) // Current hash value
  }

  @withContext('get-domain-hash')
  async getDomainHash (ctx: MeasureContext, domain: Domain): Promise<string> {
    return await calcHashHash(ctx, domain, this)
  }

  strimSize (str?: string): string {
    if (str == null) {
      return ''
    }
    const pos = str.indexOf('|')
    if (pos > 0) {
      return str.substring(0, pos)
    }
    return str
  }

  find (_ctx: MeasureContext, domain: Domain): StorageIterator {
    const ctx = _ctx.newChild('find', { domain })
    const coll = this.db.collection<Doc>(domain)
    let iterator: FindCursor<Doc>

    return {
      next: async () => {
        if (iterator === undefined) {
          iterator = coll.find(
            {},
            {
              projection: {
                '%hash%': 1,
                _id: 1
              }
            }
          )
        }
        const d = await ctx.with('next', {}, () => iterator.next())
        const result: DocInfo[] = []
        if (d != null) {
          result.push({
            id: d._id,
            hash: this.strimSize((d as any)['%hash%'])
          })
        }
        if (iterator.bufferedCount() > 0) {
          result.push(
            ...iterator.readBufferedDocuments().map((it) => ({
              id: it._id,
              hash: this.strimSize((it as any)['%hash%'])
            }))
          )
        }
        return result
      },
      close: async () => {
        await ctx.with('close', {}, () => iterator.close())
        ctx.end()
      }
    }
  }

  rawFind (_ctx: MeasureContext, domain: Domain): RawFindIterator {
    const ctx = _ctx.newChild('findRaw', { domain })
    const coll = this.db.collection<Doc>(domain)
    let iterator: FindCursor<Doc>

    return {
      find: async () => {
        if (iterator === undefined) {
          iterator = coll.find({})
        }
        const d = await ctx.with('next', {}, () => iterator.next())
        const result: Doc[] = []
        if (d != null) {
          result.push(this.stripHash(d) as Doc)
        }
        if (iterator.bufferedCount() > 0) {
          result.push(...(this.stripHash(iterator.readBufferedDocuments()) as Doc[]))
        }
        return result ?? []
      },
      close: async () => {
        await ctx.with('close', {}, () => iterator.close())
        ctx.end()
      }
    }
  }

  load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return ctx.with('load', { domain }, async () => {
      if (docs.length === 0) {
        return []
      }
      const cursor = this.db.collection<Doc>(domain).find<Doc>({ _id: { $in: docs } }, { limit: docs.length })
      const result = await toArray(cursor)
      return this.stripHash(result) as Doc[]
    })
  }

  upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    return ctx.with('upload', { domain }, (ctx) => {
      const coll = this.collection(domain)

      return uploadDocuments(ctx, docs, coll, this.curHash())
    })
  }

  clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return ctx.with('clean', {}, async () => {
      if (docs.length > 0) {
        await this.db.collection<Doc>(domain).deleteMany({ _id: { $in: docs } })
      }
    })
  }
}

interface OperationBulk {
  bulks: number
  add: Doc[]
  update: Map<Ref<Doc>, Partial<Doc>>

  bulkOperations: AnyBulkWriteOperation<Doc>[]

  findUpdate: Set<Ref<Doc>>

  raw: (() => Promise<TxResult>)[]
}

class MongoAdapter extends MongoAdapterBase {
  async init (ctx: MeasureContext): Promise<void> {
    await this._db.init()
  }

  updateBulk (bulk: OperationBulk, tx: Tx): void {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        this.txCreateDoc(bulk, tx as TxCreateDoc<Doc>)
        break
      case core.class.TxUpdateDoc:
        this.txUpdateDoc(bulk, tx as TxUpdateDoc<Doc>)
        break
      case core.class.TxRemoveDoc:
        this.txRemoveDoc(bulk, tx as TxRemoveDoc<Doc>)
        break
      case core.class.TxMixin:
        this.txMixin(bulk, tx as TxMixin<Doc, Doc>)
        break
      case core.class.TxApplyIf:
        return undefined
      default:
        console.error('Unknown/Unsupported operation:', tx._class, tx)
        break
    }
  }

  async tx (ctx: MeasureContext, ...txes: Tx[]): Promise<TxResult[]> {
    const result: TxResult[] = []

    const h = this.hierarchy
    const byDomain = groupByArray(txes, (it) => {
      if (TxProcessor.isExtendsCUD(it._class)) {
        return h.findDomain((it as TxCUD<Doc>).objectClass)
      }
      return undefined
    })

    const stTime = platformNow()
    const st = stTime
    let promises: Promise<any>[] = []
    for (const [domain, txs] of byDomain) {
      if (domain === undefined) {
        continue
      }
      const domainBulk: OperationBulk = {
        bulks: 1,
        add: [],
        update: new Map(),
        bulkOperations: [],
        findUpdate: new Set(),
        raw: []
      }
      for (const t of txs) {
        this.updateBulk(domainBulk, t)
      }
      if (
        domainBulk.add.length === 0 &&
        domainBulk.update.size === 0 &&
        domainBulk.bulkOperations.length === 0 &&
        domainBulk.findUpdate.size === 0 &&
        domainBulk.raw.length === 0
      ) {
        continue
      }

      // Minir optimizations
      // Add Remove optimization

      const ops: AnyBulkWriteOperation<Doc>[] = []

      if (domainBulk.add.length > 0) {
        ops.push(...domainBulk.add.map((it) => ({ insertOne: { document: it } })))
        this.handleEvent(domain, 'add', domainBulk.add.length)
      }
      if (domainBulk.update.size > 0) {
        // Extract similar update to update many if possible
        // TODO:

        ops.push(
          ...Array.from(domainBulk.update.entries()).map((it) => ({
            updateOne: {
              filter: { _id: it[0] },
              update: {
                $set: it[1]
              }
            }
          }))
        )
        this.handleEvent(domain, 'update', domainBulk.update.size)
      }
      if (domainBulk.bulkOperations.length > 0) {
        ops.push(...domainBulk.bulkOperations)
        this.handleEvent(domain, 'update', domainBulk.bulkOperations.length)
      }

      if (ops.length > 0) {
        if (ops === undefined || ops.length === 0) {
          continue
        }
        const coll = this.db.collection<Doc>(domain)

        promises.push(
          addOperation(ctx, 'bulk-write', { domain, operations: ops.length }, (ctx) =>
            ctx.with(
              'bulk-write',
              { domain },
              async () => {
                try {
                  await coll.bulkWrite(ops, {
                    ordered: false
                  })
                } catch (err: any) {
                  ctx.error('failed to perform bulk write', { error: err, txes: cutObjectArray(ops) })
                }
              },
              {
                domain,
                operations: ops.length
              }
            )
          )
        )
      }
      if (domainBulk.findUpdate.size > 0) {
        if (promises.length > 0) {
          await Promise.all(promises)
          promises = []
        }
        const coll = this.db.collection<Doc>(domain)

        await ctx.with(
          'find-result',
          {},
          async (ctx) => {
            const st = platformNow()
            const docs = await addOperation(
              ctx,
              'find-result',
              {},
              (ctx) => coll.find({ _id: { $in: Array.from(domainBulk.findUpdate) } }).toArray(),
              { domain, _ids: domainBulk.findUpdate.size, queueTime: stTime - st }
            )
            result.push(...docs)
            this.handleEvent(domain, 'read', docs.length)
          },
          {
            domain,
            queueTime: stTime - st
          }
        )
      }

      if (domainBulk.raw.length > 0) {
        if (promises.length > 0) {
          await Promise.all(promises)
          promises = []
        }
        await ctx.with(
          'raw',
          {},
          async (ctx) => {
            for (const r of domainBulk.raw) {
              result.push({ object: await addOperation(ctx, 'raw-op', {}, () => r()) })
            }
          },
          {
            domain,
            queueTime: stTime - st
          }
        )
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises)
    }
    return result
  }

  protected txRemoveDoc (bulk: OperationBulk, tx: TxRemoveDoc<Doc>): void {
    bulk.bulkOperations.push({ deleteOne: { filter: { _id: tx.objectId } } })
  }

  protected txMixin (bulk: OperationBulk, tx: TxMixin<Doc, Doc>): void {
    const filter = { _id: tx.objectId }
    const modifyOp = {
      modifiedBy: tx.modifiedBy,
      modifiedOn: tx.modifiedOn
    }
    if (isOperator(tx.attributes)) {
      const update = { ...this.translateMixinAttrs(tx.mixin, tx.attributes), $set: { ...modifyOp } }

      bulk.bulkOperations.push({
        updateOne: {
          filter,
          update
        }
      })
      return
    }
    const update = { ...this.translateMixinAttrs(tx.mixin, tx.attributes), ...modifyOp }

    let upd = bulk.update.get(tx.objectId)
    if (upd === undefined) {
      upd = {}
      bulk.update.set(tx.objectId, upd)
    }

    for (const [k, v] of Object.entries(update)) {
      ;(upd as any)[k] = v
    }
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

  protected txCreateDoc (bulk: OperationBulk, tx: TxCreateDoc<Doc>): void {
    const doc = TxProcessor.createDoc2Doc(tx)
    bulk.add.push(translateDoc(doc, this.curHash()))
  }

  protected txUpdateDoc (bulk: OperationBulk, tx: TxUpdateDoc<Doc>): void {
    if (isOperator(tx.operations)) {
      const operator = Object.keys(tx.operations)[0]
      if (operator === '$update') {
        const keyval = (tx.operations as any).$update
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
                  '%hash%': this.curHash()
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
                  '%hash%': this.curHash()
                }
              }
            }
          }
        ]
        bulk.bulkOperations.push(...ops)
      } else {
        const domain = this.hierarchy.getDomain(tx.objectClass)

        if (tx.retrieve === true) {
          bulk.raw.push(async () => {
            const res = await this.collection(domain).findOneAndUpdate(
              { _id: tx.objectId },
              {
                ...tx.operations,
                $set: {
                  modifiedBy: tx.modifiedBy,
                  modifiedOn: tx.modifiedOn,
                  '%hash%': this.curHash()
                }
              } as unknown as UpdateFilter<Document>,
              { returnDocument: 'after', includeResultMetadata: true }
            )
            this.handleEvent(domain, 'read', 1)
            this.handleEvent(domain, 'update', 1)
            return res.value as TxResult
          })
        } else {
          bulk.bulkOperations.push({
            updateOne: {
              filter: { _id: tx.objectId },
              update: {
                ...tx.operations,
                $set: {
                  modifiedBy: tx.modifiedBy,
                  modifiedOn: tx.modifiedOn,
                  '%hash%': this.curHash()
                }
              }
            }
          })
        }
      }
    } else {
      let upd = bulk.update.get(tx.objectId)
      if (upd === undefined) {
        upd = {}
        bulk.update.set(tx.objectId, upd)
      }

      for (const [k, v] of Object.entries({
        ...tx.operations,
        modifiedBy: tx.modifiedBy,
        modifiedOn: tx.modifiedOn,
        '%hash%': this.curHash()
      })) {
        ;(upd as any)[k] = v
      }

      if (tx.retrieve === true) {
        bulk.findUpdate.add(tx.objectId)
      }
    }
  }
}

class MongoTxAdapter extends MongoAdapterBase implements TxAdapter {
  txColl: Collection<Doc> | undefined

  async init (ctx: MeasureContext): Promise<void> {
    await this._db.init(DOMAIN_TX)
    await this._db.init(DOMAIN_MODEL_TX)
  }

  override async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    if (tx.length === 0) {
      return []
    }
    const opName = tx.length === 1 ? 'tx-one' : 'tx'
    const modelTxes: Tx[] = []
    const baseTxes: Tx[] = []
    for (const _tx of tx) {
      if (_tx.objectSpace === core.space.Model) {
        modelTxes.push(_tx)
      } else {
        baseTxes.push(_tx)
      }
    }
    if (baseTxes.length > 0) {
      await addOperation(
        ctx,
        opName,
        {},
        async (ctx) => {
          await ctx.with(
            'insertMany',
            { domain: 'tx' },
            async () => {
              try {
                const hash = this.curHash()
                await this.txCollection().insertMany(
                  baseTxes.map((it) => translateDoc(it, hash)),
                  {
                    ordered: false
                  }
                )
              } catch (err: any) {
                ctx.error('failed to write tx', { error: err, message: err.message })
              }
            },

            {
              count: baseTxes.length
            }
          )
        },
        { domain: 'tx', count: baseTxes.length }
      )
    }
    if (modelTxes.length > 0) {
      await addOperation(
        ctx,
        opName,
        {},
        async (ctx) => {
          await ctx.with(
            'insertMany',
            { domain: DOMAIN_MODEL_TX },
            async () => {
              try {
                const hash = this.curHash()
                await this.db.collection<Doc>(DOMAIN_MODEL_TX).insertMany(
                  modelTxes.map((it) => translateDoc(it, hash)),
                  {
                    ordered: false
                  }
                )
              } catch (err: any) {
                ctx.error('failed to write model tx', { error: err, message: err.message })
              }
            },
            {
              count: modelTxes.length
            }
          )
        },
        { domain: DOMAIN_MODEL_TX, count: modelTxes.length }
      )
    }
    ctx.withSync('handleEvent', {}, () => {
      this.handleEvent(DOMAIN_TX, 'add', tx.length)
    })
    return []
  }

  private txCollection (): Collection<Doc> {
    if (this.txColl !== undefined) {
      return this.txColl
    }
    this.txColl = this.db.collection(DOMAIN_TX)
    return this.txColl
  }

  @withContext('get-model')
  async getModel (ctx: MeasureContext): Promise<Tx[]> {
    const txCollection = this.db.collection<Tx>(DOMAIN_MODEL_TX)
    const cursor = txCollection.find({}, { sort: { modifiedOn: 1, _id: 1 } })
    const model = await toArray<Tx>(cursor)
    // We need to put all core.account.System transactions first
    const systemTx: Tx[] = []
    const userTx: Tx[] = []

    // Ignore old Employee accounts.
    function isPersonAccount (tx: Tx): boolean {
      return (
        (tx._class === core.class.TxCreateDoc ||
          tx._class === core.class.TxUpdateDoc ||
          tx._class === core.class.TxRemoveDoc) &&
        (tx as TxCUD<Doc>).objectClass === 'contact:class:PersonAccount'
      )
    }
    model.forEach((tx) => (tx.modifiedBy === core.account.System && !isPersonAccount(tx) ? systemTx : userTx).push(tx))
    return this.stripHash(systemTx.concat(userTx)) as Tx[]
  }
}

export async function uploadDocuments (
  ctx: MeasureContext,
  docs: Doc[],
  coll: Collection<Document>,
  curHash: string
): Promise<void> {
  const ops = Array.from(docs)

  while (ops.length > 0) {
    const part = ops.splice(0, 500)
    await coll.bulkWrite(
      part.map((it) => {
        const digest: string = (it as any)['%hash%'] ?? curHash
        return {
          replaceOne: {
            filter: { _id: it._id },
            replacement: { ...it, '%hash%': digest },
            upsert: true
          }
        }
      }),
      {
        ordered: false
      }
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
  contextVars: Record<string, any>,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceIds,
  modelDb: ModelDb,
  storage?: StorageAdapter,
  options?: DbAdapterOptions
): Promise<DbAdapter> {
  const client = getMongoClient(url)
  const db = getWorkspaceMongoDB(await client.getClient(), workspaceId.dataId ?? workspaceId.uuid)

  return new MongoAdapter(db, hierarchy, modelDb, client, options)
}

/**
 * @public
 */
export async function createMongoTxAdapter (
  ctx: MeasureContext,
  contextVars: Record<string, any>,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceIds,
  modelDb: ModelDb
): Promise<TxAdapter> {
  const client = getMongoClient(url)
  const db = getWorkspaceMongoDB(await client.getClient(), workspaceId.dataId ?? workspaceId.uuid)

  return new MongoTxAdapter(db, hierarchy, modelDb, client)
}
