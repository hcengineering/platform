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

import type { Account, AccountRole, AccountUuid, Doc, Domain, PersonId, Ref } from './classes'
import { type MeasureContext } from '@hcengineering/measurements'
import { type DocumentQuery, type FindOptions } from './storage'
import type { DocumentUpdate, Tx } from './tx'
import { PermissionsGrant, type WorkspaceIds } from './utils'

/**
 * @public
 */
export interface DocInfo {
  id: string
  hash: string

  size?: number

  contentType?: string
}
/**
 * @public
 */
export interface StorageIterator {
  next: (ctx: MeasureContext) => Promise<DocInfo[]>
  close: (ctx: MeasureContext) => Promise<void>
}

export interface BroadcastTargetResult {
  target: AccountUuid[]
}

export interface BroadcastExcludeResult {
  exclude: AccountUuid[]
}

export type BroadcastResult = BroadcastTargetResult | BroadcastExcludeResult | undefined
export type BroadcastTargets = Record<string, (tx: Tx) => Promise<BroadcastResult>>

export interface SessionData {
  broadcast: {
    txes: Tx[]
    targets: BroadcastTargets // A set of broadcast filters if required
    queue: Tx[] // Queue only broadcast
    sessions: Record<string, Tx[]> // Session based broadcast
  }
  contextCache: Map<string, any>
  removedMap: Map<Ref<Doc>, Doc>
  account: Account
  service: string
  sessionId: string
  admin?: boolean
  isTriggerCtx?: boolean
  hasDomainBroadcast?: boolean
  workspace: WorkspaceIds
  socialStringsToUsers: Map<
  PersonId,
  {
    accontUuid: AccountUuid
    role: AccountRole
  }
  >
  grant?: PermissionsGrant

  asyncRequests?: ((ctx: MeasureContext, id?: string) => Promise<void>)[]
}

/**
 * @public
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

  // Low level direct group API
  groupBy: <T, P extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ) => Promise<Map<T, number>>

  // migrations
  rawFindAll: <T extends Doc>(domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<T[]>

  rawUpdate: <T extends Doc>(domain: Domain, query: DocumentQuery<T>, operations: DocumentUpdate<T>) => Promise<void>

  rawDeleteMany: <T extends Doc>(domain: Domain, query: DocumentQuery<T>) => Promise<void>

  // Traverse documents
  traverse: <T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Pick<FindOptions<T>, 'sort' | 'limit' | 'projection'>
  ) => Promise<Iterator<T>>

  getDomainHash: (ctx: MeasureContext, domain: Domain) => Promise<string>
}

export interface Iterator<T extends Doc> {
  next: (count: number) => Promise<T[] | null>
  close: () => Promise<void>
}

export interface Branding {
  key?: string
  front?: string
  title?: string
  language?: string
  initWorkspace?: string
  lastNameFirst?: string
  protocol?: string
}

export type BrandingMap = Record<string, Branding>
