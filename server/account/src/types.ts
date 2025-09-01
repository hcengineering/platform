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
  type AccountRole,
  type BackupStatus,
  type Branding,
  type Data,
  type MeasureContext,
  type Timestamp,
  type Version,
  type WorkspaceMemberInfo,
  type WorkspaceMode,
  type AccountUuid,
  type Person as BasePerson,
  type PersonId,
  type PersonUuid,
  type SocialId as SocialIdBase,
  type WorkspaceDataId,
  type WorkspaceUuid,
  type WorkspaceInfo,
  type IntegrationKind
} from '@hcengineering/core'
import type { EndpointInfo } from './utils'

/* ========= D A T A B A S E  E N T I T I E S ========= */
export enum Location {
  KV = 'kv',
  WEUR = 'weur',
  EEUR = 'eeur',
  WNAM = 'wnam',
  ENAM = 'apac'
}

// AccountRole in core

export interface Person extends BasePerson {
  migratedTo?: PersonUuid
}

export interface SocialId extends SocialIdBase {
  personUuid: PersonUuid
  createdOn?: Timestamp
  verifiedOn?: Timestamp
}

export interface Account {
  uuid: AccountUuid
  automatic?: boolean
  timezone?: string
  locale?: string
  hash?: Buffer | null
  salt?: Buffer | null
  maxWorkspaces?: number
}

// TODO: type data with generic type
export interface AccountEvent {
  accountUuid: AccountUuid
  eventType: AccountEventType
  data?: Record<string, any>
  time: Timestamp
}

export enum AccountEventType {
  ACCOUNT_CREATED = 'account_created',
  SOCIAL_ID_RELEASED = 'social_id_released',
  ACCOUNT_DELETED = 'account_deleted'
}

export interface Member {
  accountUuid: PersonUuid
  role: AccountRole
}

export interface WorkspaceVersion {
  versionMajor: number
  versionMinor: number
  versionPatch: number
}

export interface WorkspaceStatus extends WorkspaceVersion {
  workspaceUuid: WorkspaceUuid
  mode: WorkspaceMode
  processingProgress?: number
  lastProcessingTime?: Timestamp
  lastVisit?: Timestamp
  isDisabled: boolean
  processingAttempts?: number
  processingMessage?: string
  backupInfo?: BackupStatus

  targetRegion?: string
}

export interface Workspace {
  uuid: WorkspaceUuid
  name: string
  url: string
  allowReadOnlyGuest: boolean
  allowGuestSignUp: boolean
  dataId?: WorkspaceDataId // Old workspace identifier. E.g. Database name in Mongo, bucket in R2, etc.
  branding?: string
  location?: Location
  region?: string
  createdBy?: PersonUuid
  billingAccount?: PersonUuid
  createdOn?: Timestamp
}

export interface OTP {
  socialId: PersonId
  code: string
  expiresOn: Timestamp
  createdOn: Timestamp
}

export interface WorkspaceInvite {
  id: string // bigint should be represented as string as it exceeds JS safe integer limit
  migratedFrom?: string // old invite id to be able to find migrated invites
  workspaceUuid: WorkspaceUuid
  expiresOn: Timestamp
  emailPattern?: string
  email?: string
  remainingUses?: number
  role: AccountRole
  autoJoin?: boolean
}

export interface WorkspaceJoinInfo {
  email: string
  workspace: Workspace
  invite?: WorkspaceInvite | null
}

export interface Mailbox {
  accountUuid: PersonUuid
  mailbox: string
}

export interface MailboxSecret {
  mailbox: string
  app?: string
  secret: string
}

export interface MailboxInfo {
  mailbox: string
}

export interface Integration {
  socialId: PersonId
  kind: IntegrationKind // Integration kind. E.g. 'github', 'mail', 'telegram-bot', 'telegram' etc.
  workspaceUuid: WorkspaceUuid | null
  data?: Record<string, any>
}

export type IntegrationKey = Omit<Integration, 'data'>

export interface IntegrationSecret {
  socialId: PersonId
  kind: IntegrationKind // Integration kind. E.g. 'github', 'mail', 'telegram-bot', 'telegram' etc.
  workspaceUuid: WorkspaceUuid | null
  key: string // Key for the secret in the integration. Different secrets for the same integration must have different keys. Can be any string. E.g. '', 'user_app_1' etc.
  secret: string
}

export type IntegrationSecretKey = Omit<IntegrationSecret, 'secret'>

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
  workspace: DbCollection<Workspace>
  workspaceStatus: DbCollection<WorkspaceStatus>
  accountEvent: DbCollection<AccountEvent>
  otp: DbCollection<OTP>
  invite: DbCollection<WorkspaceInvite>
  mailbox: DbCollection<Mailbox>
  mailboxSecret: DbCollection<MailboxSecret>
  integration: DbCollection<Integration>
  integrationSecret: DbCollection<IntegrationSecret>

  init: () => Promise<void>
  createWorkspace: (data: WorkspaceData, status: WorkspaceStatusData) => Promise<WorkspaceUuid>
  updateAllowReadOnlyGuests: (workspaceId: WorkspaceUuid, readOnlyGuestsAllowed: boolean) => Promise<void>
  updateAllowGuestSignUp: (workspaceId: WorkspaceUuid, guestSignUpAllowed: boolean) => Promise<void>
  assignWorkspace: (accountId: AccountUuid, workspaceId: WorkspaceUuid, role: AccountRole) => Promise<void>
  batchAssignWorkspace: (data: [AccountUuid, WorkspaceUuid, AccountRole][]) => Promise<void>
  updateWorkspaceRole: (accountId: AccountUuid, workspaceId: WorkspaceUuid, role: AccountRole) => Promise<void>
  unassignWorkspace: (accountId: AccountUuid, workspaceId: WorkspaceUuid) => Promise<void>
  getWorkspaceRole: (accountId: AccountUuid, workspaceId: WorkspaceUuid) => Promise<AccountRole | null>
  getWorkspaceRoles: (accountId: AccountUuid) => Promise<Map<WorkspaceUuid, AccountRole>>
  getWorkspaceMembers: (workspaceId: WorkspaceUuid) => Promise<WorkspaceMemberInfo[]>
  getAccountWorkspaces: (accountId: AccountUuid) => Promise<WorkspaceInfoWithStatus[]>
  getPendingWorkspace: (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number,
    wsLivenessMs?: number
  ) => Promise<WorkspaceInfoWithStatus | undefined>
  setPassword: (accountId: AccountUuid, passwordHash: Buffer, salt: Buffer) => Promise<void>
  resetPassword: (accountId: AccountUuid) => Promise<void>
  deleteAccount: (accountId: AccountUuid) => Promise<void>
  listAccounts: (search?: string, skip?: number, limit?: number) => Promise<AccountAggregatedInfo[]>
  generatePersonUuid: () => Promise<PersonUuid>
}

export interface DbCollection<T> {
  exists: (query: Query<T>) => Promise<boolean>
  find: (query: Query<T>, sort?: Sort<T>, limit?: number) => Promise<T[]>
  findOne: (query: Query<T>) => Promise<T | null>
  insertOne: (data: Partial<T>) => Promise<any>
  insertMany: (data: Partial<T>[]) => Promise<any>
  update: (query: Query<T>, ops: Operations<T>) => Promise<void>
  deleteMany: (query: Query<T>) => Promise<void>
}

export type Sort<T> = {
  [K in keyof T]?: T[K] extends Record<string, any> | undefined ? Sort<T[K]> : 'ascending' | 'descending'
}

export type Query<T> = {
  [P in keyof T]?: T[P] | QueryOperator<T[P]> | null
}

export interface QueryOperator<T> {
  $in?: T[]
  $lt?: T
  $lte?: T
  $gt?: T
  $gte?: T
  $ne?: T | null
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
  token: string | undefined,
  params?: Record<string, any>,
  meta?: Record<string, any>
) => Promise<any>

export type WorkspaceEvent =
  | 'ping'
  | 'create-started'
  | 'upgrade-started'
  | 'progress'
  | 'create-done'
  | 'upgrade-done'
  | 'migrate-backup-started' // -> state = 'migration-backup'
  | 'restore-started'
  | 'restore-done'
  | 'migrate-backup-done' // -> state = 'migration-pending-cleaning'
  | 'migrate-clean-started' // -> state = 'migration-cleaning'
  | 'migrate-clean-done' // -> state = 'pending-restoring'
  | 'archiving-backup-started' // -> state = 'archiving'
  | 'archiving-backup-done' // -> state = 'archiving-pending-cleaning'
  | 'archiving-clean-started'
  | 'archiving-clean-done'
  | 'archiving-done'
export type WorkspaceOperation = 'create' | 'upgrade' | 'all' | 'all+backup'
export interface LoginInfo {
  account: AccountUuid
  name?: string
  socialId?: PersonId
  token?: string
}

export interface LoginInfoRequestData {
  firstName?: string
  lastName?: string
}

export type LoginInfoRequest = {
  request: true
} & LoginInfoRequestData

export interface LoginInfoWorkspace {
  url: string
  dataId?: WorkspaceDataId
  mode: WorkspaceMode
  version: WorkspaceVersion
  endpoint: EndpointInfo
  role: AccountRole | null

  progress?: number
}

export interface LoginInfoWithWorkspaces extends LoginInfo {
  // Information necessary to handle user <--> transactor connectivity.
  workspaces: Record<WorkspaceUuid, LoginInfoWorkspace>
  socialIds: SocialId[]
}

export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: WorkspaceUuid
  workspaceUrl: string
  workspaceDataId?: WorkspaceDataId
  endpoint: string
  role: AccountRole
  allowGuestSignUp?: boolean
}

export interface OtpInfo {
  sent: boolean
  retryOn: Timestamp
}

export interface RegionInfo {
  region: string
  name: string
}

export interface WorkspaceInviteInfo {
  workspace: WorkspaceUuid
  email?: string
  name?: string
}

export interface MailboxOptions {
  availableDomains: string[]
  minNameLength: number
  maxNameLength: number
  maxMailboxCount: number
}

export type ClientNetworkPosition = 'internal' | 'external'

export interface Meta {
  timezone?: string
  clientNetworkPosition?: ClientNetworkPosition
}

export interface AccountAggregatedInfo extends Omit<Account, 'hash' | 'salt'>, Person {
  uuid: AccountUuid
  integrations: Omit<Integration, 'data'>[]
  socialIds: SocialId[]
  workspaces: Omit<WorkspaceInfo, 'allowReadOnlyGuest' | 'allowGuestSignUp'>[]
}
