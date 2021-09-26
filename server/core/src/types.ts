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

import type { Tx, Ref, Doc, Class, Space, Timestamp, Account, FindResult, DocumentQuery, FindOptions } from '@anticrm/core'
import { TxFactory } from '@anticrm/core'
import type { Resource } from '@anticrm/platform'

/**
 * @public
 */
export type FindAll<T extends Doc> = (clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>

/**
 * @public
 */
export type TriggerFunc = (tx: Tx, txFactory: TxFactory, findAll: FindAll<Doc>) => Promise<Tx[]>

/**
 * @public
 */
export interface Trigger extends Doc {
  trigger: Resource<TriggerFunc>
}

/**
 * @public
 */
export interface IndexedDoc {
  id: string
  _class: Ref<Class<Doc>>
  space: Ref<Space>
  modifiedOn: Timestamp
  modifiedBy: Ref<Account>
  attachedTo?: Ref<Doc>
  content0?: string
  content1?: string
  content2?: string
  content3?: string
  content4?: string
  content5?: string
  content6?: string
  content7?: string
  content8?: string
  content9?: string
  data?: string
}

/**
 * @public
 */
export type SearchQuery = any // TODO: replace with DocumentQuery

/**
 * @public
 */
export interface FullTextAdapter {
  index: (doc: IndexedDoc) => Promise<void>
  update: (id: Ref<Doc>, update: Record<string, any>) => Promise<void>
  search: (query: SearchQuery) => Promise<IndexedDoc[]>
}

/**
 * @public
 */
export type FullTextAdapterFactory = (url: string, workspace: string) => Promise<FullTextAdapter>

/**
 * @public
 */
export interface Token {
  workspace: string
}

/**
 * @public
 */
export interface WithFind {
  findAll: <T extends Doc> (clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>
}
