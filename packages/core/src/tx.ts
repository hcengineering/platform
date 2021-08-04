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
import type { Class, Data, Doc, Domain, Ref, Account, Space, Arr, Mixin, Tx, TxCreateDoc, TxFactory, TxMixin, ExtendedAttributes } from './classes'
import core from './component'
import { generateId } from './utils'

/**
 * @public
 */
export type ArrayAsElement<T extends Doc> = {
  [P in keyof T]: T[P] extends Arr<infer X> ? X : never
}

/**
 * @public
 */
export type OmitNever<T extends object> = Omit<T, KeysByType<T, never>>

/**
 * @public
 */
export interface PushOptions<T extends Doc> {
  $push?: Partial<OmitNever<ArrayAsElement<T>>>
}

/**
 * @public
 */
export type DocumentUpdate<T extends Doc> = Partial<Data<T>> & PushOptions<T>

/**
 * @public
 */
export interface TxUpdateDoc<T extends Doc> extends Tx<T> {
  operations: DocumentUpdate<T>
}

/**
 * @public
 */
export interface TxRemoveDoc<T extends Doc> extends Tx<T> {
}

/**
 * @public
 */
export const DOMAIN_TX = 'tx' as Domain

/**
 * @public
 */
export interface WithTx {
  tx: (tx: Tx) => Promise<void>
}

/**
 * @public
 */
export class TxProcessor implements WithTx {
  async tx (tx: Tx): Promise<void> {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        return await this.txCreateDoc(tx as TxCreateDoc<Doc>)
      case core.class.TxUpdateDoc:
        return await this.txUpdateDoc(tx as TxUpdateDoc<Doc>)
      case core.class.TxRemoveDoc:
        return await this.txRemoveDoc(tx as TxRemoveDoc<Doc>)
      case core.class.TxMixin:
        return await this.txMixin(tx as TxMixin<Doc, Doc>)
    }
  }

  static createDoc2Doc<T extends Doc> (tx: TxCreateDoc<T>): T {
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

  protected async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {}
  protected async txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<void> {}
  protected async txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<void> {}
  protected async txMixin (tx: TxMixin<Doc, Doc>): Promise<void> {}
}

/**
 * @public
 */
export interface TxOperations {
  createDoc: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, attributes: Data<T>) => Promise<T>
  updateDoc: <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: DocumentUpdate<T>
  ) => Promise<void>
  removeDoc: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, objectId: Ref<T>) => Promise<void>
}

/**
 * @public
 */
export function withOperations<T extends WithTx> (user: Ref<Account>, storage: T): T & TxOperations {
  const result = storage as T & TxOperations

  result.createDoc = async <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: Data<T>
  ): Promise<T> => {
    const tx: TxCreateDoc<T> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      modifiedBy: user,
      modifiedOn: Date.now(),
      objectId: generateId(),
      objectClass: _class,
      objectSpace: space,
      attributes
    }
    await storage.tx(tx)
    return TxProcessor.createDoc2Doc(tx)
  }

  result.updateDoc = async <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: DocumentUpdate<T>
  ): Promise<void> => {
    const tx: TxUpdateDoc<T> = {
      _id: generateId(),
      _class: core.class.TxUpdateDoc,
      space: core.space.Tx,
      modifiedBy: user,
      modifiedOn: Date.now(),
      objectId,
      objectClass: _class,
      objectSpace: space,
      operations
    }
    await storage.tx(tx)
  }

  result.removeDoc = async <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>
  ): Promise<void> => {
    const tx: TxRemoveDoc<T> = {
      _id: generateId(),
      _class: core.class.TxRemoveDoc,
      space: core.space.Tx,
      modifiedBy: user,
      modifiedOn: Date.now(),
      objectId,
      objectClass: _class,
      objectSpace: space
    }
    await storage.tx(tx)
  }

  return result
}

/**
 * @public
 */
export class DefaultTxFactory implements TxFactory {
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
}
