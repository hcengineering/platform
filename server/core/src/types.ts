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

import type { Tx, Ref, Doc, Class, Space, Timestamp, Account } from '@anticrm/core'
import { TxFactory } from '@anticrm/core'
import type { Resource } from '@anticrm/platform'

/**
 * @public
 */
export type TriggerFunc = (tx: Tx, txFactory: TxFactory) => Promise<Tx[]>

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
  content: string
}

/**
 * @public
 */
export type SearchQuery = any

/**
 * @public
 */
export interface FullTextAdapter {
  index: (doc: IndexedDoc) => Promise<void>
  search: (query: SearchQuery) => Promise<IndexedDoc[]>
}

/**
 * @public
 */
export type FullTextAdapterFactory = (url: string, workspace: string) => Promise<FullTextAdapter>
