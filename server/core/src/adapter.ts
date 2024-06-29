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
  type FieldIndex,
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

export interface DomainHelperOperations {
  create: (domain: Domain) => Promise<void>
  exists: (domain: Domain) => boolean
  createIndex: (domain: Domain, value: string | FieldIndex<Doc>, options?: { name: string }) => Promise<void>
  dropIndex: (domain: Domain, name: string) => Promise<void>
  listIndexes: (domain: Domain) => Promise<{ name: string }[]>
  hasDocuments: (domain: Domain, count: number) => Promise<boolean>
}

export interface DomainHelper {
  checkDomain: (
    ctx: MeasureContext,
    domain: Domain,
    forceCreate: boolean,
    operations: DomainHelperOperations
  ) => Promise<boolean>
}

export interface RawDBAdapterStream<T extends Doc> {
  next: () => Promise<T | undefined>
  close: () => Promise<void>
}

/**
 * @public
 */
export interface RawDBAdapter {
  find: <T extends Doc>(
    ctx: MeasureContext,
    workspace: WorkspaceId,
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'projection' | 'lookup' | 'total'>
  ) => Promise<FindResult<T>>
  findStream: <T extends Doc>(
    ctx: MeasureContext,
    workspace: WorkspaceId,
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'projection' | 'lookup' | 'total'>
  ) => Promise<RawDBAdapterStream<T>>
  upload: <T extends Doc>(ctx: MeasureContext, workspace: WorkspaceId, domain: Domain, docs: T[]) => Promise<void>
  update: <T extends Doc>(
    ctx: MeasureContext,
    workspace: WorkspaceId,
    domain: Domain,
    docs: Map<Ref<T>, DocumentUpdate<T>>
  ) => Promise<void>
  clean: <T extends Doc>(ctx: MeasureContext, workspace: WorkspaceId, domain: Domain, docs: Ref<T>[]) => Promise<void>
  close: () => Promise<void>
}

/**
 * @public
 */
export interface DbAdapter {
  init?: () => Promise<void>

  helper?: () => DomainHelperOperations
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

  find: (ctx: MeasureContext, domain: Domain, recheck?: boolean) => StorageIterator

  load: (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>
  upload: (ctx: MeasureContext, domain: Domain, docs: Doc[]) => Promise<void>
  clean: (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => Promise<void>

  // Bulk update operations
  update: (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>) => Promise<void>
}

/**
 * @public
 */
export interface TxAdapter extends DbAdapter {
  getModel: (ctx: MeasureContext) => Promise<Tx[]>
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
  storage: StorageAdapter
) => Promise<DbAdapter>
