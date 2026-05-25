import {
  type AccountUuid,
  PersonId,
  WorkspaceDataId,
  WorkspaceUuid,
  type AccountRole,
  type Timestamp,
  type SocialId as SocialIdBase,
  PersonUuid,
  type WorkspaceMode,
  Person,
  WorkspaceInfo,
  AccountInfo,
  IntegrationKind
} from '@hcengineering/core'

export type { WorkspaceConfiguration } from '@hcengineering/core'

export interface LoginInfo {
  account: AccountUuid
  name?: string
  socialId?: PersonId
  token?: string
  tfaRequired?: boolean
  extra?: Record<string, string>
}

export interface EndpointInfo {
  internalUrl: string
  externalUrl: string
  region: string
}
export interface WorkspaceVersion {
  versionMajor: number
  versionMinor: number
  versionPatch: number
}

export interface LoginInfoWorkspace {
  url: string
  dataId?: WorkspaceDataId
  mode: WorkspaceMode
  version: WorkspaceVersion
  endpoint: EndpointInfo
  role: AccountRole | null
  progress?: number
  branding?: string
  passwordAgingRule?: number | null // in days
}

export interface LoginInfoWithWorkspaces extends LoginInfo {
  // Information necessary to handle user <--> transactor connectivity.
  workspaces: Record<WorkspaceUuid, LoginInfoWorkspace>
  socialIds: SocialId[]
}

export type LoginInfoByToken = LoginInfo | WorkspaceLoginInfo | LoginInfoRequest | null

/**
 * @public
 */
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: WorkspaceUuid // worspace uuid
  workspaceDataId?: WorkspaceDataId
  workspaceUrl: string
  endpoint: string
  token: string
  role: AccountRole
  allowGuestSignUp?: boolean
}

export interface LoginInfoRequestData {
  firstName?: string
  lastName?: string
}

export type LoginInfoRequest = {
  request: true
} & LoginInfoRequestData

export interface WorkspaceInviteInfo {
  workspace: WorkspaceUuid
  email?: string
  name?: string
}

/** Public invite details from getInviteInfo (no auth required). */
export interface InviteInfo {
  workspaceName: string | null
}

export interface OtpInfo {
  sent: boolean
  retryOn: Timestamp
}

export interface RegionInfo {
  region: string
  name: string
}

export type WorkspaceOperation = 'create' | 'upgrade' | 'all' | 'all+backup'

export interface MailboxOptions {
  availableDomains: string[]
  minNameLength: number
  maxNameLength: number
  maxMailboxCount: number
}

export interface MailboxInfo {
  mailbox: string
  aliases: string[]
  appPasswords: string[]
}

export interface MailboxSecret {
  mailbox: string
  app?: string
  secret: string
}

export interface Integration {
  socialId: PersonId
  kind: IntegrationKind // Integration kind. E.g. 'github', 'mail', 'telegram-bot', 'telegram' etc.
  workspaceUuid: WorkspaceUuid | null
  data?: Record<string, any>
  disabled?: boolean
}

export interface SocialId extends SocialIdBase {
  personUuid: PersonUuid
  isDeleted?: boolean
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

export interface ProviderInfo {
  name: string
  displayName?: string
}

export interface AccountAggregatedInfo extends AccountInfo, Person {
  uuid: AccountUuid
  integrations: Omit<Integration, 'data'>[]
  socialIds: SocialId[]
  workspaces: Omit<WorkspaceInfo, 'allowReadOnlyGuest' | 'allowGuestSignUp'>[]
}

/**
 * User profile with additional information for public sharing
 * Stored in accounts database (global, not workspace-specific)
 */
export interface UserProfile {
  personUuid: PersonUuid
  bio?: string // LinkedIn-style bio (up to ~2000 chars)
  city?: string
  country?: string
  website?: string // Personal website URL
  socialLinks?: Record<string, string> // Flexible storage for social links
  isPublic: boolean // Public visibility toggle (default: false)
}

export type PersonWithProfile = Person & Omit<UserProfile, 'personUuid'>

/**
 * Subscription status enum
 * Reflects the subscription lifecycle from active to canceled/expired
 */
export enum SubscriptionStatus {
  Active = 'active', // Subscription is active and paid
  Trialing = 'trialing', // In trial period (free usage)
  PastDue = 'past_due', // Payment failed but subscription not yet canceled
  Canceled = 'canceled', // Subscription was canceled by user or admin
  Paused = 'paused', // Subscription is temporarily paused (some providers support this)
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

  // Cancellation tracking (optional)
  canceledAt?: Timestamp

  // Provider-specific data stored as JSONB (optional)
  providerData?: Record<string, any>

  // Timestamps (managed by database)
  createdOn: Timestamp
  updatedOn: Timestamp
}

/**
 * Subscription data for creating/updating subscriptions (without timestamps)
 * Used by billing service to upsert subscription data
 */
export type SubscriptionData = Omit<Subscription, 'createdOn' | 'updatedOn'>

// =====================================================================
// Admin user management DTOs (V27)
// =====================================================================

export interface ListAccountsAdminParams {
  search?: string
  authMethod?: 'all' | 'email_only' | 'oidc' | 'mixed'
  status?: 'all' | 'active' | 'disabled'
  // v4 admin-panel enhancements — per-column filter inputs (AND with the globals above)
  emailContains?: string
  nameContains?: string
  statusIn?: Array<'active' | 'disabled'>
  authMethodIn?: Array<'email_only' | 'oidc' | 'mixed' | 'none'>
  workspaceUuidsIn?: WorkspaceUuid[]
  workspaceCountRange?: { min?: number, max?: number }
  lastActivityFilter?:
    | { kind: 'range', fromMs?: number, toMs?: number }
    | { kind: 'never' }
  // Active accounts with zero workspaces. Drives the "Orphan accounts"
  // quick-filter button in AdminUsers.
  orphan?: boolean
  // Filter to admin accounts only (primaryEmail matches the configured
  // admin-emails allowlist). Drives the Admins stat-pill quick-filter.
  isAdmin?: boolean
  sort?: {
    field: 'name' | 'email' | 'auth' | 'workspace_count' | 'last_activity' | 'status'
    direction: 'asc' | 'desc'
  }
  pagination: { limit: number, offset: number }   // EXISTING required-nested, do NOT flatten
}

export interface AccountListRow {
  uuid: AccountUuid
  firstName: string
  lastName: string
  primaryEmail: string | null
  authMethods: Array<'email' | 'oidc'>
  hasPassword: boolean
  workspaceCount: number
  status: 'active' | 'disabled'
  lastActivityAt: number | null
  isAdmin: boolean
}

export interface AccountDetailsResponse {
  uuid: AccountUuid
  firstName: string
  lastName: string
  status: 'active' | 'disabled'
  disabledAt: number | null
  lastActivityAt: number | null
  isAdmin: boolean
  socialIds: Array<{ type: string, value: string, verified: boolean }>
  workspaceMemberships: Array<{
    workspaceUuid: WorkspaceUuid
    workspaceName: string
    workspaceUrl: string
    role: AccountRole
  }>
  recentAuditEntries: Array<{
    tsMs: number
    adminFirstName: string
    adminLastName: string
    action: string
    details: any
  }>
}

export interface AddWorkspaceMemberParams {
  accountUuid: AccountUuid
  workspaceUuid: WorkspaceUuid
  role: AccountRole
}

export interface WorkspaceMembersAdminResponse {
  workspaceUuid: WorkspaceUuid
  workspaceName: string
  workspaceUrl: string
  workspaceMode: string
  members: Array<{
    accountUuid: AccountUuid
    firstName: string
    lastName: string
    primaryEmail: string | null
    role: AccountRole
    lastActivityAt: number | null
    status: 'active' | 'disabled'
    isAdmin: boolean
  }>
}

export interface BulkResult {
  succeeded: AccountUuid[]
  failed: Array<{ accountUuid: AccountUuid, error: string }>
}

// Audit log DTOs (Task 3-5)

export interface AuditEntry {
  id: string
  tsMs: number
  admin: { uuid: AccountUuid, firstName: string, lastName: string }
  action: string
  targetAccount?: { uuid: AccountUuid, firstName: string, lastName: string }
  targetWorkspace?: { uuid: WorkspaceUuid, name: string, url: string }
  details: any | null
  // V29 — Bulk-action service calls stamp every row with one shared UUID so
  // the admin UI can group "this is one operation". Undefined on single-action
  // sites. Plan 1d Task 3.
  batchId?: string
}

export interface ListAuditAdminParams {
  filter?: {
    // Legacy UUID filters — kept for API compatibility. Prefer the
    // name/email substring filters below for human-facing UIs.
    adminUuid?: AccountUuid
    action?: string
    targetAccountUuid?: AccountUuid
    targetWorkspaceUuid?: WorkspaceUuid
    from?: number  // ms
    to?: number
    // V30 — Audit-log filter UX redesign. Substring-match against the
    // identifiers the admin actually sees in the table (name / email /
    // workspace name) instead of UUIDs.
    adminNameOrEmail?: string
    targetNameOrUrl?: string
    // Multi-select action filter. When present takes precedence over the
    // legacy `action` exact-match. Empty array is treated as "no filter".
    actionIn?: string[]
  }
  sort?: {
    field: 'time' | 'admin' | 'action' | 'target'
    direction: 'asc' | 'desc'
  }
  pagination?: { cursor?: string, limit?: number }
}

export interface ListAuditAdminResponse {
  entries: AuditEntry[]
  nextCursor: string | null
}

export interface CreateAccountParams {
  firstName: string
  lastName: string
  email: string
  passwordMode: 'invite' | 'set'
  password?: string
  initialWorkspace?: { workspaceUuid: WorkspaceUuid, role: AccountRole }
}

export interface CreateAccountResponse {
  account: AccountDetailsResponse
  inviteEmailSent: boolean | null
  initialWorkspaceAssigned: boolean | null
}
