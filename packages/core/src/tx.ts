//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { KeysByType } from 'simplytyped'
import type { Class, Data, Doc, Domain, Ref, Account, Space, Arr, Mixin, PropertyType, AttachedDoc, AttachedData } from './classes'
import type { DocumentQuery, FindOptions, FindResult, Storage, WithLookup, TxResult } from './storage'
import core from './component'
import { generateId } from './utils'
import { _getOperator } from './operator'

/**
 * @public
 */
export interface Tx extends Doc {
  objectSpace: Ref<Space> // space where transaction will operate
}

/**
 * @public
 */
export interface TxCUD<T extends Doc> extends Tx {
  objectId: Ref<T>
  objectClass: Ref<Class<T>>
}

/**
 * @public
 */
export interface TxCreateDoc<T extends Doc> extends TxCUD<T> {
  attributes: Data<T>
}

/**
 *
 * Will perform create/update/delete of attached documents.
 *
 * @public
 */
export interface TxCollectionCUD<T extends Doc, P extends AttachedDoc> extends TxCUD<T> {
  collection: string
  tx: TxCUD<P>
}

/**
 * @public
 */
export interface TxPutBag<T extends PropertyType> extends TxCUD<Doc> {
  bag: string
  key: string
  value: T
}

/**
 * @public
 */
export interface TxBulkWrite extends Tx {
  txes: TxCUD<Doc>[]
}

/**
 * @public
 */
export type ExtendedAttributes<D extends Doc, M extends D> = Omit<M, keyof D>

/**
 * @public
 */
export interface TxMixin<D extends Doc, M extends D> extends TxCUD<D> {
  mixin: Ref<Mixin<M>>
  attributes: ExtendedAttributes<D, M>
}

/**
 * @public
 */
export type ArrayAsElement<T extends Doc> = {
  [P in keyof T]: T[P] extends Arr<infer X> ? X : never
}

/**
 * @public
 */
export interface Position<X extends PropertyType> {
  $each: X[]
  $position: number
}

/**
 * @public
 */
export interface MoveDescriptor<X extends PropertyType> {
  $value: X
  $position: number
}

/**
 * @public
 */
export type ArrayAsElementPosition<T extends Doc> = {
  [P in keyof T]: T[P] extends Arr<infer X> ? X | Position<X> : never
}

/**
 * @public
 */
export type ArrayMoveDescriptor<T extends Doc> = {
  [P in keyof T]: T[P] extends Arr<infer X> ? MoveDescriptor<X> : never
}

/**
 * @public
 */
export type NumberProperties<T extends Doc> = {
  [P in keyof T]: T[P] extends number | undefined ? T[P] : never
}

/**
 * @public
 */
export type OmitNever<T extends object> = Omit<T, KeysByType<T, never>>

/**
 * @public
 */
export interface PushOptions<T extends Doc> {
  $push?: Partial<OmitNever<ArrayAsElementPosition<T>>>
  $pull?: Partial<OmitNever<ArrayAsElement<T>>>
  $move?: Partial<OmitNever<ArrayMoveDescriptor<T>>>
}

/**
 * @public
 */
export interface PushMixinOptions<D extends Doc> {
  $pushMixin?: {
    $mixin: Ref<Mixin<D>>
    values: Partial<OmitNever<ArrayAsElement<D>>>
  }
}

/**
 * @public
 */
export interface IncOptions<T extends Doc> {
  $inc?: Partial<OmitNever<NumberProperties<T>>>
}

/**
 * @public
 */
export type DocumentUpdate<T extends Doc> = Partial<Data<T>> & PushOptions<T> & PushMixinOptions<T> & IncOptions<T>

/**
 * @public
 */
export interface TxUpdateDoc<T extends Doc> extends TxCUD<T> {
  operations: DocumentUpdate<T>
  retrieve?: boolean
}

/**
 * @public
 */
export interface TxRemoveDoc<T extends Doc> extends TxCUD<T> {
}

/**
 * @public
 */
export const DOMAIN_TX = 'tx' as Domain

/**
 * @public
 */
export interface WithTx {
  tx: (tx: Tx) => Promise<TxResult>
}

/**
 * @public
 */
export abstract class TxProcessor implements WithTx {
  async tx (tx: Tx): Promise<TxResult> {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        return await this.txCreateDoc(tx as TxCreateDoc<Doc>)
      case core.class.TxCollectionCUD:
        return await this.txCollectionCUD(tx as TxCollectionCUD<Doc, AttachedDoc>)
      case core.class.TxUpdateDoc:
        return await this.txUpdateDoc(tx as TxUpdateDoc<Doc>)
      case core.class.TxRemoveDoc:
        return await this.txRemoveDoc(tx as TxRemoveDoc<Doc>)
      case core.class.TxMixin:
        return await this.txMixin(tx as TxMixin<Doc, Doc>)
      case core.class.TxPutBag:
        return await this.txPutBag(tx as TxPutBag<PropertyType>)
      case core.class.TxBulkWrite:
        return await this.txBulkWrite(tx as TxBulkWrite)
    }
    throw new Error('TxProcessor: unhandled transaction class: ' + tx._class)
  }

  static createDoc2Doc<T extends Doc>(tx: TxCreateDoc<T>): T {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
      _id: tx.objectId,
      _class: tx.objectClass,
      space: tx.objectSpace,
      modifiedBy: tx.modifiedBy,
      modifiedOn: tx.modifiedOn,
      ...tx.attributes
    } as T
  }

  static updateDoc2Doc<T extends Doc>(doc: T, tx: TxUpdateDoc<T>): T {
    const ops = tx.operations as any
    for (const key in ops) {
      if (key.startsWith('$')) {
        const operator = _getOperator(key)
        operator(doc, ops[key])
      } else {
        (doc as any)[key] = ops[key]
      }
    }
    doc.modifiedBy = tx.modifiedBy
    doc.modifiedOn = tx.modifiedOn
    return doc
  }

  protected abstract txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult>
  protected abstract txPutBag (tx: TxPutBag<PropertyType>): Promise<TxResult>
  protected abstract txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<TxResult>
  protected abstract txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<TxResult>
  protected abstract txMixin (tx: TxMixin<Doc, Doc>): Promise<TxResult>

  protected txCollectionCUD (tx: TxCollectionCUD<Doc, AttachedDoc>): Promise<TxResult> {
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
    return this.tx(tx.tx)
  }

  protected async txBulkWrite (bulkTx: TxBulkWrite): Promise<TxResult> {
    for (const tx of bulkTx.txes) {
      await this.tx(tx)
    }
    return {}
  }
}

/**
 * @public
 */
export class TxOperations implements Storage {
  readonly txFactory: TxFactory

  constructor (private readonly storage: Storage, user: Ref<Account>) {
    this.txFactory = new TxFactory(user)
  }

  findAll <T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T> | undefined): Promise<FindResult<T>> {
    return this.storage.findAll(_class, query, options)
  }

  async findOne <T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T> | undefined): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, options))[0]
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.storage.tx(tx)
  }

  async createDoc<T extends Doc> (
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: Data<T>,
    id?: Ref<T>
  ): Promise<Ref<T>> {
    const tx = this.txFactory.createTxCreateDoc(_class, space, attributes, id)
    await this.storage.tx(tx)
    return tx.objectId
  }

  async addCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: string,
    attributes: AttachedData<P>,
    id?: Ref<P>
  ): Promise<Ref<T>> {
    const tx = this.txFactory.createTxCollectionCUD<T, P>(
      attachedToClass,
      attachedTo,
      space,
      collection,
      this.txFactory.createTxCreateDoc<P>(_class, space, attributes as unknown as Data<P>, id)
    )
    await this.storage.tx(tx)
    return tx.objectId
  }

  async updateCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: string,
    operations: DocumentUpdate<P>
  ): Promise<Ref<T>> {
    const tx = this.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      this.txFactory.createTxUpdateDoc(_class, space, objectId, operations)
    )
    await this.storage.tx(tx)
    return tx.objectId
  }

  async removeCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: string
  ): Promise<Ref<T>> {
    const tx = this.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      this.txFactory.createTxRemoveDoc(_class, space, objectId)
    )
    await this.storage.tx(tx)
    return tx.objectId
  }

  putBag <P extends PropertyType>(
    _class: Ref<Class<Doc>>,
    space: Ref<Space>,
    objectId: Ref<Doc>,
    bag: string,
    key: string,
    value: P
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxPutBag(_class, space, objectId, bag, key, value)
    return this.storage.tx(tx)
  }

  updateDoc <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: DocumentUpdate<T>,
    retrieve?: boolean
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxUpdateDoc(_class, space, objectId, operations, retrieve)
    return this.storage.tx(tx)
  }

  removeDoc<T extends Doc> (
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxRemoveDoc(_class, space, objectId)
    return this.storage.tx(tx)
  }

  createMixin<D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    mixin: Ref<Mixin<M>>,
    attributes: ExtendedAttributes<D, M>
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxMixin(objectId, objectClass, mixin, attributes)
    return this.storage.tx(tx)
  }
}

/**
 * @public
 */
export class TxFactory {
  constructor (readonly account: Ref<Account>) {}

  createTxCreateDoc<T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, attributes: Data<T>, objectId?: Ref<T>): TxCreateDoc<T> {
    return {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: objectId ?? generateId(),
      objectClass: _class,
      objectSpace: space,
      modifiedOn: Date.now(),
      modifiedBy: this.account,
      attributes
    }
  }

  createTxCollectionCUD<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<T>>,
    objectId: Ref<T>,
    space: Ref<Space>,
    collection: string,
    tx: TxCUD<P>
  ): TxCollectionCUD<T, P> {
    return {
      _id: generateId(),
      _class: core.class.TxCollectionCUD,
      space: core.space.Tx,
      objectId,
      objectClass: _class,
      objectSpace: space,
      modifiedOn: Date.now(),
      modifiedBy: this.account,
      collection,
      tx
    }
  }

  createTxPutBag <P extends PropertyType>(
    _class: Ref<Class<Doc>>,
    space: Ref<Space>,
    objectId: Ref<Doc>,
    bag: string,
    key: string,
    value: P
  ): TxPutBag<P> {
    return {
      _id: generateId(),
      _class: core.class.TxPutBag,
      space: core.space.Tx,
      modifiedBy: this.account,
      modifiedOn: Date.now(),
      objectId,
      objectClass: _class,
      objectSpace: space,
      bag,
      key,
      value
    }
  }

  createTxUpdateDoc <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: DocumentUpdate<T>,
    retrieve?: boolean
  ): TxUpdateDoc<T> {
    return {
      _id: generateId(),
      _class: core.class.TxUpdateDoc,
      space: core.space.Tx,
      modifiedBy: this.account,
      modifiedOn: Date.now(),
      objectId,
      objectClass: _class,
      objectSpace: space,
      operations,
      retrieve
    }
  }

  createTxRemoveDoc<T extends Doc> (
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>
  ): TxRemoveDoc<T> {
    return {
      _id: generateId(),
      _class: core.class.TxRemoveDoc,
      space: core.space.Tx,
      modifiedBy: this.account,
      modifiedOn: Date.now(),
      objectId,
      objectClass: _class,
      objectSpace: space
    }
  }

  createTxMixin<D extends Doc, M extends D>(objectId: Ref<D>, objectClass: Ref<Class<D>>, mixin: Ref<Mixin<M>>, attributes: ExtendedAttributes<D, M>): TxMixin<D, M> {
    return {
      _id: generateId(),
      _class: core.class.TxMixin,
      space: core.space.Tx,
      modifiedBy: this.account,
      modifiedOn: Date.now(),
      objectId,
      objectClass,
      objectSpace: core.space.Model,
      mixin,
      attributes
    }
  }

  createTxBulkWrite (space: Ref<Space>, txes: TxCUD<Doc>[]): TxBulkWrite {
    return {
      _id: generateId(),
      _class: core.class.TxBulkWrite,
      space: core.space.Tx,
      modifiedBy: this.account,
      modifiedOn: Date.now(),
      objectSpace: space,
      txes
    }
  }
}
