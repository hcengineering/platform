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

import justClone from 'just-clone'
import type { KeysByType } from 'simplytyped'
import type {
  Account,
  Arr,
  AttachedDoc,
  Class,
  Data,
  Doc,
  Domain,
  Mixin,
  PropertyType,
  Ref,
  Space,
  Timestamp
} from './classes'
import core from './component'
import { setObjectValue } from './objvalue'
import { _getOperator } from './operator'
import { _toDoc } from './proxy'
import type { DocumentQuery, TxResult } from './storage'
import { generateId } from './utils'

/**
 * @public
 */
export interface Tx extends Doc {
  objectSpace: Ref<Space> // space where transaction will operate
}

/**
 * @public
 */
export enum WorkspaceEvent {
  UpgradeScheduled,
  Upgrade,
  IndexingUpdate,
  SecurityChange,
  MaintenanceNotification
}

/**
 * Event to be send by server during model upgrade procedure.
 * @public
 */
export interface TxWorkspaceEvent extends Tx {
  event: WorkspaceEvent
  params: any
}

/**
 * @public
 */
export interface IndexingUpdateEvent {
  _class: Ref<Class<Doc>>[]
}

/**
 * @public
 */
export interface TxModelUpgrade extends Tx {}

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
export interface DocumentClassQuery<T extends Doc> {
  _class: Ref<Class<T>>
  query: DocumentQuery<T>
}

/**
 * @public
 * Apply set of transactions in sequential manner with verification of set of queries.
 */
export interface TxApplyIf extends Tx {
  // only one operation per scope is allowed at one time.
  scope: string

  // All matches should be true with at least one document.
  match: DocumentClassQuery<Doc>[]

  // All matches should be false for all documents.
  notMatch: DocumentClassQuery<Doc>[]

  // If all matched execute following transactions.
  txes: TxCUD<Doc>[]
}

/**
 * @public
 */
export type MixinData<D extends Doc, M extends D> = Omit<M, keyof D> &
PushOptions<Omit<M, keyof D>> &
IncOptions<Omit<M, keyof D>>

/**
 * @public
 */
export type MixinUpdate<D extends Doc, M extends D> = Partial<Omit<M, keyof D>> &
PushOptions<Omit<M, keyof D>> &
IncOptions<Omit<M, keyof D>>

/**
 * Define Create/Update for mixin attributes.
 * @public
 */
export interface TxMixin<D extends Doc, M extends D> extends TxCUD<D> {
  mixin: Ref<Mixin<M>>
  attributes: MixinUpdate<D, M>
}

/**
 * @public
 */
export type ArrayAsElement<T> = {
  [P in keyof T]: T[P] extends Arr<infer X> ? Partial<X> | PullArray<X> | X : never
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
export interface QueryUpdate<X extends PropertyType> {
  $query: Partial<X>
  $update: Partial<X>
}

/**
 * @public
 */
export interface PullArray<X extends PropertyType> {
  $in: X[]
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
export type ArrayAsElementPosition<T extends object> = {
  [P in keyof T]-?: T[P] extends Arr<infer X> ? X | Position<X> : never
}

/**
 * @public
 */
export type ArrayAsElementUpdate<T extends object> = {
  [P in keyof T]-?: T[P] extends Arr<infer X> ? X | QueryUpdate<X> : never
}

/**
 * @public
 */
export type ArrayMoveDescriptor<T extends object> = {
  [P in keyof T]: T[P] extends Arr<infer X> ? MoveDescriptor<X> : never
}

/**
 * @public
 */
export type NumberProperties<T extends object> = {
  [P in keyof T]: T[P] extends number | undefined ? T[P] : never
}

/**
 * @public
 */
export type OmitNever<T extends object> = Omit<T, KeysByType<T, never>>

/**
 * @public
 */
export interface PushOptions<T extends object> {
  $push?: Partial<OmitNever<ArrayAsElementPosition<Required<T>>>>
  $pull?: Partial<OmitNever<ArrayAsElement<Required<T>>>>
  $move?: Partial<OmitNever<ArrayMoveDescriptor<Required<T>>>>
}

/**
 * @public
 */
export interface UnsetProperties {
  [key: string]: any
}

/**
 * @public
 */
export interface UnsetOptions {
  $unset?: UnsetProperties
}

/**
 * @public
 */
export interface SetEmbeddedOptions<T extends object> {
  $update?: Partial<OmitNever<ArrayAsElementUpdate<Required<T>>>>
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
export interface IncOptions<T extends object> {
  $inc?: Partial<OmitNever<NumberProperties<T>>>
}

/**
 * @public
 */
export interface SpaceUpdate {
  space?: Ref<Space>
}

/**
 * @public
 */
export type DocumentUpdate<T extends Doc> = Partial<Data<T>> &
PushOptions<T> &
SetEmbeddedOptions<T> &
PushMixinOptions<T> &
IncOptions<T> &
SpaceUpdate

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
export interface TxRemoveDoc<T extends Doc> extends TxCUD<T> {}

/**
 * @public
 */
export const DOMAIN_TX = 'tx' as Domain

/**
 * @public
 */
export interface WithTx {
  tx: (...txs: Tx[]) => Promise<TxResult>
}

/**
 * @public
 */
export abstract class TxProcessor implements WithTx {
  async tx (...txes: Tx[]): Promise<TxResult> {
    const result: TxResult[] = []
    for (const tx of txes) {
      switch (tx._class) {
        case core.class.TxCreateDoc:
          result.push(await this.txCreateDoc(tx as TxCreateDoc<Doc>))
          break
        case core.class.TxCollectionCUD:
          result.push(await this.txCollectionCUD(tx as TxCollectionCUD<Doc, AttachedDoc>))
          break
        case core.class.TxUpdateDoc:
          result.push(await this.txUpdateDoc(tx as TxUpdateDoc<Doc>))
          break
        case core.class.TxRemoveDoc:
          result.push(await this.txRemoveDoc(tx as TxRemoveDoc<Doc>))
          break
        case core.class.TxMixin:
          result.push(await this.txMixin(tx as TxMixin<Doc, Doc>))
          break
        case core.class.TxApplyIf:
          // Apply if processed on server
          return await Promise.resolve({})
      }
    }
    if (result.length === 0) {
      return {}
    }
    if (result.length === 1) {
      return result[0]
    }
    return result
  }

  static createDoc2Doc<T extends Doc>(tx: TxCreateDoc<T>): T {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
      ...justClone(tx.attributes),
      _id: tx.objectId,
      _class: tx.objectClass,
      space: tx.objectSpace,
      modifiedBy: tx.modifiedBy,
      modifiedOn: tx.modifiedOn,
      createdBy: tx.createdBy ?? tx.modifiedBy,
      createdOn: tx.createdOn ?? tx.modifiedOn
    } as T
  }

  static updateDoc2Doc<T extends Doc>(rawDoc: T, tx: TxUpdateDoc<T>): T {
    const doc = _toDoc(rawDoc)
    TxProcessor.applyUpdate<T>(doc, tx.operations as any)
    doc.modifiedBy = tx.modifiedBy
    doc.modifiedOn = tx.modifiedOn
    return rawDoc
  }

  static applyUpdate<T extends Doc>(doc: T, ops: any): void {
    for (const key in ops) {
      if (key.startsWith('$')) {
        const operator = _getOperator(key)
        operator(doc, ops[key])
      } else {
        setObjectValue(key, doc, ops[key])
      }
    }
  }

  static updateMixin4Doc<D extends Doc, M extends D>(rawDoc: D, tx: TxMixin<D, M>): D {
    const ops = tx.attributes as any
    const doc = _toDoc(rawDoc)
    const mixin = (doc as any)[tx.mixin] ?? {}
    for (const key in ops) {
      if (key.startsWith('$')) {
        const operator = _getOperator(key)
        operator(mixin, ops[key])
      } else {
        setObjectValue(key, mixin, ops[key])
      }
    }
    rawDoc.modifiedBy = tx.modifiedBy
    rawDoc.modifiedOn = tx.modifiedOn
    ;(doc as any)[tx.mixin] = mixin
    return rawDoc
  }

  static buildDoc2Doc<D extends Doc>(txes: Tx[]): D | undefined {
    let doc: Doc
    let createTx = txes.find((tx) => tx._class === core.class.TxCreateDoc)
    if (createTx === undefined) {
      const collectionTxes = txes.filter((tx) => tx._class === core.class.TxCollectionCUD) as Array<
      TxCollectionCUD<Doc, AttachedDoc>
      >
      const collectionCreateTx = collectionTxes.find((p) => p.tx._class === core.class.TxCreateDoc)
      if (collectionCreateTx === undefined) return
      createTx = TxProcessor.extractTx(collectionCreateTx)
    }
    if (createTx === undefined) return
    const objectId = (createTx as TxCreateDoc<D>).objectId
    doc = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Doc>)
    for (let tx of txes) {
      if ((tx as TxCUD<D>).objectId !== objectId && tx._class === core.class.TxCollectionCUD) {
        tx = TxProcessor.extractTx(tx)
      }
      if (tx._class === core.class.TxUpdateDoc) {
        doc = TxProcessor.updateDoc2Doc(doc, tx as TxUpdateDoc<Doc>)
      } else if (tx._class === core.class.TxMixin) {
        const mixinTx = tx as TxMixin<Doc, Doc>
        doc = TxProcessor.updateMixin4Doc(doc, mixinTx)
      }
    }
    return doc as D
  }

  static extractTx (tx: Tx): Tx {
    if (tx._class === core.class.TxCollectionCUD) {
      const ctx = tx as TxCollectionCUD<Doc, AttachedDoc>
      if (ctx.tx._class === core.class.TxCreateDoc) {
        const create = ctx.tx as TxCreateDoc<AttachedDoc>
        create.attributes.attachedTo = ctx.objectId
        create.attributes.attachedToClass = ctx.objectClass
        create.attributes.collection = ctx.collection
        return create
      }
      return ctx.tx
    }

    return tx
  }

  protected abstract txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult>
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
}

/**
 * @public
 */
export class TxFactory {
  private readonly txSpace: Ref<Space>
  constructor (readonly account: Ref<Account>, readonly isDerived: boolean = false) {
    this.txSpace = isDerived ? core.space.DerivedTx : core.space.Tx
  }

  createTxCreateDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: Data<T>,
    objectId?: Ref<T>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): TxCreateDoc<T> {
    return {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: this.txSpace,
      objectId: objectId ?? generateId(),
      objectClass: _class,
      objectSpace: space,
      modifiedOn: modifiedOn ?? Date.now(),
      modifiedBy: modifiedBy ?? this.account,
      createdBy: modifiedBy ?? this.account,
      attributes
    }
  }

  createTxCollectionCUD<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<T>>,
    objectId: Ref<T>,
    space: Ref<Space>,
    collection: string,
    tx: TxCUD<P>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): TxCollectionCUD<T, P> {
    return {
      _id: generateId(),
      _class: core.class.TxCollectionCUD,
      space: this.txSpace,
      objectId,
      objectClass: _class,
      objectSpace: space,
      modifiedOn: modifiedOn ?? Date.now(),
      modifiedBy: modifiedBy ?? this.account,
      collection,
      tx
    }
  }

  createTxUpdateDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: DocumentUpdate<T>,
    retrieve?: boolean,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): TxUpdateDoc<T> {
    return {
      _id: generateId(),
      _class: core.class.TxUpdateDoc,
      space: this.txSpace,
      modifiedBy: modifiedBy ?? this.account,
      modifiedOn: modifiedOn ?? Date.now(),
      objectId,
      objectClass: _class,
      objectSpace: space,
      operations,
      retrieve
    }
  }

  createTxRemoveDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): TxRemoveDoc<T> {
    return {
      _id: generateId(),
      _class: core.class.TxRemoveDoc,
      space: this.txSpace,
      modifiedBy: modifiedBy ?? this.account,
      modifiedOn: modifiedOn ?? Date.now(),
      objectId,
      objectClass: _class,
      objectSpace: space
    }
  }

  createTxMixin<D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    objectSpace: Ref<Space>,
    mixin: Ref<Mixin<M>>,
    attributes: MixinUpdate<D, M>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): TxMixin<D, M> {
    return {
      _id: generateId(),
      _class: core.class.TxMixin,
      space: this.txSpace,
      modifiedBy: modifiedBy ?? this.account,
      modifiedOn: modifiedOn ?? Date.now(),
      objectId,
      objectClass,
      objectSpace,
      mixin,
      attributes
    }
  }

  createTxApplyIf (
    space: Ref<Space>,
    scope: string,
    match: DocumentClassQuery<Doc>[],
    notMatch: DocumentClassQuery<Doc>[],
    txes: TxCUD<Doc>[],
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): TxApplyIf {
    return {
      _id: generateId(),
      _class: core.class.TxApplyIf,
      space: this.txSpace,
      modifiedBy: modifiedBy ?? this.account,
      modifiedOn: modifiedOn ?? Date.now(),
      objectSpace: space,
      scope,
      match,
      notMatch,
      txes
    }
  }
}
