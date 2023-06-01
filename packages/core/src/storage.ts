//
// Copyright © 2021 Anticrm Platform Contributors.
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
import type { AttachedDoc, Class, Doc, Ref } from './classes'
import type { Tx } from './tx'

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QuerySelector<T> = {
  $in?: T[]
  $all?: T extends Array<any> ? T : never
  $nin?: T[]
  $ne?: T
  $gt?: T extends number ? number : never
  $gte?: T extends number ? number : never
  $lt?: T extends number ? number : never
  $lte?: T extends number ? number : never
  $exists?: boolean
  $like?: string
  $regex?: string
  $options?: string
}

/**
 * @public
 */
export type ObjQueryType<T> = (T extends Array<infer U> ? U | U[] : T) | QuerySelector<T>

/**
 * @public
 */
export type DocumentQuery<T extends Doc> = {
  [P in keyof T]?: ObjQueryType<T[P]>
} & {
  $search?: string
  // support nested queries e.g. 'user.friends.name'
  // this will mark all unrecognized properties as any (including nested queries)
  [key: string]: any
}

/**
 * @public
 */
export type ToClassRefT<T extends object, P extends keyof T> = T[P] extends Ref<infer X> | null | undefined
  ? Ref<Class<X>> | [Ref<Class<X>>, Lookup<X>]
  : never
/**
 * @public
 */
export type ToClassRefTA<T extends object, P extends keyof T> = T[P] extends Array<Ref<infer X>> | null | undefined
  ? Ref<Class<X>> | [Ref<Class<X>>, Lookup<X>]
  : never
/**
 * @public
 */
export type ToClassRef<T extends object> = {
  [P in keyof T]?: ToClassRefT<T, P> | ToClassRefTA<T, P>
}

/**
 * @public
 */
export type NullableRef = Ref<Doc> | Array<Ref<Doc>> | null | undefined

/**
 * @public
 */
export type RefKeys<T extends Doc> = Pick<T, KeysByType<T, NullableRef>>

/**
 * @public
 */
export type Refs<T extends Doc> = ToClassRef<RefKeys<T>>

/**
 * @public
 */
export interface ReverseLookups {
  _id?: ReverseLookup
}

/**
 * @public
 */
export interface ReverseLookup {
  [key: string]: Ref<Class<AttachedDoc>> | [Ref<Class<Doc>>, string]
}

/**
 * @public
 */
export type Lookup<T extends Doc> = Refs<T> | ReverseLookups | (Refs<T> & ReverseLookups)

/**
 * @public
 */
export type Projection<T extends Doc> = {
  [P in keyof T]?: 0 | 1
}

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FindOptions<T extends Doc> = {
  limit?: number
  sort?: SortingQuery<T>
  lookup?: Lookup<T>
  projection?: Projection<T>

  // If specified total will be returned
  total?: boolean
}

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SortQuerySelector<T> = {
  $in?: T[]
  $nin?: T[]
  $ne?: T
}
/**
 * @public
 */
export type SortRuleQueryType<T> = (T extends Array<infer U> ? U | U[] : T) | SortQuerySelector<T>

/**
 * @public
 */
export interface SortingRules<T> {
  order: SortingOrder
  default?: string | number
  cases: {
    query: SortRuleQueryType<T>
    index: string | number
  }[]
}

/**
 * @public
 */
export type SortingQuery<T extends Doc> = {
  [P in keyof T]?: SortingOrder | SortingRules<T[P]>
} & {
  // support nested queries e.g. 'user.friends.name'
  // this will mark all unrecognized properties as any (including nested queries)
  [key: string]: SortingOrder | SortingRules<any>
}

/**
 * @public
 */
export enum SortingOrder {
  Ascending = 1,
  Descending = -1
}

/**
 * @public
 */
export type RefsAsDocs<T> = {
  [P in keyof T]: T[P] extends Ref<infer X> | null | undefined ? (T extends X ? X : X | WithLookup<X>) : AttachedDoc[]
}

/**
 * @public
 */
export type LookupData<T extends Doc> = Partial<RefsAsDocs<T>>

/**
 * @public
 */
export type WithLookup<T extends Doc> = T & {
  $lookup?: LookupData<T>
  $source?: {
    $score: number // Score for document result
    [key: string]: any
  }
}

/**
 * @public
 */
export type FindResult<T extends Doc> = WithLookup<T>[] & {
  total: number
}

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TxResult {}

/**
 * @public
 */
export interface Storage {
  findAll: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (tx: Tx) => Promise<TxResult>
}
