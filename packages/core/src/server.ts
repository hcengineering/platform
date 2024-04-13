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

import { LoadModelResponse } from '.'
import type { Class, Doc, Domain, Ref, Timestamp } from './classes'
import { Hierarchy } from './hierarchy'
import { MeasureContext } from './measurements'
import { ModelDb } from './memdb'
import type {
  DocumentQuery,
  FindOptions,
  FindResult,
  SearchOptions,
  SearchQuery,
  SearchResult,
  TxResult
} from './storage'
import type { Tx } from './tx'

/**
 * @public
 * @interface DocInfo
 * Represents information about a document, including its ID, hash, and approximate size.
 */
export interface DocInfo {
  id: string
  hash: string
  size: number // Aprox size
}
/**
 * @public
 * @interface StorageIterator
 * Represents an iterator over storage, with methods to get the next document info and to close the iterator.
 */
export interface StorageIterator {
  next: (ctx: MeasureContext) => Promise<DocInfo | undefined>
  close: (ctx: MeasureContext) => Promise<void>
}

/**
 * @public
 * @interface LowLevelStorage
 * Represents a low-level storage interface, with methods to find, load, upload, and clean documents.
 */
export interface LowLevelStorage {
  // Low level streaming API to retrieve information
  find: (ctx: MeasureContext, domain: Domain) => StorageIterator

  // Load passed documents from domain
  load: (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>

  // Upload new versions of documents
  // docs - new/updated version of documents.
  upload: (ctx: MeasureContext, domain: Domain, docs: Doc[]) => Promise<void>

  // Remove a list of documents.
  clean: (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => Promise<void>
}
/**
 * @public
 * @interface ServerStorage
 * Represents a server storage interface, extending the low-level storage interface with additional methods.
 */
export interface ServerStorage extends LowLevelStorage {
  hierarchy: Hierarchy
  modelDb: ModelDb
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> & {
      domain?: Domain // Allow to find for Doc's in specified domain only.
      prefix?: string
    }
  ) => Promise<FindResult<T>>
  searchFulltext: (ctx: MeasureContext, query: SearchQuery, options: SearchOptions) => Promise<SearchResult>
  tx: (ctx: MeasureContext, tx: Tx) => Promise<[TxResult, Tx[]]>
  apply: (ctx: MeasureContext, tx: Tx[], broadcast: boolean) => Promise<TxResult>
  close: () => Promise<void>
  loadModel: (last: Timestamp, hash?: string) => Promise<Tx[] | LoadModelResponse>
}
