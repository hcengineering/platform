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

import { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Lookup, MeasureContext, ReverseLookups, getObjectValue } from '.'
import type { Class, Doc, Ref } from './classes'

import core from './component'
import { Hierarchy } from './hierarchy'
import { checkMixinKey, matchQuery, resultSort } from './query'
import type {
  AssociationQuery,
  DocumentQuery,
  FindOptions,
  FindResult,
  LookupData,
  Storage,
  TxResult,
  WithLookup
} from './storage'
import type { Tx, TxCreateDoc, TxMixin, TxRemoveDoc, TxUpdateDoc } from './tx'
import { TxProcessor } from './tx'
import { toFindResult } from './utils'

/**
 * @public
 */
export abstract class MemDb extends TxProcessor implements Storage {
  private readonly objectsByClass = new Map<Ref<Class<Doc>>, Map<Ref<Doc>, Doc>>()
  private readonly objectById = new Map<Ref<Doc>, Doc>()

  constructor (protected readonly hierarchy: Hierarchy) {
    super()
  }

  private getObjectsByClass (_class: Ref<Class<Doc>>): Map<Ref<Doc>, Doc> {
    const result = this.objectsByClass.get(_class)
    if (result === undefined) {
      const result = new Map<Ref<Doc>, Doc>()
      this.objectsByClass.set(_class, result)
      return result
    }
    return result
  }

  private cleanObjectByClass (_class: Ref<Class<Doc>>, _id: Ref<Doc>): void {
    const result = this.objectsByClass.get(_class)
    if (result !== undefined) {
      result.delete(_id)
    }
  }

  private getByIdQuery<T extends Doc>(query: DocumentQuery<T>, _class: Ref<Class<T>>): T[] {
    const result: T[] = []
    if (typeof query._id === 'string') {
      const obj = this.objectById.get(query._id) as T
      if (obj !== undefined && this.hierarchy.isDerived(obj._class, _class)) result.push(obj)
    } else if (query._id?.$in !== undefined) {
      const ids = new Set(query._id.$in)
      for (const id of ids) {
        const obj = this.objectById.get(id) as T
        if (obj !== undefined && this.hierarchy.isDerived(obj._class, _class)) result.push(obj)
      }
    }
    return result
  }

  getObject<T extends Doc>(_id: Ref<T>): T {
    const doc = this.objectById.get(_id)
    if (doc === undefined) {
      throw new PlatformError(new Status(Severity.ERROR, core.status.ObjectNotFound, { _id }))
    }
    return doc as T
  }

  findObject<T extends Doc>(_id: Ref<T>): T | undefined {
    const doc = this.objectById.get(_id)
    return doc as T
  }

  private async getLookupValue<T extends Doc>(
    _class: Ref<Class<T>>,
    doc: T,
    lookup: Lookup<T>,
    result: LookupData<T>
  ): Promise<void> {
    for (const key in lookup) {
      if (key === '_id') {
        await this.getReverseLookupValue(doc, lookup, result)
        continue
      }
      const value = (lookup as any)[key]
      const tkey = checkMixinKey(key, _class, this.hierarchy)
      if (Array.isArray(value)) {
        const [_class, nested] = value
        const objects = await this.findAll(_class, { _id: getObjectValue(tkey, doc) })
        ;(result as any)[key] = objects[0]
        const nestedResult = {}
        const parent = (result as any)[key]
        await this.getLookupValue(_class, parent, nested, nestedResult)
        Object.assign(parent, {
          $lookup: nestedResult
        })
      } else {
        const objects = await this.findAll(value, { _id: getObjectValue(tkey, doc) })
        ;(result as any)[key] = objects[0]
      }
    }
  }

  private async getReverseLookupValue<T extends Doc>(
    doc: T,
    lookup: ReverseLookups,
    result: LookupData<T>
  ): Promise<void> {
    for (const key in lookup._id) {
      const value = lookup._id[key]
      if (Array.isArray(value)) {
        const objects = await this.findAll(value[0], { [value[1]]: doc._id })
        ;(result as any)[key] = objects
      } else {
        const objects = await this.findAll(value, { attachedTo: doc._id })
        ;(result as any)[key] = objects
      }
    }
  }

  private async lookup<T extends Doc>(_class: Ref<Class<T>>, docs: T[], lookup: Lookup<T>): Promise<WithLookup<T>[]> {
    const withLookup: WithLookup<T>[] = []
    for (const doc of docs) {
      const result: LookupData<T> = {}
      await this.getLookupValue(_class, doc, lookup, result)
      withLookup.push(Object.assign({}, doc, { $lookup: result }))
    }
    return withLookup
  }

  private async fillAssociations<T extends Doc>(docs: T[], associations: AssociationQuery[]): Promise<WithLookup<T>[]> {
    const withLookup: WithLookup<T>[] = []
    for (const doc of docs) {
      const result = await this.getAssociationValue(doc, associations)
      withLookup.push(Object.assign({}, doc, { $associations: result }))
    }
    return withLookup
  }

  private async getAssociationValue<T extends Doc>(
    doc: T,
    associations: AssociationQuery[]
  ): Promise<Record<string, Doc[]>> {
    const result: Record<string, Doc[]> = {}
    for (const association of associations) {
      const _id = association[0]
      const assoc = this.findObject(_id)
      if (assoc === undefined) continue
      const isReverse = association[1] === -1
      const key = !isReverse ? 'docA' : 'docB'
      const key2 = !isReverse ? 'docB' : 'docA'
      const _class = !isReverse ? assoc.classB : assoc.classA
      const relations = await this.findAll(core.class.Relation, { association: _id, [key]: doc._id })
      const objects = await this.findAll(_class, { _id: { $in: relations.map((r) => r[key2]) } })
      result[_id] = objects
    }
    return result
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    let result: WithLookup<Doc>[]
    const baseClass = this.hierarchy.getBaseClass(_class)
    if (
      Object.prototype.hasOwnProperty.call(query, '_id') &&
      (typeof query._id === 'string' || query._id?.$in !== undefined || query._id === undefined || query._id === null)
    ) {
      result = this.getByIdQuery(query, baseClass)
    } else {
      result = Array.from(this.getObjectsByClass(baseClass).values())
    }

    result = matchQuery(result, query, _class, this.hierarchy, true)

    if (baseClass !== _class) {
      // We need to filter instances without mixin was set
      result = result.filter((r) => (r as any)[_class] !== undefined)
    }

    if (options?.lookup !== undefined) {
      result = await this.lookup(_class, result as T[], options.lookup)
      result = matchQuery(result, query, _class, this.hierarchy)
    }

    if (options?.associations !== undefined) {
      result = await this.fillAssociations(result, options.associations)
    }

    if (options?.sort !== undefined) resultSort(result, options?.sort, _class, this.hierarchy, this)
    const total = result.length
    result = result.slice(0, options?.limit)
    const tresult = this.hierarchy.clone(result) as WithLookup<T>[]
    const res = tresult.map((it) => this.hierarchy.updateLookupMixin(_class, it, options))
    return toFindResult(res, total)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, { ...options, limit: 1 }))[0]
  }

  /**
   * Only in model find without lookups and sorting.
   * Do not clone results, so be aware modifications are not allowed.
   */
  findAllSync<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): FindResult<T> {
    let result: WithLookup<Doc>[]
    const baseClass = this.hierarchy.getBaseClass(_class)
    if (
      Object.prototype.hasOwnProperty.call(query, '_id') &&
      (typeof query._id === 'string' || query._id?.$in !== undefined || query._id === undefined || query._id === null)
    ) {
      result = this.getByIdQuery(query, baseClass)
    } else {
      result = Array.from(this.getObjectsByClass(baseClass).values())
    }

    result = matchQuery(result, query, _class, this.hierarchy, true)

    if (baseClass !== _class) {
      // We need to filter instances without mixin was set
      result = result.filter((r) => (r as any)[_class] !== undefined)
    }
    const total = result.length
    result = result.slice(0, options?.limit)

    return toFindResult(
      result.map((it) => {
        return baseClass !== _class ? this.hierarchy.as(it, _class) : it
      }) as WithLookup<T>[],
      total
    )
  }

  addDoc (doc: Doc): void {
    this.hierarchy.getAncestors(doc._class).forEach((_class) => {
      const arr = this.getObjectsByClass(_class)
      arr.set(doc._id, doc)
    })

    this.objectById.set(doc._id, doc)
  }

  delDoc (_id: Ref<Doc>): void {
    const doc = this.objectById.get(_id)
    if (doc === undefined) {
      throw new PlatformError(new Status(Severity.ERROR, core.status.ObjectNotFound, { _id }))
    }
    this.objectById.delete(_id)
    this.hierarchy.getAncestors(doc._class).forEach((_class) => {
      this.cleanObjectByClass(_class, _id)
    })
  }

  updateDoc (_id: Ref<Doc>, doc: Doc, update: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>): void {
    // TODO: track updates on Contact to adjust memdb accounts?
  }
}

/**
 * Hold transactions
 *
 * @public
 */
export class TxDb extends MemDb {
  protected txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult> {
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

  async tx (tx: Tx): Promise<TxResult[]> {
    this.addDoc(tx)
    return []
  }
}

/**
 * Hold model objects and classes
 *
 * @public
 */
export class ModelDb extends MemDb {
  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult> {
    this.addDoc(TxProcessor.createDoc2Doc(tx))
    return {}
  }

  addTxes (ctx: MeasureContext, txes: Tx[], clone: boolean): void {
    for (const tx of txes) {
      switch (tx._class) {
        case core.class.TxCreateDoc:
          this.addDoc(TxProcessor.createDoc2Doc(tx as TxCreateDoc<Doc>, clone))
          break
        case core.class.TxUpdateDoc: {
          const cud = tx as TxUpdateDoc<Doc>
          const doc = this.findObject(cud.objectId)
          if (doc !== undefined) {
            this.updateDoc(cud.objectId, doc, cud)
            TxProcessor.updateDoc2Doc(doc, cud)
          } else {
            ctx.warn('no document found, failed to apply model transaction, skipping', {
              _id: tx._id,
              _class: tx._class,
              objectId: cud.objectId
            })
          }
          break
        }
        case core.class.TxRemoveDoc:
          try {
            this.delDoc((tx as TxRemoveDoc<Doc>).objectId)
          } catch (err: any) {
            ctx.warn('no document found, failed to apply model transaction, skipping', {
              _id: tx._id,
              _class: tx._class,
              objectId: (tx as TxRemoveDoc<Doc>).objectId
            })
          }
          break
        case core.class.TxMixin: {
          const mix = tx as TxMixin<Doc, Doc>
          const doc = this.findObject(mix.objectId)
          if (doc !== undefined) {
            this.updateDoc(mix.objectId, doc, mix)
            TxProcessor.updateMixin4Doc(doc, mix)
          } else {
            ctx.warn('no document found, failed to apply model transaction, skipping', {
              _id: tx._id,
              _class: tx._class,
              objectId: mix.objectId
            })
          }
          break
        }
      }
    }
  }

  protected async txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<TxResult> {
    try {
      const doc = this.getObject(tx.objectId) as any
      this.updateDoc(tx.objectId, doc, tx)
      TxProcessor.updateDoc2Doc(doc, tx)
      return tx.retrieve === true ? { object: doc } : {}
    } catch (err: any) {}
    return {}
  }

  protected async txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<TxResult> {
    try {
      this.delDoc(tx.objectId)
    } catch (err: any) {}
    return {}
  }

  // TODO: process ancessor mixins
  protected async txMixin (tx: TxMixin<Doc, Doc>): Promise<TxResult> {
    const doc = this.getObject(tx.objectId) as any
    this.updateDoc(tx.objectId, doc, tx)
    TxProcessor.updateMixin4Doc(doc, tx)
    return {}
  }
}
