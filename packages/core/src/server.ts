//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { MeasureContext } from './measurements'
import type { Doc, Class, Ref, Domain, Timestamp } from './classes'
import { Hierarchy } from './hierarchy'
import { ModelDb } from './memdb'
import type { DocumentQuery, FindOptions, FindResult, TxResult } from './storage'
import type { Tx } from './tx'
import { LoadModelResponse } from '.'

/**
 * @public
 */
export interface DocInfo {
  id: string
  hash: string
  size: number // Aprox size
}
/**
 * @public
 */
export interface StorageIterator {
  next: () => Promise<DocInfo | undefined>
  close: () => Promise<void>
}

/**
 * @public
 */
export interface LowLevelStorage {
  // Low level streaming API to retrieve information
  find: (domain: Domain) => StorageIterator

  // Load passed documents from domain
  load: (domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>

  // Upload new versions of documents
  // docs - new/updated version of documents.
  upload: (domain: Domain, docs: Doc[]) => Promise<void>

  // Remove a list of documents.
  clean: (domain: Domain, docs: Ref<Doc>[]) => Promise<void>
}
/**
 * @public
 */
export interface ServerStorage extends LowLevelStorage {
  hierarchy: Hierarchy
  modelDb: ModelDb
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (ctx: MeasureContext, tx: Tx) => Promise<[TxResult, Tx[]]>
  apply: (ctx: MeasureContext, tx: Tx[], broadcast: boolean) => Promise<Tx[]>
  close: () => Promise<void>
  loadModel: (last: Timestamp, hash?: string) => Promise<Tx[] | LoadModelResponse>
}
