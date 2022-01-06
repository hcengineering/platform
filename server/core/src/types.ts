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

import type { Tx, Ref, Doc, Class, Space, Timestamp, Account, FindResult, DocumentQuery, FindOptions, TxResult, MeasureContext } from '@anticrm/core'
import { TxFactory, Hierarchy } from '@anticrm/core'
import type { Resource } from '@anticrm/platform'

/**
 * @public
 */
export type FindAll<T extends Doc> = (clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>

/**
 * @public
 */
export type TriggerFunc = (tx: Tx, txFactory: TxFactory, findAll: FindAll<Doc>, hierarchy: Hierarchy) => Promise<Tx[]>

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
  id: Ref<Doc>
  _class: Ref<Class<Doc>>
  space: Ref<Space>
  modifiedOn: Timestamp
  modifiedBy: Ref<Account>
  attachedTo?: Ref<Doc>

  [key: string]: any
}

/**
 * @public
 */
export interface FullTextAdapter {
  index: (doc: IndexedDoc) => Promise<TxResult>
  update: (id: Ref<Doc>, update: Record<string, any>) => Promise<TxResult>
  remove: (id: Ref<Doc>) => Promise<void>
  search: (_class: Ref<Class<Doc>>, search: DocumentQuery<Doc>, size: number | undefined) => Promise<IndexedDoc[]>
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
  findAll: <T extends Doc> (ctx: MeasureContext, clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>
}
