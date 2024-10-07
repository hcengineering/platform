//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type {
  AccountRole,
  BaseWorkspaceInfo,
  Data,
  Ref,
  Timestamp,
  Version,
  WorkspaceId,
  WorkspaceMode
} from '@hcengineering/core'
import type { Person } from '@hcengineering/contact'

export type ObjectId = any

/**
 * @public
 */
export interface Account {
  _id: any
  email: string
  // null if auth provider was used
  hash: Buffer | null
  salt: Buffer
  workspaces: any[]
  first: string
  last: string
  // Defined for server admins only
  admin?: boolean
  confirmed?: boolean
  lastWorkspace?: number
  createdOn: number
  lastVisit: number
  githubId?: string
  openId?: string
}

/**
 * @public
 */
export interface Workspace extends BaseWorkspaceInfo {
  _id: ObjectId
  accounts: ObjectId[]

  region?: string // Transactor group name
  lastProcessingTime?: number
  attempts?: number
  message?: string
}

/**
 * @public
 */
export type ClientWorkspaceInfo = Omit<Workspace, '_id' | 'accounts' | 'workspaceUrl'> & { workspaceId: string }

/**
 * @public
 */
export type WorkspaceInfo = Omit<Workspace, '_id' | 'accounts'>

export interface OtpRecord {
  account: ObjectId
  otp: string
  expires: Timestamp
  createdOn: Timestamp
}

export interface OtpInfo {
  sent: boolean
  retryOn: Timestamp
}

/**
 * @public
 */
export interface LoginInfo {
  email: string
  token: string
  endpoint: string
}

/**
 * @public
 */
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string

  workspaceId: string

  mode: WorkspaceMode
  progress?: number
}

export interface RegionInfo {
  region: string
  name: string
}

/**
 * @public
 */
export interface Invite {
  _id: ObjectId
  workspace: WorkspaceId
  exp: number
  emailMask: string
  limit: number
  role?: AccountRole
  personId?: Ref<Person>
}

/**
 * @public
 */
export type AccountInfo = Omit<Account, 'hash' | 'salt'>

/**
 * @public
 */
export type WorkspaceEvent = 'ping' | 'create-started' | 'upgrade-started' | 'progress' | 'create-done' | 'upgrade-done'

/**
 * @public
 */
export type WorkspaceOperation = 'create' | 'upgrade' | 'all'

/**
 * @public
 */
export interface UpgradeStatistic {
  region: string
  version: string
  startTime: number
  total: number
  toProcess: number
  lastUpdate?: number
}

interface Operator<T, P extends keyof T> {
  $in?: T[P][]
  $lt?: T[P]
  $lte?: T[P]
  $gt?: T[P]
  $gte?: T[P]
}

export type Query<T> = {
  [P in keyof T]?: T[P] | Operator<T, P>
}

export type Operations<T> = Partial<T> & {
  $inc?: Partial<T>
}

export interface DbCollection<T extends Record<string, any>> {
  name: string

  init: () => Promise<void>
  find: (query: Query<T>, sort?: { [P in keyof T]?: 'ascending' | 'descending' }, limit?: number) => Promise<T[]>
  findOne: (query: Query<T>) => Promise<T | null>
  insertOne: <K extends keyof T>(data: Partial<T>, idKey?: K) => Promise<any>
  updateOne: (query: Query<T>, ops: Operations<T>) => Promise<void>
  deleteMany: (query: Query<T>) => Promise<void>
}

export interface AccountDB {
  workspace: WorkspaceDbCollection
  account: DbCollection<Account>
  otp: DbCollection<OtpRecord>
  invite: DbCollection<Invite>
  upgrade: DbCollection<UpgradeStatistic>

  init: () => Promise<void>
  assignWorkspace: (accountId: any, workspaceId: any) => Promise<void>
  unassignWorkspace: (accountId: any, workspaceId: any) => Promise<void>
  getObjectId: (id: string) => ObjectId
}

export interface WorkspaceDbCollection extends DbCollection<Workspace> {
  countWorkspacesInRegion: (region: string, upToVersion?: Data<Version>, visitedSince?: number) => Promise<number>
  getPendingWorkspace: (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number
  ) => Promise<WorkspaceInfo | undefined>
}
