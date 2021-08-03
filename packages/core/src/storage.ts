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
import type { Class, Doc, Ref, Tx } from './classes'

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QuerySelector<T> = {
  $in?: T[]
  $like?: string
}

export type ObjQueryType<T> = T | QuerySelector<T>

export type DocumentQuery<T extends Doc> = {
  [P in keyof T]?: ObjQueryType<T[P]>
}

export type Refs<T extends Doc> = Partial<Pick<T, KeysByType<T, Ref<Doc>>>>

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FindOptions<T extends Doc> = {
  limit?: number
  sort?: SortingQuery<T>
  lookup?: Refs<T>
}

export type SortingQuery<T extends Doc> = {
  [P in keyof T]?: T[P] extends object ? never : SortingOrder
}

export enum SortingOrder {
  Ascending = 1,
  Descending = -1
}

type RefsAsDocs<T extends Doc> = {
  [P in keyof T]: T[P] extends Ref<infer X> ? X : never
}

type RemoveNever<T extends object> = Omit<T, KeysByType<T, never>>

export type LookupData<T extends Doc> = Partial<RemoveNever<RefsAsDocs<T>>>

export type WithLookup<T extends Doc> = T & {
  $lookup?: LookupData<T>
}

export type FindResult<T extends Doc> = WithLookup<T>[]

export interface Storage {
  findAll: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (tx: Tx) => Promise<void>
}
