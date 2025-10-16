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

import { type MeasureContext } from '@hcengineering/measurements'
import type { Account, AccountRole, AccountUuid, Doc, PersonId, Ref } from './classes'
import type { Tx } from './tx'
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
 * @deprecated moved to huly.server, marked as any if some code will still use it.
 */
export type LowLevelStorage = any

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
