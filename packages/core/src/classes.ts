//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { IntlString, Asset } from '@anticrm/platform'

/**
 * @public
 */
export type Ref<T extends Doc> = string & { __ref: T }

/**
 * @public
 */
export type PrimitiveType = number | string | boolean | undefined | Ref<Doc>

/**
 * @public
 */
export type Timestamp = number

/**
 * @public
 */
export interface Obj {
  _class: Ref<Class<this>>
}

/**
 * @public
 */
export interface Doc extends Obj {
  _id: Ref<this>
  space: Ref<Space>
  modifiedOn: Timestamp
  modifiedBy: Ref<Account>
}

/**
 * @public
 */
export type PropertyType = any

/**
 * @public
 */
export interface UXObject extends Obj {
  label: IntlString
  icon?: Asset
}

/**
 * @public
 */
export interface AttachedDoc extends Doc {
  attachedTo: Ref<Doc>
}

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Type<T extends PropertyType> extends UXObject {}

/**
 * @public
 */
export enum IndexKind {
  FullText
}

/**
 * @public
 */
export interface Attribute<T extends PropertyType> extends Doc, UXObject {
  attributeOf: Ref<Class<Obj>>
  name: string
  type: Type<T>
  index?: IndexKind
}

/**
 * @public
 */
export type AnyAttribute = Attribute<Type<any>>

/**
 * @public
 */
export enum ClassifierKind {
  CLASS,
  MIXIN
}

/**
 * @public
 */
export interface Classifier extends Doc, UXObject {
  kind: ClassifierKind
}

/**
 * @public
 */
export type Domain = string & { __domain: true }

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Class<T extends Obj> extends Classifier {
  extends?: Ref<Class<Obj>>
  domain?: Domain
}

/**
 * @public
 */
export type Mixin<T extends Doc> = Class<T>

// D A T A

/**
 * @public
 */
export type Data<T extends Doc> = Omit<T, keyof Doc>

// T Y P E S

/**
 * @public
 */
export interface RefTo<T extends Doc> extends Type<Ref<Class<T>>> {
  to: Ref<Class<T>>
}

/**
 * @public
 */
export type Bag<T extends PropertyType> = Record<string, T>

/**
 * @public
 */
export interface BagOf<T extends PropertyType> extends Type<Bag<T>> {
  of: Type<T>
}

/**
 * @public
 */
export type Arr<T extends PropertyType> = T[]

/**
 * @public
 */
export interface ArrOf<T extends PropertyType> extends Type<T[]> {
  of: Type<T>
}

/**
 * @public
 */
export const DOMAIN_MODEL = 'model' as Domain

// S P A C E

/**
 * @public
 */
export interface Space extends Doc {
  name: string
  description: string
  private: boolean
  members: Arr<Ref<Account>>
}

/**
 * @public
 */
export interface Account extends Doc {
  email: string
}

// S T A T E

/**
 * @public
 */
export interface State extends Doc {
  title: string
  color: string
}

/**
 * @public
 */
export interface DocWithState extends Doc {
  state: Ref<State>
  number: number
}

/**
 * @public
 */
export interface SpaceWithStates extends Space {
}
