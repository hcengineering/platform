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
  type UsageStatus,
  type WorkspaceConfiguration,
  type WorkspaceDataId,
  type WorkspaceUuid,
  type WorkspaceInfo,
  type IntegrationKind
} from '@hcengineering/core'
import type { AccountListRow } from '@hcengineering/account-client'
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
  failedLoginAttempts?: number // Number of consecutive failed login attempts
  tfaSecret?: string
  // V27 admin user management:
  disabledAt?: number | null         // epoch-ms; null = active
  tokenVersion?: number              // monotonic counter, default 0
  lastActivityAt?: number | null     // epoch-ms; null = no logins yet
}

// V27 admin user management
export type AdminAuditAction =
  | 'role_change'
  | 'remove_member'
  | 'trigger_password_reset'
  | 'disable'
  | 'enable'
  | 'create_account'         // new: createAccountAdmin endpoint
  | 'delete_account'         // new: hard-delete via deleteAccount (irreversible)
  | 'add_workspace_member'   // new: addWorkspaceMember + bulkAddToWorkspace
  // Workspace-operation audit entries (V28 — targetAccount is null for these)
  | 'archive_workspace'
  | 'unarchive_workspace'
  | 'migrate_workspace'
  | 'delete_workspace'
  | 'reset_workspace_attempts'

export interface AdminAuditLogEntry {
  id: string
  tsMs: number
  adminAccount: AccountUuid
  targetAccount: AccountUuid | null  // nullable: workspace-only audit entries have null here (V28)
  action: AdminAuditAction
  workspaceUuid: WorkspaceUuid | null
  details: Record<string, any> | null
  // V29 — Bulk-action service calls stamp every row with one shared UUID so
  // the admin UI can group "this is one operation". NULL on single-action sites.
  batchId?: string | null
}

/**
 * Parameters for the SQL-pushdown listAccountsAdmin query (Task 2-2).
 * This is a server-internal type; the public API uses ListAccountsAdminParams
 * from \@hcengineering/account-client.
 */
export interface ListAccountsAdminQueryParams {
  search?: string
  statusIn?: Array<'active' | 'disabled'>
  isAdmin?: boolean
  authMethodIn?: Array<'email_only' | 'oidc' | 'mixed'>
  nameContains?: string
  emailContains?: string
  workspaceUuidsIn?: WorkspaceUuid[]
  wsMin?: number
  wsMax?: number
  lastActivityFilter?:
    | { kind: 'never' }
    | { kind: 'before', tsMs: number }
    | { kind: 'after', tsMs: number }
    | { kind: 'between', from: number, to: number }
    | { kind: 'range', fromMs?: number, toMs?: number }  // legacy compat with existing params shape
  orphan?: boolean
  sort?: { field: 'name' | 'email' | 'auth' | 'workspace_count' | 'last_activity' | 'status', direction: 'asc' | 'desc' }
  pagination?: { limit?: number, offset?: number }
}

export interface AdminAuditLogListParams {
  filter?: {
    adminUuid?: AccountUuid
    action?: string
    targetAccountUuid?: AccountUuid
    targetWorkspaceUuid?: WorkspaceUuid
    from?: number
    to?: number
    // V30 — Substring filters bound to UI-visible identifiers.
    adminNameOrEmail?: string
    targetNameOrUrl?: string
    actionIn?: string[]
  }
  sort?: {
    field: 'time' | 'admin' | 'action' | 'target'
    direction: 'asc' | 'desc'
  }
  cursor?: string
  limit?: number
}

export interface AdminAuditLogListResult {
  entries: Array<AdminAuditLogEntry & {
    adminFirstName: string
    adminLastName: string
    targetFirstName?: string
    targetLastName?: string
    targetWsName?: string
    targetWsUrl?: string
  }>
  nextCursor: string | null
}

export interface AdminAuditLogCollection {
  insert: (entry: Omit<AdminAuditLogEntry, 'id' | 'tsMs'>) => Promise<void>
  findByTarget: (target: AccountUuid, limit: number) => Promise<AdminAuditLogEntry[]>
  findByAdmin: (admin: AccountUuid, limit: number) => Promise<AdminAuditLogEntry[]>
  listAuditAdmin: (params: AdminAuditLogListParams) => Promise<AdminAuditLogListResult>
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
  ACCOUNT_DELETED = 'account_deleted',
  PASSWORD_CHANGED = 'password_changed'
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
  usageInfo?: UsageStatus

  targetRegion?: string
}

export interface Workspace {
  uuid: WorkspaceUuid
  name: string
  url: string
  allowReadOnlyGuest: boolean
  allowGuestSignUp: boolean
  passwordAgingRule?: number | null // Number of days after which password must be changed
  dataId?: WorkspaceDataId // Old workspace identifier. E.g. Database name in Mongo, bucket in R2, etc.
  branding?: string
  location?: Location
  region?: string
  createdBy?: PersonUuid
  billingAccount?: PersonUuid
  createdOn?: Timestamp
  // Initial-state configuration captured at workspace creation
  pendingConfiguration?: WorkspaceConfiguration | null
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

export interface WorkspacePermission {
  workspaceUuid: WorkspaceUuid
  accountUuid: AccountUuid
  permission: string
  createdOn?: Timestamp
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

/**
 * Known social link keys for user profiles
 * Stored flexibly in JSONB/object but with known common keys
 */
export interface KnownSocialLinks {
  twitter?: string
  linkedin?: string
  github?: string
  telegram?: string
  facebook?: string
  instagram?: string
}

/**
 * User profile with additional information for public sharing
 * Stored in accounts database (global, not workspace-specific)
 */
export interface UserProfile {
  personUuid: PersonUuid
  bio?: string // LinkedIn-style bio (up to ~2000 chars)
  country?: string
  city?: string
  website?: string // Personal website URL
  socialLinks?: Record<string, string> // Flexible storage, keys follow KnownSocialLinks convention
  isPublic: boolean // Public visibility toggle (default: false)
}

export type PersonWithProfile = Person & Omit<UserProfile, 'personUuid'>

/**
 * Workspace subscription status
 * Provider-agnostic abstraction for billing state
 */
export enum SubscriptionStatus {
  Active = 'active', // Subscription is active and in good standing
  Trialing = 'trialing', // In trial period
  PastDue = 'past_due', // Payment failed but still providing service
  Canceled = 'canceled', // Subscription has been canceled
  Paused = 'paused', // Subscription is paused
  Expired = 'expired' // Subscription or trial has expired
}

/**
 * Subscription type/purpose
 * Allows multiple active subscriptions per workspace for different purposes
 */
export enum SubscriptionType {
  Tier = 'tier', // Main workspace tier (free, starter, pro, enterprise)
  Support = 'support' // Voluntary support/donation subscription
}

/**
 * Workspace subscription information
 * Provider-agnostic subscription data managed by billing service
 * Multiple subscriptions can be active per workspace (tier + addons + support)
 * Historical subscriptions are preserved with status: canceled/expired
 */
export interface Subscription {
  id: string // Our internal unique subscription ID (UUID)
  workspaceUuid: WorkspaceUuid
  accountUuid: AccountUuid // Account that paid for the subscription

  // Provider details
  provider: string // Payment provider identifier (e.g. 'polar', 'stripe', 'manual')
  providerSubscriptionId: string // External subscription ID from the provider
  providerCheckoutId?: string // External checkout/session ID that created this subscription

  // Subscription classification
  type: SubscriptionType // What this subscription is for (tier, addon, support)
  status: SubscriptionStatus // Current status
  plan: string // Plan/product identifier (e.g. 'free', 'pro', 'storage-100gb', 'supporter')

  // Amount paid (in cents, e.g. 9999 = $99.99)
  // Used primarily for pay-what-you-want/donation subscriptions to track actual payment
  amount?: number

  // Billing period (optional - not set for free/manual plans)
  periodStart?: Timestamp
  periodEnd?: Timestamp

  // Trial information (optional)
  trialEnd?: Timestamp

  // Cancellation info (optional)
  canceledAt?: Timestamp
  willCancelAt?: Timestamp // Scheduled cancellation date (cancel at period end)

  // Provider-specific data (stored as JSONB for flexibility)
  // This allows billing service to store additional provider fields if needed
  // e.g. customerExternalId, metadata, etc. Some providers (like Polar.sh) allow using
  // our own customer ID and don't require tracking their external customer ID
  providerData?: Record<string, any>

  createdOn: Timestamp
  updatedOn: Timestamp
}

export type SubscriptionData = Omit<Subscription, 'createdOn' | 'updatedOn'>

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

export type DBFlavor = 'postgres' | 'cockroach' | 'unknown'

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
  userProfile: DbCollection<UserProfile>
  subscription: DbCollection<Subscription>
  workspacePermission: DbCollection<WorkspacePermission>
  adminAuditLog: AdminAuditLogCollection

  init: () => Promise<void>
  createWorkspace: (data: WorkspaceData, status: WorkspaceStatusData) => Promise<WorkspaceUuid>
  updateAllowReadOnlyGuests: (workspaceId: WorkspaceUuid, readOnlyGuestsAllowed: boolean) => Promise<void>
  updateAllowGuestSignUp: (workspaceId: WorkspaceUuid, guestSignUpAllowed: boolean) => Promise<void>
  updatePasswordAgingRule: (workspaceId: WorkspaceUuid, days: number | null) => Promise<void>
  assignWorkspace: (accountId: AccountUuid, workspaceId: WorkspaceUuid, role: AccountRole) => Promise<void>
  batchAssignWorkspace: (data: [AccountUuid, WorkspaceUuid, AccountRole][]) => Promise<void>
  updateWorkspaceRole: (accountId: AccountUuid, workspaceId: WorkspaceUuid, role: AccountRole) => Promise<void>
  unassignWorkspace: (accountId: AccountUuid, workspaceId: WorkspaceUuid) => Promise<void>
  getWorkspaceRole: (accountId: AccountUuid, workspaceId: WorkspaceUuid) => Promise<AccountRole | null>
  getWorkspaceRoles: (accountId: AccountUuid) => Promise<Map<WorkspaceUuid, AccountRole>>
  getWorkspaceMembers: (workspaceId: WorkspaceUuid) => Promise<WorkspaceMemberInfo[]>
  getAccountWorkspaces: (accountId: AccountUuid) => Promise<WorkspaceInfoWithStatus[]>
  batchAssignWorkspacePermission: (
    workspaceId: WorkspaceUuid,
    accountIds: AccountUuid[],
    permission: string
  ) => Promise<void>
  batchRevokeWorkspacePermission: (
    workspaceId: WorkspaceUuid,
    accountIds: AccountUuid[],
    permission: string
  ) => Promise<void>
  hasWorkspacePermission: (accountId: AccountUuid, workspaceId: WorkspaceUuid, permission: string) => Promise<boolean>
  getWorkspacePermissions: (accountId: AccountUuid, permission: string) => Promise<WorkspaceUuid[]>
  getWorkspaceUsersWithPermission: (workspaceId: WorkspaceUuid, permission: string) => Promise<AccountUuid[]>
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
  listAccountsAdmin: (params: ListAccountsAdminQueryParams) => Promise<{ rows: AccountListRow[], total: number }>
  /**
   * Delete admin_audit_log rows whose ts_ms is strictly less than `beforeMs`.
   * Returns the number of rows deleted. Used by the scheduled retention job
   * in account-service (env `AUDIT_RETENTION_DAYS`, default 365).
   *
   * Mongo backend throws — v7 runs on CockroachDB exclusively.
   */
  pruneAuditOlderThan: (beforeMs: number) => Promise<number>
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
  tfaRequired?: boolean
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
  branding?: string
  passwordAgingRule?: number | null
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

export interface InviteInfo {
  workspaceName: string | null
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

/**
 * Optional deps the account pod injects into a subset of method handlers.
 * Currently the only consumer is disableAccount, which uses the
 * accountLifecycleProducer to broadcast force-logout signals across pods.
 * When undefined, disableAccount still bumps tokenVersion (which gives
 * a slower but correct fallback path).
 */
export interface AccountMethodDeps {
  accountLifecycleProducer?: {
    send: (ctx: any, workspace: any, msgs: any[], partitionKey?: string) => Promise<void>
  }
}
