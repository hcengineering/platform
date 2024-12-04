//
// Copyright © 2022-2024 Hardcore Engineering Inc.
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
  AccountRole,
  Person,
  Branding,
  Data,
  MeasureContext,
  Timestamp,
  Version,
  SocialIdType,
  WorkspaceMode
} from '@hcengineering/core'

export { AccountRole, type Person } from '@hcengineering/core'

/* ========= D A T A B A S E  E N T I T I E S ========= */
export enum Location {
  KV = 'kv',
  WEUR = 'weur',
  EEUR = 'eeur',
  WNAM = 'wnam',
  ENAM = 'apac'
}

// AccountRole in core
// Person in core
export interface SocialId {
  id: string // bigint should be represented as string as it exceeds JS safe integer limit
  type: SocialIdType
  value: string
  key?: string // Calculated from type and value
  personId: string
  createdOn?: Timestamp
  verifiedOn?: Timestamp
}

export interface Account {
  uuid: string
  timezone?: string
  locale?: string
  hash?: Buffer
  salt?: Buffer
}

export interface AccountEvent {
  accountUuid: string
  eventType: string
  data?: Record<string, any>
  time: Timestamp
}

export interface Member {
  accountUuid: string
  role: AccountRole
}

export interface WorkspaceStatus {
  workspaceUuid: string
  mode?: WorkspaceMode
  processingProgress?: number
  versionMajor: number
  versionMinor: number
  versionPatch: number
  lastProcessingTime?: Timestamp
  lastVisit?: Timestamp
  isDisabled: boolean
  processingAttempts?: number
  processingMessage?: string
  backupInfo?: Record<string, any>
}

export interface Workspace {
  uuid: string
  name: string
  url: string
  dbName?: string // Database name for Mongo compatibility
  branding?: string
  location?: Location
  region?: string
  createdBy: string // Account UUID
  billingAccount: string // Account UUID
  // members: Member[]
  createdOn?: Timestamp
}

export interface OTP {
  socialId: string
  code: string
  expiresOn: Timestamp
  createdOn: Timestamp
}

export interface WorkspaceInvite {
  id: string // bigint should be represented as string as it exceeds JS safe integer limit
  workspaceUuid: string
  expiresOn: Timestamp
  emailPattern?: string
  remainingUses?: number
  role: AccountRole
}

/* ========= S U P P L E M E N T A R Y ========= */

export interface WorkspaceInfoWithStatus extends Workspace {
  status: WorkspaceStatus
}
export type WorkspaceData = Omit<Workspace, 'uuid' | 'status' | 'members'>

export interface WorkspaceWithEndpoint extends Workspace {
  endpoint?: string
}

export type WorkspaceStatusData = Omit<WorkspaceStatus, 'workspaceUuid'>

export type WorkspaceInviteData = Omit<WorkspaceInvite, 'id'>

/* ========= D A T A B A S E  C O L L E C T I O N S ========= */
export interface AccountDB {
  person: DbCollection<Person>
  account: DbCollection<Account>
  socialId: DbCollection<SocialId>
  workspace: WorkspaceDbCollection
  workspaceStatus: DbCollection<WorkspaceStatus>
  accountEvent: DbCollection<AccountEvent>
  otp: DbCollection<OTP>
  invite: DbCollection<WorkspaceInvite>

  init: () => Promise<void>
  createWorkspace: (data: WorkspaceData, status: WorkspaceStatusData) => Promise<string>
  assignWorkspace: (accountId: string, workspaceId: string, role: AccountRole) => Promise<void>
  updateWorkspaceRole: (accountId: string, workspaceId: string, role: AccountRole) => Promise<void>
  unassignWorkspace: (accountId: string, workspaceId: string) => Promise<void>
  getWorkspaceRole: (accountId: string, workspaceId: string) => Promise<AccountRole | null>
  getAccountWorkspaces: (accountId: string) => Promise<WorkspaceInfoWithStatus[]>
  setPassword: (accountId: string, passwordHash: Buffer, salt: Buffer) => Promise<void>
}

export interface DbCollection<T> {
  find: (query: Query<T>, sort?: Sort<T>, limit?: number) => Promise<T[]>
  findOne: (query: Query<T>) => Promise<T | null>
  insertOne: <K extends keyof T | undefined>(
    data: Partial<T>,
    idKey?: K
  ) => Promise<any>
  updateOne: (query: Query<T>, ops: Operations<T>) => Promise<void>
  deleteMany: (query: Query<T>) => Promise<void>
}

export interface WorkspaceDbCollection extends DbCollection<Workspace> {
  getPendingWorkspace: (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number,
    wsLivenessMs?: number
  ) => Promise<WorkspaceInfoWithStatus | undefined>
}

export type Sort<T> = { [K in keyof T]?: T[K] extends (Record<string, any> | undefined) ? Sort<T[K]> : 'ascending' | 'descending' }

export type Query<T> = {
  [P in keyof T]?: T[P] | QueryOperator<T[P]>
}

export interface QueryOperator<T> {
  $in?: T[]
  $lt?: T
  $lte?: T
  $gt?: T
  $gte?: T
}

export type Operations<T> = Partial<T> & {
  $inc?: Partial<Record<keyof T, number>>
  $set?: Partial<T>
}

/* ========= U T I L I T I E S ========= */

export type AccountMethodHandler = (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  request: any,
  token?: string
) => Promise<any>

export type WorkspaceEvent = 'ping' | 'create-started' | 'upgrade-started' | 'progress' | 'create-done' | 'upgrade-done'
export type WorkspaceOperation = 'create' | 'upgrade' | 'all'
export interface LoginInfo {
  account: string
  token?: string
}

export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
  workspaceUrl: string
  endpoint: string
  role: AccountRole
}

export interface OtpInfo {
  sent: boolean
  retryOn: Timestamp
}

export interface RegionInfo {
  region: string
  name: string
}
