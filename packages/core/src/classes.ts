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

import type { IntlString, Asset, Resource } from '@anticrm/platform'

/**
 * @public
 */
export type Ref<T extends Doc> = string & { __ref: T }
export type PrimitiveType = number | string | boolean | undefined | Ref<Doc>
export type Timestamp = number

export interface Obj {
  _class: Ref<Class<this>>
}

export interface Doc extends Obj {
  _id: Ref<this>
  space: Ref<Space>
  modifiedOn: Timestamp
  modifiedBy: Ref<Account>
}

export type PropertyType = any

export interface UXObject extends Obj {
  label?: IntlString
  icon?: Asset
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Type<T extends PropertyType> extends UXObject {}

export interface Attribute<T extends PropertyType> extends Doc, UXObject {
  attributeOf: Ref<Class<Obj>>
  name: string
  type: Type<T>
}

export type AnyAttribute = Attribute<Type<any>>

export enum ClassifierKind {
  CLASS,
  MIXIN
}

export interface Classifier extends Doc, UXObject {
  kind: ClassifierKind
}

export type Domain = string & { __domain: true }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Class<T extends Obj> extends Classifier {
  extends?: Ref<Class<Obj>>
  domain?: Domain
  triggers?: Trigger[]
}

export type Mixin<T extends Doc> = Class<T>

// D A T A

export type Data<T extends Doc> = Omit<T, keyof Doc>

// T Y P E S

export interface RefTo<T extends Doc> extends Type<Ref<Class<T>>> {
  to: Ref<Class<T>>
}

export type Bag<T extends PropertyType> = Record<string, T>

export interface BagOf<T extends PropertyType> extends Type<Bag<T>> {
  of: Type<T>
}

export type Arr<T extends PropertyType> = T[]

export interface ArrOf<T extends PropertyType> extends Type<T[]> {
  of: Type<T>
}

export const DOMAIN_MODEL = 'model' as Domain

// S E C U R I T Y

export interface Space extends Doc {
  name: string
  description: string
  private: boolean
  members: Arr<Ref<Account>>
}

export interface Account extends Doc {}

// T X

export interface TxFactory {
  createTxCreateDoc: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, attributes: Data<T>) => TxCreateDoc<T>
  createTxMixin: <D extends Doc, M extends D>(objectId: Ref<D>, objectClass: Ref<Class<D>>, mixin: Ref<Mixin<M>>, attributes: ExtendedAttributes<D, M>) => TxMixin<D, M>
}

export type Trigger = Resource<(tx: Tx, txFactory: TxFactory) => Promise<Tx[]>>

export interface Tx<T extends Doc = Doc> extends Doc {
  objectId: Ref<T>
  objectClass: Ref<Class<T>>
  objectSpace: Ref<Space>
}

export interface TxCreateDoc<T extends Doc> extends Tx<T> {
  attributes: Data<T>
}

export type ExtendedAttributes<D extends Doc, M extends D> = Omit<M, keyof D>

export interface TxMixin<D extends Doc, M extends D> extends Tx<D> {
  mixin: Ref<Mixin<M>>
  attributes: ExtendedAttributes<D, M>
}
