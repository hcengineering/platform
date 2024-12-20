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
  type Data,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FieldIndexConfig,
  type FindResult,
  type Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  type ModelDb,
  type Ref,
  type Tx,
  type TxResult,
  type WorkspaceUuid
} from '@hcengineering/core'
import { type StorageAdapter } from './storage'
import type { ServerFindOptions } from './types'

export interface DomainHelperOperations {
  create: (domain: Domain) => Promise<void>
  exists: (domain: Domain) => Promise<boolean>

  listDomains: () => Promise<Set<Domain>>
  createIndex: (domain: Domain, value: string | FieldIndexConfig<Doc>, options?: { name: string }) => Promise<void>
  dropIndex: (domain: Domain, name: string) => Promise<void>
  listIndexes: (domain: Domain) => Promise<{ name: string }[]>

  // Could return 0 even if it has documents
  estimatedCount: (domain: Domain) => Promise<number>
}

export interface DomainHelper {
  checkDomain: (
    ctx: MeasureContext,
    domain: Domain,
    documents: number,
    operations: DomainHelperOperations
  ) => Promise<void>
}

export type DbAdapterHandler = (
  domain: Domain,
  event: 'add' | 'update' | 'delete' | 'read',
  count: number,
  helper: DomainHelperOperations
) => void
/**
 * @public
 */
export interface DbAdapter extends LowLevelStorage {
  init?: (domains?: string[], excludeDomains?: string[]) => Promise<void>

  helper?: () => DomainHelperOperations

  reserveContext?: (id: string) => () => void
  close: () => Promise<void>
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ) => Promise<FindResult<T>>

  tx: (ctx: MeasureContext, ...tx: Tx[]) => Promise<TxResult[]>

  // Bulk update operations
  update: <T extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    operations: Map<Ref<Doc>, Partial<Data<T>>>
  ) => Promise<void>

  // Allow to register a handler to listen for domain operations
  on?: (handler: DbAdapterHandler) => void
}

/**
 * @public
 */
export interface TxAdapter extends DbAdapter {
  getModel: (ctx: MeasureContext) => Promise<Tx[]>
}

/**
 * Adpater to delete a selected workspace and all its data.
 * @public
 */
export interface WorkspaceDestroyAdapter {
  deleteWorkspace: (ctx: MeasureContext, workspace: WorkspaceUuid) => Promise<void>
}

/**
 * @public
 */
export type DbAdapterFactory = (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceUuid,
  modelDb: ModelDb,
  storage?: StorageAdapter
) => Promise<DbAdapter>
