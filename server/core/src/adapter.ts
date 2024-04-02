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

import {
  type Class,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type IndexingConfiguration,
  type MeasureContext,
  type ModelDb,
  type Ref,
  type StorageIterator,
  type Tx,
  type TxResult,
  type WorkspaceId
} from '@hcengineering/core'
import { type StorageAdapter } from './storage'

/**
 * @public
 */
export interface RawDBAdapter {
  find: <T extends Doc>(
    workspace: WorkspaceId,
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'projection' | 'lookup'>
  ) => Promise<FindResult<T>>
  upload: <T extends Doc>(workspace: WorkspaceId, domain: Domain, docs: T[]) => Promise<void>
}

/**
 * @public
 */
export interface DbAdapter {
  /**
   * Method called after hierarchy is ready to use.
   */
  init: (model: Tx[]) => Promise<void>

  createIndexes: (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>) => Promise<void>
  removeOldIndex: (domain: Domain, deletePattern: RegExp, keepPattern: RegExp) => Promise<void>

  close: () => Promise<void>
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> & {
      domain?: Domain // Allow to find for Doc's in specified domain only.
    }
  ) => Promise<FindResult<T>>
  tx: (ctx: MeasureContext, ...tx: Tx[]) => Promise<TxResult[]>

  find: (domain: Domain) => StorageIterator

  load: (domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>
  upload: (domain: Domain, docs: Doc[]) => Promise<void>
  clean: (domain: Domain, docs: Ref<Doc>[]) => Promise<void>

  // Bulk update operations
  update: (domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>) => Promise<void>
}

/**
 * @public
 */
export interface TxAdapter extends DbAdapter {
  getModel: () => Promise<Tx[]>
}

/**
 * @public
 */
export type DbAdapterFactory = (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb,
  storage?: StorageAdapter
) => Promise<DbAdapter>
