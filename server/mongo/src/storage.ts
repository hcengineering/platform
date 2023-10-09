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
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  Domain,
  DOMAIN_MODEL,
  DOMAIN_TX,
  Enum,
  EnumOf,
  escapeLikeForRegexp,
  FindOptions,
  FindResult,
  Hierarchy,
  IndexingConfiguration,
  isOperator,
  Lookup,
  Mixin,
  ModelDb,
  Projection,
  QueryUpdate,
  Ref,
  ReverseLookups,
  SortingOrder,
  SortingQuery,
  SortingRules,
  SortQuerySelector,
  StorageIterator,
  toFindResult,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxResult,
  TxUpdateDoc,
  WithLookup,
  WorkspaceId
} from '@hcengineering/core'
import type { DbAdapter, TxAdapter } from '@hcengineering/server-core'
import { AnyBulkWriteOperation, Collection, Db, Document, Filter, MongoClient, Sort, UpdateFilter } from 'mongodb'
import { createHash } from 'node:crypto'
import { getMongoClient, getWorkspaceDB } from './utils'

function translateDoc (doc: Doc): Document {
  return doc as Document
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

abstract class MongoAdapterBase implements DbAdapter {
  constructor (
    protected readonly db: Db,
    protected readonly hierarchy: Hierarchy,
    protected readonly modelDb: ModelDb,
    protected readonly client: MongoClient
  ) {}

  async init (): Promise<void> {}

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {
    for (const vv of config.indexes) {
      try {
        await this.db.collection(domain).createIndex(vv)
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  async tx (...tx: Tx[]): Promise<TxResult> {
    return {}
  }

  async close (): Promise<void> {
    await this.client.close()
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
    const classes = this.hierarchy.getDescendants(baseClass)

    // Only replace if not specified
    if (translated._class === undefined) {
      translated._class = { $in: classes }
    } else if (typeof translated._class === 'string') {
      if (!classes.includes(translated._class)) {
        translated._class = { $in: classes }
      }
    } else if (typeof translated._class === 'object') {
      let descendants: Ref<Class<Doc>>[] = classes

      if (Array.isArray(translated._class.$in)) {
        const classesIds = new Set(classes)
        descendants = translated._class.$in.filter((c: Ref<Class<Doc>>) => classesIds.has(c))
      }

      if (Array.isArray(translated._class.$nin)) {
        const excludedClassesIds = new Set<Ref<Class<Doc>>>(translated._class.$nin)
        descendants = descendants.filter((c) => !excludedClassesIds.has(c))
      }

      translated._class = { $in: descendants }
    }

    if (baseClass !== clazz) {
      // Add an mixin to be exists flag
      translated[clazz] = { $exists: true }
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
            as: fullKey.split('.').join('') + '_lookup'
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
            as: fullKey.split('.').join('') + '_lookup'
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
            }
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
        await this.fillLookupValue(_class, nested, object, fullKey, targetObject.$lookup[key])
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
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const pipeline = []
    const match = { $match: this.translateQuery(clazz, query) }
    const slowPipeline = isLookupQuery(query) || isLookupSort(options?.sort)
    const steps = await this.getLookups(clazz, options?.lookup)
    if (slowPipeline) {
      for (const step of steps) {
        pipeline.push({ $lookup: step })
      }
    }
    pipeline.push(match)
    const resultPipeline: any[] = []
    await this.fillSortPipeline(clazz, options, pipeline)
    if (options?.limit !== undefined) {
      resultPipeline.push({ $limit: options.limit })
    }
    if (!slowPipeline) {
      for (const step of steps) {
        resultPipeline.push({ $lookup: step })
      }
    }
    if (options?.projection !== undefined) {
      const projection: Projection<T> = {}
      for (const key in options.projection) {
        const ckey = this.checkMixinKey<T>(key, clazz) as keyof T
        projection[ckey] = options.projection[key]
      }
      resultPipeline.push({ $project: projection })
    }
    pipeline.push({
      $facet: {
        results: resultPipeline,
        ...(options?.total === true ? { totalCount: [{ $count: 'count' }] } : {})
      }
    })
    const domain = this.hierarchy.getDomain(clazz)
    const cursor = this.db.collection(domain).aggregate(pipeline, {
      checkKeys: false,
      enableUtf8Validation: false
    })
    cursor.maxTimeMS(30000)
    const res = (await cursor.toArray())[0]
    const result = res.results as WithLookup<T>[]
    const total = options?.total === true ? res.totalCount?.shift()?.count ?? 0 : -1
    for (const row of result) {
      await this.fillLookupValue(clazz, options?.lookup, row)
      this.clearExtraLookups(row)
    }
    return toFindResult(result, total)
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
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    // TODO: rework this
    if (options != null && (options?.lookup != null || this.isEnumSort(_class, options) || this.isRulesSort(options))) {
      return await this.findWithPipeline(_class, query, options)
    }
    const domain = this.hierarchy.getDomain(_class)
    const coll = this.db.collection(domain)
    const mongoQuery = this.translateQuery(_class, query)
    let cursor = coll.find<T>(mongoQuery, {
      checkKeys: false,
      enableUtf8Validation: false
    })

    if (options?.projection !== undefined) {
      const projection: Projection<T> = {}
      for (const key in options.projection) {
        const ckey = this.checkMixinKey<T>(key, _class) as keyof T
        projection[ckey] = options.projection[key]
      }
      cursor = cursor.project(projection)
    }
    let total: number = -1
    if (options !== null && options !== undefined) {
      if (options.sort !== undefined) {
        const sort: Sort = {}
        for (const key in options.sort) {
          const ckey = this.checkMixinKey<T>(key, _class)
          const order = options.sort[key] === SortingOrder.Ascending ? 1 : -1
          sort[ckey] = order
        }
        cursor = cursor.sort(sort)
      }
      if (options.limit !== undefined) {
        if (options.total === true) {
          total = await coll.countDocuments(mongoQuery)
        }
        cursor = cursor.limit(options.limit)
      }
    }

    // Error in case of timeout
    cursor.maxTimeMS(30000)
    cursor.maxAwaitTimeMS(30000)

    const res = await cursor.toArray()
    if (options?.total === true && options?.limit === undefined) {
      total = res.length
    }
    return toFindResult(res, total)
  }

  find (domain: Domain): StorageIterator {
    const coll = this.db.collection<Doc>(domain)
    const iterator = coll.find({}, { sort: { _id: -1 } })

    return {
      next: async () => {
        const d = await iterator.next()
        if (d === null) {
          return undefined
        }
        const doc = JSON.stringify(d)
        const hash = createHash('sha256')
        hash.update(doc)
        const digest = hash.digest('base64')
        return {
          id: d._id,
          hash: digest,
          size: doc.length // Some approx size for document.
        }
      },
      close: async () => {
        await iterator.close()
      }
    }
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.db
      .collection(domain)
      .find<Doc>({ _id: { $in: docs } })
      .toArray()
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {
    const coll = this.db.collection(domain)

    const ops = Array.from(docs)

    while (ops.length > 0) {
      const part = ops.splice(0, 500)
      await coll.bulkWrite(
        part.map((it) => ({
          replaceOne: {
            filter: { _id: it._id },
            replacement: it,
            upsert: true
          }
        }))
      )
    }
  }

  async update (domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {
    const coll = this.db.collection(domain)

    // remove old and insert new ones
    const ops = Array.from(operations.entries())
    let skip = 500
    while (ops.length > 0) {
      const part = ops.splice(0, skip)
      try {
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
                  $set: set,
                  ...($unset !== undefined ? { $unset } : {})
                }
              }
            }
          })
        )
      } catch (err: any) {
        if (skip !== 1) {
          ops.push(...part)
          skip = 1 // Let's update one by one, to loose only one failed variant.
        }
        console.error(err)
      }
    }
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.db.collection(domain).deleteMany({ _id: { $in: docs } })
  }
}

interface DomainOperation {
  raw: () => Promise<TxResult>
  domain: Domain
  bulk?: AnyBulkWriteOperation[]
}

class MongoAdapter extends MongoAdapterBase {
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

  async tx (...txes: Tx[]): Promise<TxResult> {
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
          await bulkExecute()
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
        bulkOperations.push(dop)
      }
      await bulkExecute()
    } else {
      return (await this.getOperations(txes[0])?.raw()) ?? {}
    }
    if (result.length === 0) {
      return false
    }
    if (result.length === 1) {
      return result[0]
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
      raw: () => this.db.collection(domain).deleteOne({ _id: tx.objectId }),
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
    if (isOperator(tx.attributes)) {
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
          raw: async () => await this.db.collection(domain).bulkWrite(ops),
          domain,
          bulk: ops
        }
      }
      const update = { ...this.translateMixinAttrs(tx.mixin, tx.attributes), $set: { ...modifyOp } }
      return {
        raw: async () => await this.db.collection(domain).updateOne(filter, update),
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
    const update = { $set: { ...this.translateMixinAttrs(tx.mixin, tx.attributes), ...modifyOp } }
    return {
      raw: async () => await this.db.collection(domain).updateOne(filter, update),
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
      raw: async () => await this.db.collection(domain).insertOne(tdoc),
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
    if (isOperator(tx.operations)) {
      const operator = Object.keys(tx.operations)[0]
      if (operator === '$move') {
        const keyval = (tx.operations as any).$move
        const arr = Object.keys(keyval)[0]
        const desc = keyval[arr]

        const ops: any = [
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
                $set: {
                  modifiedBy: tx.modifiedBy,
                  modifiedOn: tx.modifiedOn
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
          raw: async () => await this.db.collection(domain).bulkWrite(ops),
          domain,
          bulk: ops
        }
      } else if (operator === '$update') {
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
                  ...Object.fromEntries(Object.entries(desc.$update).map((it) => [arr + '.$.' + it[0], it[1]]))
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
                  modifiedOn: tx.modifiedOn
                }
              }
            }
          }
        ]
        return {
          raw: async () => await this.db.collection(domain).bulkWrite(ops),
          domain,
          bulk: ops
        }
      } else {
        if (tx.retrieve === true) {
          const raw = async (): Promise<TxResult> => {
            const result = await this.db.collection(domain).findOneAndUpdate(
              { _id: tx.objectId },
              {
                ...tx.operations,
                $set: {
                  modifiedBy: tx.modifiedBy,
                  modifiedOn: tx.modifiedOn
                }
              } as unknown as UpdateFilter<Document>,
              { returnDocument: 'after' }
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
            ...tx.operations,
            $set: {
              modifiedBy: tx.modifiedBy,
              modifiedOn: tx.modifiedOn
            }
          }
          return {
            raw: async () => await this.db.collection(domain).updateOne(filter, update),
            domain,
            bulk: [{ updateOne: { filter, update } }]
          }
        }
      }
    } else {
      const filter = { _id: tx.objectId }
      const update = { $set: { ...tx.operations, modifiedBy: tx.modifiedBy, modifiedOn: tx.modifiedOn } }
      const raw =
        tx.retrieve === true
          ? async (): Promise<TxResult> => {
            const result = await this.db
              .collection(domain)
              .findOneAndUpdate(filter, update, { returnDocument: 'after' })
            return { object: result.value }
          }
          : async () => await this.db.collection(domain).updateOne(filter, update)

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

  override async tx (...tx: Tx[]): Promise<TxResult> {
    if (tx.length === 0) {
      return {}
    }
    await this.txCollection().insertMany(tx.map((it) => translateDoc(it)))
    return {}
  }

  private txCollection (): Collection {
    if (this.txColl !== undefined) {
      return this.txColl
    }
    this.txColl = this.db.collection(DOMAIN_TX)
    return this.txColl
  }

  async getModel (): Promise<Tx[]> {
    const model = await this.db
      .collection(DOMAIN_TX)
      .find<Tx>({ objectSpace: core.space.Model })
      .sort({ _id: 1, modifiedOn: 1 })
      .toArray()
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
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb
): Promise<DbAdapter> {
  const client = await getMongoClient(url)
  const db = getWorkspaceDB(client, workspaceId)

  return new MongoAdapter(db, hierarchy, modelDb, client)
}

/**
 * @public
 */
export async function createMongoTxAdapter (
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb
): Promise<TxAdapter> {
  const client = await getMongoClient(url)
  const db = getWorkspaceDB(client, workspaceId)
  return new MongoTxAdapter(db, hierarchy, modelDb, client)
}
