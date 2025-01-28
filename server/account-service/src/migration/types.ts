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

import type { AccountRole, BackupStatus, Data, Ref, Timestamp, Version, WorkspaceDataId, WorkspaceMode, WorkspaceUuid } from '@hcengineering/core'
import type { Person } from '@hcengineering/contact'
import { type FindCursor } from 'mongodb'

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
  githubUser?: string
  openId?: string
}

/**
 * @public
 */
export interface Workspace {
  workspace: WorkspaceDataId // An uniq workspace name, Database names
  uuid?: WorkspaceUuid // An uuid for a workspace to be used already for cockroach data

  disabled?: boolean
  version?: Data<Version>
  branding?: string

  workspaceUrl?: string | null // An optional url to the workspace, if not set workspace will be used
  workspaceName?: string // An displayed workspace name
  createdOn: number
  lastVisit: number
  createdBy: string
  mode: WorkspaceMode
  progress?: number // Some progress

  endpoint: string

  region?: string // Transactor group name
  targetRegion?: string // Transactor region to move to

  backupInfo?: BackupStatus

  _id: ObjectId
  accounts: ObjectId[]

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
  workspace: {
    name: WorkspaceDataId // workspace field
  }
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
export type WorkspaceOperation = 'create' | 'upgrade' | 'all' | 'all+backup'

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

export interface Migration {
  key: string
  completed: boolean
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

  find: (query: Query<T>, sort?: { [P in keyof T]?: 'ascending' | 'descending' }, limit?: number) => Promise<T[]>
  findCursor: (query: Query<T>, sort?: { [P in keyof T]?: 'ascending' | 'descending' }, limit?: number) => FindCursor<T>
  findOne: (query: Query<T>) => Promise<T | null>
  insertOne: <K extends keyof T>(data: Partial<T>, idKey?: K) => Promise<any>
  updateOne: (query: Query<T>, ops: Operations<T>) => Promise<void>
  deleteMany: (query: Query<T>) => Promise<void>
}

export interface AccountDB {
  workspace: DbCollection<Workspace>
  account: DbCollection<Account>
  otp: DbCollection<OtpRecord>
  invite: DbCollection<Invite>
  upgrade: DbCollection<UpgradeStatistic>

  init: () => Promise<void>
  assignWorkspace: (accountId: any, workspaceId: any) => Promise<void>
  unassignWorkspace: (accountId: any, workspaceId: any) => Promise<void>
  getObjectId: (id: string) => ObjectId
}
