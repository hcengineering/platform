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
  type Data,
  isActiveMode,
  type MeasureContext,
  SocialIdType,
  type Version,
  type WorkspaceMode,
  type PersonInfo,
  type BackupStatus,
  type Branding,
  type PersonId,
  type PersonUuid,
  type WorkspaceUuid,
  type AccountUuid,
  type UsageStatus,
  readOnlyGuestAccountUuid
} from '@hcengineering/core'
import platform, { getMetadata, PlatformError, Severity, Status, unknownError } from '@hcengineering/platform'
import { decodeTokenVerbose } from '@hcengineering/server-token'
import { randomUUID } from 'crypto'
import type {
  ListAccountsAdminParams,
  AccountListRow,
  AccountDetailsResponse,
  AddWorkspaceMemberParams,
  WorkspaceMembersAdminResponse,
  CreateAccountParams,
  CreateAccountResponse,
  BulkResult,
  ListAuditAdminParams,
  ListAuditAdminResponse,
  AuditEntry
} from '@hcengineering/account-client'

import {
  auditAdminActionDenied,
  disableAccount,
  disableAccountInternal,
  enableAccount,
  enableAccountInternal,
  removeWorkspaceMember,
  removeWorkspaceMemberInternal,
  sendPasswordResetEmail,
  triggerPasswordReset,
  triggerPasswordResetInternal,
  wrapWithDeps
} from './operations'

import { accountPlugin } from './plugin'
import type {
  AccountAggregatedInfo,
  AdminAuditAction,
  AccountDB,
  AccountMethodDeps,
  AccountMethodHandler,
  Integration,
  IntegrationKey,
  IntegrationSecret,
  IntegrationSecretKey,
  ListAccountsAdminQueryParams,
  Query,
  SocialId,
  Subscription,
  SubscriptionData,
  Workspace,
  WorkspaceEvent,
  WorkspaceInfoWithStatus,
  WorkspaceOperation,
  WorkspaceStatus
} from './types'
import {
  integrationServices,
  findExistingIntegration,
  cleanEmail,
  getAccount,
  getEmailSocialId,
  getRegions,
  getRolePower,
  getSocialIdByKey,
  getWorkspaceById,
  getWorkspaceInfoWithStatusById,
  getWorkspacesInfoWithStatusByIds,
  verifyAllowedServices,
  wrap,
  addSocialIdBase,
  getWorkspaces,
  updateWorkspaceRole,
  getPersonName,
  doMergeAccounts,
  assignableRoles,
  verifyTokenVersion,
  signUpByEmail
} from './utils'

// Note: it is IMPORTANT to always destructure params passed here to avoid sending extra params
// to the database layer when searching/inserting as they may contain SQL injection
// !!! NEVER PASS "params" DIRECTLY in any DB functions !!!

// Move to config?
const processingTimeoutMs = 30 * 1000

const ACTIVE_WORKSPACE_MODES = new Set(['active', 'creating', 'upgrading', 'restoring'])

// Postgres int8 columns come back as string from node-postgres; coerce so the
// JSON response stays a real epoch-ms number (new Date(string) -> Invalid Date).
function toEpochMs (v: number | string | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Verify that the provided token belongs to an admin user.
 * Throws PlatformError with Forbidden status if the token is invalid or does not have admin privileges.
 */
export async function assertAdmin (ctx: MeasureContext, db: AccountDB, token: string): Promise<void> {
  await verifyTokenVersion(ctx, db, token)
  const { extra } = decodeTokenVerbose(ctx, token)
  if (extra?.admin !== 'true') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
}

export async function listWorkspaces (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    region?: string | null
    mode?: WorkspaceMode | null
  }
): Promise<WorkspaceInfoWithStatus[]> {
  const { region, mode } = params
  const { extra } = decodeTokenVerbose(ctx, token)

  if (!['tool', 'backup', 'admin', 'github'].includes(extra?.service) && extra?.admin !== 'true') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  return await getWorkspaces(db, false, region, mode)
}

export async function listAccounts (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { search?: string, skip?: number, limit?: number }
): Promise<AccountAggregatedInfo[]> {
  const { extra } = decodeTokenVerbose(ctx, token)
  const isAdmin = extra?.admin === 'true'

  if (!isAdmin) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const { skip, limit, search } = params

  return await db.listAccounts(search, skip, limit)
}

export async function listAccountsAdmin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: ListAccountsAdminParams
): Promise<{ total: number, accounts: AccountListRow[] }> {
  await assertAdmin(ctx, db, token)

  // Map the public ListAccountsAdminParams (account-client) to the internal
  // ListAccountsAdminQueryParams used by the DB layer.
  const query: ListAccountsAdminQueryParams = {
    search: params.search,
    statusIn: params.statusIn,
    authMethodIn: params.authMethodIn,
    nameContains: params.nameContains,
    emailContains: params.emailContains,
    workspaceUuidsIn: params.workspaceUuidsIn,
    wsMin: params.workspaceCountRange?.min,
    wsMax: params.workspaceCountRange?.max,
    lastActivityFilter: params.lastActivityFilter,
    orphan: (params as any).orphan === true ? true : undefined,
    isAdmin: (params as any).isAdmin === true ? true : undefined,
    sort: params.sort,
    pagination: { limit: params.pagination.limit, offset: params.pagination.offset }
  }

  const { rows, total } = await db.listAccountsAdmin(query)
  return { accounts: rows, total }
}

export async function getAccountDetails (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { accountUuid: AccountUuid }
): Promise<AccountDetailsResponse> {
  await assertAdmin(ctx, db, token)

  const account = await db.account.findOne({ uuid: params.accountUuid })
  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  const person = await db.person.findOne({ uuid: params.accountUuid as unknown as PersonUuid })
  const socialIds = await db.socialId.find({ personUuid: params.accountUuid })
  const workspaces = await db.getAccountWorkspaces(params.accountUuid)
  const roleMap = await db.getWorkspaceRoles(params.accountUuid)

  const workspaceMemberships = workspaces.map((w) => ({
    workspaceUuid: w.uuid,
    workspaceName: w.name,
    workspaceUrl: w.url,
    role: roleMap.get(w.uuid) ?? AccountRole.User
  }))

  const auditRaw = await db.adminAuditLog.findByTarget(params.accountUuid, 20)
  const adminUuids = Array.from(new Set(auditRaw.map((e) => e.adminAccount).filter((u): u is AccountUuid => u != null)))
  const adminPersons =
    adminUuids.length > 0
      ? await db.person.find({ uuid: { $in: adminUuids as unknown as PersonUuid[] } })
      : []
  const adminNameByUuid = new Map<string, { firstName: string, lastName: string }>(
    adminPersons.map((p) => [p.uuid as unknown as string, { firstName: p.firstName, lastName: p.lastName }])
  )
  const recentAuditEntries = auditRaw.map((e) => {
    const n = adminNameByUuid.get(e.adminAccount as unknown as string)
    return {
      tsMs: e.tsMs,
      adminFirstName: n?.firstName ?? '',
      adminLastName: n?.lastName ?? '',
      action: e.action,
      details: e.details
    }
  })

  const primaryEmail = socialIds.find((s) => s.type === SocialIdType.EMAIL)?.value ?? ''
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
  )

  return {
    uuid: account.uuid,
    firstName: person?.firstName ?? '',
    lastName: person?.lastName ?? '',
    status: account.disabledAt != null ? 'disabled' : 'active',
    disabledAt: toEpochMs(account.disabledAt),
    lastActivityAt: toEpochMs(account.lastActivityAt),
    isAdmin: primaryEmail !== '' && adminEmails.has(primaryEmail),
    socialIds: socialIds.map((s) => ({
      type: s.type,
      value: s.value,
      verified: (s as any).verifiedOn != null
    })),
    workspaceMemberships,
    recentAuditEntries
  }
}

export async function listAuditAdmin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: ListAuditAdminParams
): Promise<ListAuditAdminResponse> {
  await assertAdmin(ctx, db, token)
  const rawResult = await db.adminAuditLog.listAuditAdmin({
    filter: params.filter as any,
    sort: params.sort as any,
    cursor: params.pagination?.cursor,
    limit: params.pagination?.limit
  })
  const entries: AuditEntry[] = rawResult.entries.map((e) => ({
    id: e.id,
    tsMs: e.tsMs,
    admin: {
      uuid: e.adminAccount,
      firstName: e.adminFirstName,
      lastName: e.adminLastName
    },
    action: e.action,
    targetAccount: e.targetAccount != null
      ? { uuid: e.targetAccount, firstName: e.targetFirstName ?? '', lastName: e.targetLastName ?? '' }
      : undefined,
    targetWorkspace: e.workspaceUuid != null
      ? { uuid: e.workspaceUuid, name: e.targetWsName ?? '', url: e.targetWsUrl ?? '' }
      : undefined,
    details: e.details,
    batchId: e.batchId ?? undefined
  }))
  return { entries, nextCursor: rawResult.nextCursor }
}

// AddWorkspaceMemberParams is imported from '@hcengineering/account-client'
// (Task 1b). Do NOT redeclare it locally.

export async function addWorkspaceMember (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: AddWorkspaceMemberParams
): Promise<AccountDetailsResponse> {
  await assertAdmin(ctx, db, token)
  const adminUuid = decodeTokenVerbose(ctx, token).account as AccountUuid

  const account = await db.account.findOne({ uuid: params.accountUuid })
  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: params.accountUuid as string }))
  }
  if (account.disabledAt != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { msg: 'Cannot add disabled account' }))
  }

  const workspace = await getWorkspaceInfoWithStatusById(db, params.workspaceUuid)
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: params.workspaceUuid as string }))
  }
  if (!ACTIVE_WORKSPACE_MODES.has(workspace.status.mode)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { msg: 'Workspace not available' }))
  }

  const existingRole = await db.getWorkspaceRole(params.accountUuid, params.workspaceUuid)
  if (existingRole != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Conflict, { msg: 'Already a member' }))
  }

  await db.assignWorkspace(params.accountUuid, params.workspaceUuid, params.role)
  await db.adminAuditLog.insert({
    adminAccount: adminUuid,
    targetAccount: params.accountUuid,
    action: 'add_workspace_member',
    workspaceUuid: params.workspaceUuid,
    details: { role: params.role }
  })

  return await getAccountDetails(ctx, db, branding, token, { accountUuid: params.accountUuid })
}

/**
 * Add a workspace member WITHOUT re-checking admin auth or resolving the workspace.
 * Caller must pass a pre-resolved adminUuid and workspace.
 */
export async function addWorkspaceMemberInternal (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  adminUuid: AccountUuid,
  params: { workspace: WorkspaceInfoWithStatus, accountUuid: AccountUuid, role: AccountRole },
  batchId?: string
): Promise<void> {
  const account = await db.account.findOne({ uuid: params.accountUuid })
  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: params.accountUuid as string }))
  }
  if (account.disabledAt != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { msg: 'Cannot add disabled account' }))
  }

  if (!ACTIVE_WORKSPACE_MODES.has(params.workspace.status.mode)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { msg: 'Workspace not available' }))
  }

  const existingRole = await db.getWorkspaceRole(params.accountUuid, params.workspace.uuid)
  if (existingRole != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Conflict, { msg: 'Already a member' }))
  }

  await db.assignWorkspace(params.accountUuid, params.workspace.uuid, params.role)
  await db.adminAuditLog.insert({
    adminAccount: adminUuid,
    targetAccount: params.accountUuid,
    action: 'add_workspace_member',
    workspaceUuid: params.workspace.uuid,
    details: { role: params.role },
    batchId
  })
}

// WorkspaceMembersAdminResponse is imported from '@hcengineering/account-client'
// (Task 1b). Do NOT redeclare it locally.

export async function getWorkspaceMembersAdmin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { workspaceUuid: WorkspaceUuid }
): Promise<WorkspaceMembersAdminResponse> {
  await assertAdmin(ctx, db, token)

  const workspace = await getWorkspaceInfoWithStatusById(db, params.workspaceUuid)
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: params.workspaceUuid as string }))
  }

  const members = await db.getWorkspaceMembers(params.workspaceUuid)
  const accountUuids = members.map((m: any) => m.person)
  const allAccounts = await db.account.find({})
  const accountByUuid = new Map(allAccounts.filter((a: any) => accountUuids.includes(a.uuid)).map((a: any) => [a.uuid, a]))
  const allPersons = await db.person.find({})
  const personByUuid = new Map(allPersons.map((p: any) => [p.uuid, p]))
  const allSocials = await db.socialId.find({})
  const socialsByPerson = new Map<string, any[]>()
  for (const s of allSocials) {
    const k = s.personUuid as string
    if (!socialsByPerson.has(k)) socialsByPerson.set(k, [])
    socialsByPerson.get(k)!.push(s)
  }
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)
  )

  const enriched = members.map((m: any) => {
    const uuid = (m.person) as AccountUuid
    const acc = accountByUuid.get(uuid) ?? { disabledAt: null, lastActivityAt: null }
    const person = personByUuid.get(uuid)
    const primaryEmail = (socialsByPerson.get(uuid as string) ?? []).find((s) => s.type === 'email')?.value ?? null
    return {
      accountUuid: uuid,
      firstName: person?.firstName ?? '',
      lastName: person?.lastName ?? '',
      primaryEmail,
      role: m.role as AccountRole,
      lastActivityAt: toEpochMs(acc.lastActivityAt),
      status: acc.disabledAt != null ? ('disabled' as const) : ('active' as const),
      isAdmin: primaryEmail != null && adminEmails.has(primaryEmail)
    }
  })

  return {
    workspaceUuid: workspace.uuid,
    workspaceName: workspace.name ?? '',
    workspaceUrl: workspace.url ?? '',
    workspaceMode: workspace.status.mode,
    members: enriched
  }
}

// CreateAccountParams and CreateAccountResponse are imported from
// '@hcengineering/account-client' (Task 1b). Do NOT redeclare them locally.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createAccountAdmin (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: CreateAccountParams
): Promise<CreateAccountResponse> {
  await assertAdmin(ctx, db, token)
  const adminUuid = decodeTokenVerbose(ctx, token).account as AccountUuid

  if (!EMAIL_RE.test(params.email)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { msg: 'Invalid email' }))
  }
  const normalizedEmail = params.email.toLowerCase()

  if (params.passwordMode === 'set') {
    if (params.password == null || params.password.length < 8) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { msg: 'Password must be at least 8 characters' }))
    }
  }

  // signUpByEmail (utils.ts:722) already does email-collision detection
  // (throws AccountAlreadyExists), person creation, social-id creation,
  // account-row insert via the internal `createAccount` helper, and
  // optional password setting. We mark the email confirmed because the
  // admin is vouching for it.
  let newUuid: AccountUuid
  try {
    const r = await signUpByEmail(
      ctx, db, branding,
      normalizedEmail,
      params.passwordMode === 'set' ? (params.password ?? null) : null,
      params.firstName,
      params.lastName,
      true /* confirmed — admin vouches for the email */,
      false /* automatic */
    )
    newUuid = r.account
  } catch (err: any) {
    if (err instanceof PlatformError && err.status.code === platform.status.AccountAlreadyExists) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Conflict, { msg: 'Account with this email already exists' }))
    }
    throw err
  }

  let initialWorkspaceAssigned: boolean | null = null
  if (params.initialWorkspace != null) {
    try {
      const ws = await getWorkspaceInfoWithStatusById(db, params.initialWorkspace.workspaceUuid)
      if (ws == null) throw new Error('Workspace gone')
      if (!ACTIVE_WORKSPACE_MODES.has(ws.status.mode)) throw new Error('Workspace not available')
      await db.assignWorkspace(newUuid, params.initialWorkspace.workspaceUuid, params.initialWorkspace.role)
      initialWorkspaceAssigned = true
    } catch (err: any) {
      ctx.error('initial workspace assignment failed', { err, accountUuid: newUuid })
      initialWorkspaceAssigned = false
    }
  }

  let inviteEmailSent: boolean | null = null
  if (params.passwordMode === 'invite') {
    try {
      inviteEmailSent = await sendPasswordResetEmail(ctx, db, branding, newUuid, normalizedEmail)
    } catch (err: any) {
      // Helper throws on missing MAIL_URL / token issues. The account
      // itself is already committed; createAccountAdmin's contract is
      // that the account stays and the admin retries the email later.
      ctx.error('createAccountAdmin: invite email helper threw', { err, accountUuid: newUuid })
      inviteEmailSent = false
    }
  }

  await db.adminAuditLog.insert({
    adminAccount: adminUuid,
    targetAccount: newUuid,
    action: 'create_account',
    workspaceUuid: params.initialWorkspace?.workspaceUuid ?? null,
    details: {
      email: normalizedEmail,
      passwordMode: params.passwordMode,
      initialWorkspaceAssigned
    }
  })

  const account = await getAccountDetails(ctx, db, branding, token, { accountUuid: newUuid })
  return { account, inviteEmailSent, initialWorkspaceAssigned }
}

// BulkResult is imported from '@hcengineering/account-client' (Task 1b).
// Do NOT redeclare it locally.

const BULK_MAX = 200

function assertBulkSize (uuids: AccountUuid[]): void {
  if (uuids.length > BULK_MAX) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { msg: `Too many accounts in one batch (max ${BULK_MAX})` }))
  }
}

async function bulkLoop (
  uuids: AccountUuid[],
  op: (uuid: AccountUuid) => Promise<void>,
  selfFilter?: { adminUuid: AccountUuid, reason: string }
): Promise<BulkResult> {
  const result: BulkResult = { succeeded: [], failed: [] }
  for (const uuid of uuids) {
    if (selfFilter != null && uuid === selfFilter.adminUuid) {
      result.failed.push({ accountUuid: uuid, error: selfFilter.reason })
      continue
    }
    try {
      await op(uuid)
      result.succeeded.push(uuid)
    } catch (err: any) {
      const msg = err instanceof PlatformError ? (err.status.params as any)?.msg ?? err.status.code : String(err?.message ?? err)
      result.failed.push({ accountUuid: uuid, error: msg })
    }
  }
  return result
}

export async function bulkAddToWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { accountUuids: AccountUuid[], workspaceUuid: WorkspaceUuid, role: AccountRole }
): Promise<BulkResult> {
  await assertAdmin(ctx, db, token)
  assertBulkSize(params.accountUuids)
  const adminUuid = decodeTokenVerbose(ctx, token).account as AccountUuid
  // Resolve workspace ONCE — not per-row.
  const workspace = await getWorkspaceInfoWithStatusById(db, params.workspaceUuid)
  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, {}))
  }
  // V29 — One batch UUID per bulk call, stamped on every audit row so the
  // admin UI can group "these N rows are from one operation" (Plan 1d Task 3).
  const batchId = randomUUID()
  return await bulkLoop(params.accountUuids, async (uuid) => {
    await addWorkspaceMemberInternal(ctx, db, branding, adminUuid, { workspace, accountUuid: uuid, role: params.role }, batchId)
  })
}

export async function bulkRemoveFromWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { accountUuids: AccountUuid[], workspaceUuid: WorkspaceUuid }
): Promise<BulkResult> {
  await assertAdmin(ctx, db, token)
  assertBulkSize(params.accountUuids)
  const adminUuid = decodeTokenVerbose(ctx, token).account as AccountUuid
  const batchId = randomUUID()
  return await bulkLoop(
    params.accountUuids,
    async (uuid) => {
      await removeWorkspaceMemberInternal(ctx, db, adminUuid, { accountUuid: uuid, workspaceUuid: params.workspaceUuid }, batchId)
    },
    { adminUuid, reason: 'cannot bulk-remove self from workspace; use single-row remove with explicit confirmation' }
  )
}

export async function bulkSetDisabled (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  deps: AccountMethodDeps,
  token: string,
  params: { accountUuids: AccountUuid[], disabled: boolean }
): Promise<BulkResult> {
  await assertAdmin(ctx, db, token)
  assertBulkSize(params.accountUuids)
  const adminUuid = decodeTokenVerbose(ctx, token).account as AccountUuid
  const batchId = randomUUID()

  // V13 — bulkLoop's selfFilter catches self-targets BEFORE op() runs,
  // so the audit-write inside disableAccountInternal never fires for the
  // bulk-self case. We audit it here, once per call, before bulkLoop
  // strips the self-target. The rate-limit (60 min per
  // (admin, reason, method)) handles repeat-call dedup.
  if (params.disabled && params.accountUuids.includes(adminUuid)) {
    await auditAdminActionDenied(ctx, db, adminUuid, 'self_disable', 'bulkSetDisabled', adminUuid)
  }

  return await bulkLoop(
    params.accountUuids,
    async (uuid) => {
      if (params.disabled) {
        // Use disableAccountInternal to skip per-row admin re-check.
        // deps.accountLifecycleProducer is threaded through so bulk-disabled
        // accounts receive an immediate force-logout event (§2.3).
        // Pass methodName='bulkSetDisabled' so any last_admin denial that
        // fires INSIDE disableAccountInternal is audited under the correct
        // method tag (the rate-limit key includes method).
        await disableAccountInternal(ctx, db, deps, adminUuid, { accountUuid: uuid }, batchId, 'bulkSetDisabled')
      } else {
        // Mirror the disable branch: enableAccountInternal skips the
        // per-row requireAdmin + verifyTokenVersion + account findOne
        // that the public enableAccount would re-run for each uuid.
        await enableAccountInternal(ctx, db, adminUuid, { accountUuid: uuid }, batchId)
      }
    },
    params.disabled ? { adminUuid, reason: 'cannot disable self' } : undefined
  )
}

export async function bulkSendPasswordReset (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { accountUuids: AccountUuid[] }
): Promise<BulkResult> {
  await assertAdmin(ctx, db, token)
  assertBulkSize(params.accountUuids)
  const adminUuid = decodeTokenVerbose(ctx, token).account as AccountUuid
  const batchId = randomUUID()
  return await bulkLoop(params.accountUuids, async (uuid) => {
    await triggerPasswordResetInternal(ctx, db, branding, adminUuid, { accountUuid: uuid }, batchId)
  })
}

function actionForWorkspaceEvent (event: string): AdminAuditAction {
  switch (event) {
    case 'archive': return 'archive_workspace'
    case 'unarchive': return 'unarchive_workspace'
    case 'migrate-to': return 'migrate_workspace'
    case 'delete': return 'delete_workspace'
    case 'reset-attempts': return 'reset_workspace_attempts'
    default: return event as AdminAuditAction  // defensive fallthrough
  }
}

export async function performWorkspaceOperation (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  parameters: {
    workspaceId: WorkspaceUuid | WorkspaceUuid[]
    event: 'archive' | 'migrate-to' | 'unarchive' | 'delete' | 'reset-attempts'
    params: any[]
  }
): Promise<boolean> {
  const { workspaceId, event, params } = parameters
  const { extra, workspace, account: callerAccount } = decodeTokenVerbose(ctx, token)

  if (extra?.admin !== 'true') {
    if (event !== 'unarchive' || workspaceId !== workspace) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  const adminUuid = callerAccount as AccountUuid

  const workspaceUuids = Array.isArray(workspaceId) ? workspaceId : [workspaceId]

  const workspaces = await getWorkspacesInfoWithStatusByIds(db, workspaceUuids)
  if (workspaces.length === 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, {}))
  }

  // V29 — When invoked with an array of workspaceIds, stamp every audit row
  // with one shared UUID so the admin UI can group "this is one bulk archive".
  // Single-workspace invocations also get a batchId-less NULL, since a single
  // row needs no grouping (Plan 1d Task 3).
  const batchId = Array.isArray(workspaceId) && workspaceId.length > 1 ? randomUUID() : undefined

  let ops = 0
  for (const workspace of workspaces) {
    const update: Partial<WorkspaceStatus> = {}
    switch (event) {
      case 'reset-attempts':
        update.processingAttempts = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'delete':
        if (workspace.status.mode !== 'active') {
          throw new PlatformError(unknownError('Delete allowed only for active workspaces'))
        }

        update.mode = 'pending-deletion'
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'archive':
        if (!isActiveMode(workspace.status.mode)) {
          throw new PlatformError(unknownError('Archiving allowed only for active workspaces'))
        }

        update.mode = 'archiving-pending-backup'
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'unarchive':
        if (event === 'unarchive') {
          if (workspace.status.mode !== 'archived') {
            throw new PlatformError(unknownError('Unarchive allowed only for archived workspaces'))
          }
        }

        update.mode = 'pending-restore'
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      case 'migrate-to': {
        if (!isActiveMode(workspace.status.mode)) {
          return false
        }
        if (params.length !== 1 && params[0] == null) {
          throw new PlatformError(unknownError('Invalid region passed to migrate operation'))
        }
        const regions = getRegions()
        if (regions.find((it) => it.region === params[0]) === undefined) {
          throw new PlatformError(unknownError('Invalid region passed to migrate operation'))
        }
        if ((workspace.region ?? '') === params[0]) {
          throw new PlatformError(unknownError('Invalid region passed to migrate operation'))
        }

        update.mode = 'migration-pending-backup'
        // NOTE: will only work for Mongo accounts
        update.targetRegion = params[0]
        update.processingAttempts = 0
        update.processingProgress = 0
        update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
        break
      }
      default:
        break
    }

    if (Object.keys(update).length !== 0) {
      await db.workspaceStatus.update({ workspaceUuid: workspace.uuid }, update)
      // Write audit entry for this workspace operation. targetAccount is null
      // because this is a workspace-level action (V28 relaxed the NOT NULL).
      try {
        await db.adminAuditLog.insert({
          adminAccount: adminUuid,
          targetAccount: null,
          workspaceUuid: workspace.uuid,
          action: actionForWorkspaceEvent(event),
          details: { previousMode: workspace.status.mode, params: params ?? [] },
          batchId
        })
      } catch (auditErr) {
        // Audit failure must NOT roll back the workspace operation itself.
        ctx.warn('performWorkspaceOperation: failed to write audit log entry', { auditErr, workspaceUuid: workspace.uuid, event })
      }
      ops++
    }
  }
  return ops > 0
}

export async function updateWorkspaceRoleBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    socialKey: string
    targetRole: AccountRole
  }
): Promise<void> {
  const { socialKey, targetRole } = params

  if (socialKey == null || socialKey === '' || targetRole == null || !assignableRoles.includes(targetRole)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['workspace', 'tool'], extra)

  const socialId = await getSocialIdByKey(db, socialKey.toLowerCase() as PersonId)
  if (socialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  await updateWorkspaceRole(ctx, db, branding, token, { targetAccount: socialId.personUuid as AccountUuid, targetRole })
}

/**
 * Retrieves one workspace for which there are things to process.
 *
 * Workspace is provided for 30seconds. This timeout is reset
 * on every progress update.
 * If no progress is reported for the workspace during this time,
 * it will become available again to be processed by another executor.
 */
export async function getPendingWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    region: string
    version: Data<Version>
    operation: WorkspaceOperation
  }
): Promise<WorkspaceInfoWithStatus | undefined> {
  const { region, version, operation } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'workspace') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const wsLivenessDays = getMetadata(accountPlugin.metadata.WsLivenessDays)
  const wsLivenessMs = wsLivenessDays !== undefined ? wsLivenessDays * 24 * 60 * 60 * 1000 : undefined

  const result = await db.getPendingWorkspace(region, version, operation, processingTimeoutMs, wsLivenessMs)

  if (result != null) {
    ctx.info('getPendingWorkspace', {
      workspaceId: result.uuid,
      workspaceName: result.name,
      dataId: result.dataId,
      mode: result.status.mode,
      operation,
      region,
      major: result.status.versionMajor,
      minor: result.status.versionMinor,
      patch: result.status.versionPatch,
      requestedVersion: version
    })
  }

  return result
}

export async function updateWorkspaceInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    workspaceUuid: WorkspaceUuid
    event: WorkspaceEvent
    version: Data<Version> // A worker version
    progress: number
    message?: string
  }
): Promise<void> {
  const { workspaceUuid, event, version, message } = params

  const { extra } = decodeTokenVerbose(ctx, token)
  if (!['workspace', 'tool'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (workspaceUuid == null || workspaceUuid === '' || event == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  let progress = params.progress

  const wsExists = await db.workspace.exists({ uuid: workspaceUuid })
  if (!wsExists) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }
  progress = Math.round(progress)

  const ts = Date.now()
  const update: Partial<WorkspaceStatus> = {}
  const wsUpdate: Partial<Workspace> = {}
  const query: Query<WorkspaceStatus> = { workspaceUuid }

  // Only read status for certain events because it is not needed for others
  // and it interferes with status updates when concurrency is high
  let wsStatus: WorkspaceStatus | null = null
  if (['create-started', 'upgrade-started', 'migrate-clean-done'].includes(event)) {
    wsStatus = await db.workspaceStatus.findOne({ workspaceUuid })
  }
  switch (event) {
    case 'create-started':
      update.mode = 'creating'
      if (wsStatus != null && wsStatus.mode !== 'creating') {
        update.processingAttempts = 0
      }
      update.processingProgress = progress
      break
    case 'upgrade-started':
      if (wsStatus != null && wsStatus.mode !== 'upgrading') {
        update.processingAttempts = 0
      }
      update.mode = 'upgrading'
      update.processingProgress = progress
      break
    case 'create-done':
      ctx.info('Updating workspace info on create-done', { workspaceUuid, event, version, progress })
      update.mode = 'active'
      update.isDisabled = false
      update.versionMajor = version.major
      update.versionMinor = version.minor
      update.versionPatch = version.patch
      update.processingProgress = progress
      wsUpdate.pendingConfiguration = null
      break
    case 'upgrade-done':
      ctx.info('Updating workspace info on upgrade-done', { workspaceUuid, event, version, progress })
      update.mode = 'active'
      update.versionMajor = version.major
      update.versionMinor = version.minor
      update.versionPatch = version.patch
      update.processingProgress = progress
      break
    case 'progress':
      update.processingProgress = progress
      query.processingProgress = { $lte: progress }
      break
    case 'migrate-backup-started':
      update.mode = 'migration-backup'
      update.processingProgress = progress
      break
    case 'migrate-backup-done':
      update.mode = 'migration-pending-clean'
      update.processingProgress = progress
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
      break
    case 'migrate-clean-started':
      update.mode = 'migration-clean'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'migrate-clean-done':
      wsUpdate.region = wsStatus?.targetRegion ?? ''
      update.mode = 'pending-restore'
      update.processingProgress = progress
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
      break
    case 'restore-started':
      update.mode = 'restoring'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'restore-done':
      update.mode = 'active'
      update.processingProgress = 100
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
      break
    case 'archiving-backup-started':
      update.mode = 'archiving-backup'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'archiving-backup-done':
      update.mode = 'archiving-pending-clean'
      update.processingProgress = progress
      update.lastProcessingTime = Date.now() - processingTimeoutMs // To not wait for next step
      break
    case 'archiving-clean-started':
      update.mode = 'archiving-clean'
      update.processingAttempts = 0
      update.processingProgress = progress
      break
    case 'archiving-clean-done':
      update.mode = 'archived'
      update.processingProgress = 100
      break
    case 'ping':
    default:
      query.lastProcessingTime = { $lte: ts }
      break
  }

  if (message != null) {
    update.processingMessage = message
  }

  await db.workspaceStatus.update(query, {
    lastProcessingTime: ts, // Some operations override it.
    ...update
  })

  if (Object.keys(wsUpdate).length !== 0) {
    await db.workspace.update({ uuid: workspaceUuid }, wsUpdate)
  }
}

export async function workerHandshake (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    region: string
    version: Data<Version>
    operation: WorkspaceOperation
  }
): Promise<void> {
  const { region, version, operation } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'workspace') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  ctx.info('Worker handshake happened', { region, version, operation })
  // Nothing else to do now but keeping to have track of workers in logs
}

export async function updateBackupInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { backupInfo: BackupStatus }
): Promise<void> {
  const { backupInfo } = params
  const { extra, workspace } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'backup') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceInfo = await getWorkspaceById(db, workspace)
  if (workspaceInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  await db.workspaceStatus.update(
    { workspaceUuid: workspace },
    {
      backupInfo,
      lastProcessingTime: Date.now()
    }
  )
}

export async function updateUsageInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { usageInfo: UsageStatus }
): Promise<void> {
  const { usageInfo } = params
  const { extra, workspace } = decodeTokenVerbose(ctx, token)
  if (extra?.service !== 'billing') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const workspaceInfo = await getWorkspaceById(db, workspace)
  if (workspaceInfo === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: workspace }))
  }

  await db.workspaceStatus.update(
    { workspaceUuid: workspace },
    {
      usageInfo,
      lastProcessingTime: Date.now()
    }
  )
}

export async function assignWorkspace (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    email: string
    workspaceUuid: WorkspaceUuid
    role: AccountRole
  }
): Promise<void> {
  const { email, workspaceUuid, role } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  if (!['aibot', 'tool', 'workspace'].includes(extra?.service)) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  if (
    email == null ||
    email === '' ||
    workspaceUuid == null ||
    workspaceUuid === '' ||
    role == null ||
    !assignableRoles.includes(role)
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const normalizedEmail = cleanEmail(email)
  const emailSocialId = await getEmailSocialId(db, normalizedEmail)

  if (emailSocialId == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  const account = await getAccount(db, emailSocialId.personUuid as AccountUuid)

  if (account == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  }

  const workspace = await getWorkspaceById(db, workspaceUuid)

  if (workspace == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  const currentRole = await db.getWorkspaceRole(account.uuid, workspaceUuid)

  if (currentRole == null) {
    await db.assignWorkspace(account.uuid, workspaceUuid, role)
  } else if (getRolePower(currentRole) < getRolePower(role)) {
    await db.updateWorkspaceRole(account.uuid, workspaceUuid, role)
  }
}

export async function getPersonInfo (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { account: PersonUuid }
): Promise<PersonInfo> {
  const { account } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['workspace', 'tool', 'gmail', 'huly-mail', 'export'], extra)

  if (account == null || account === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const person = await db.person.findOne({ uuid: account })

  if (person == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: account }))
  }

  const verifiedSocialIds = await db.socialId.find({ personUuid: account, verifiedOn: { $gt: 0 } })

  return {
    personUuid: account,
    name: getPersonName(person),
    socialIds: verifiedSocialIds
  }
}

export async function addSocialIdToPerson (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { person: PersonUuid, type: SocialIdType, value: string, confirmed: boolean, displayValue?: string }
): Promise<PersonId> {
  const { person, type, value, confirmed, displayValue } = params
  const { extra } = decodeTokenVerbose(ctx, token)

  if (extra?.admin !== 'true') {
    verifyAllowedServices(
      ['github', 'telegram-bot', 'gmail', 'tool', 'workspace', 'hulygram', 'google-calendar', 'ai-assistant'],
      extra
    )
  }

  if (person == null || person === '' || !Object.values(SocialIdType).includes(type) || value == null || value === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  return await addSocialIdBase(db, person, type, value, confirmed, displayValue)
}

export async function updateSocialId (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { personId: PersonId, displayValue: string }
): Promise<void> {
  const { personId, displayValue } = params
  const { extra } = decodeTokenVerbose(ctx, token)

  verifyAllowedServices(['telegram-bot', 'gmail'], extra)

  if (personId == null || personId === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const socialId = await db.socialId.findOne({ _id: personId })
  if (socialId != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.SocialIdNotFound, { _id: personId }))
  }

  await db.socialId.update({ _id: personId }, { displayValue })
}

export async function createIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Integration
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  // it checks params and throws BadRequest if params are invalid
  const existing = await findExistingIntegration(account, db, params, extra)
  if (existing != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationAlreadyExists, {}))
  }

  const { socialId, kind, workspaceUuid, data } = params
  const social = await db.socialId.findOne({ _id: socialId })

  if (social?.personUuid === readOnlyGuestAccountUuid) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  await db.integration.insertOne({ socialId, kind, workspaceUuid, data })
}

export async function updateIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Integration
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  // it checks params and throws BadRequest if params are invalid
  const existing = await findExistingIntegration(account, db, params, extra)
  if (existing == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const { socialId, kind, workspaceUuid, data } = params
  await db.integration.update({ socialId, kind, workspaceUuid }, { data })
}

export async function deleteIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationKey
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  // it checks params and throws BadRequest if params are invalid
  const existing = await findExistingIntegration(account, db, params, extra)
  if (existing == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const { socialId, kind, workspaceUuid } = params
  await db.integrationSecret.deleteMany({ socialId, kind, workspaceUuid })
  await db.integration.deleteMany({ socialId, kind, workspaceUuid })
}

export async function listIntegrations (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Partial<IntegrationKey>
): Promise<Integration[]> {
  const { account, extra } = decodeTokenVerbose(ctx, token)
  const isAllowedService = verifyAllowedServices(integrationServices, extra, false)
  const { socialId, kind, workspaceUuid } = params
  let socialIds: PersonId[] | undefined

  if (isAllowedService) {
    socialIds = socialId != null ? [socialId] : undefined
  } else {
    const socialIdObjs = await db.socialId.find({ personUuid: account, verifiedOn: { $gt: 0 } })

    if (socialIdObjs.length === 0) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }

    const allowedSocialIds = socialIdObjs.map((it) => it._id)

    if (socialId !== undefined) {
      if (!allowedSocialIds.includes(socialId)) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      }

      socialIds = [socialId]
    } else {
      socialIds = allowedSocialIds
    }
  }

  return await db.integration.find({
    ...(socialIds != null ? { socialId: { $in: socialIds } } : {}),
    kind,
    workspaceUuid
  })
}

export async function getIntegration (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationKey
): Promise<Integration | null> {
  const { account, extra } = decodeTokenVerbose(ctx, token)
  const isAllowedService = verifyAllowedServices(integrationServices, extra, false)
  const { socialId, kind, workspaceUuid } = params

  if (kind == null || kind === '' || socialId == null || socialId === '' || workspaceUuid === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  if (!isAllowedService) {
    const existingSocialId = await db.socialId.findOne({ _id: socialId, personUuid: account, verifiedOn: { $gt: 0 } })

    if (existingSocialId == null) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  return await db.integration.findOne({ socialId, kind, workspaceUuid })
}

export async function addIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecret
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  const { socialId, kind, workspaceUuid, key, secret } = params
  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const existingIntegration = await findExistingIntegration(account, db, params, extra)
  if (existingIntegration == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const secretKey: IntegrationSecretKey = { socialId, kind, workspaceUuid, key }
  const existingSecret = await db.integrationSecret.findOne(secretKey)
  if (existingSecret != null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretAlreadyExists, {}))
  }

  await db.integrationSecret.insertOne({ ...secretKey, secret })
}

export async function updateIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecret
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  const { socialId, kind, workspaceUuid, key, secret } = params
  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const existingIntegration = await findExistingIntegration(account, db, params, extra)
  if (existingIntegration == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const secretKey: IntegrationSecretKey = { socialId, kind, workspaceUuid, key }
  const existingSecret = await db.integrationSecret.findOne(secretKey)
  if (existingSecret == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
  }

  await db.integrationSecret.update(secretKey, { secret })
}

export async function deleteIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecretKey
): Promise<void> {
  const { extra, account } = decodeTokenVerbose(ctx, token)
  const { socialId, kind, workspaceUuid, key } = params
  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const existingIntegration = await findExistingIntegration(account, db, params, extra)
  if (existingIntegration == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
  }

  const secretKey: IntegrationSecretKey = { socialId, kind, workspaceUuid, key }
  const existingSecret = await db.integrationSecret.findOne(secretKey)
  if (existingSecret == null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
  }

  await db.integrationSecret.deleteMany(secretKey)
}

export async function getIntegrationSecret (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: IntegrationSecretKey
): Promise<IntegrationSecret | null> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(integrationServices, extra)
  const { socialId, kind, workspaceUuid, key } = params

  if (
    kind == null ||
    kind === '' ||
    socialId == null ||
    socialId === '' ||
    workspaceUuid === undefined ||
    key == null
  ) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }
  const existing = await db.integrationSecret.findOne({ socialId, kind, workspaceUuid, key })

  return existing
}

export async function listIntegrationsSecrets (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: Partial<IntegrationSecretKey>
): Promise<IntegrationSecret[]> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(integrationServices, extra)
  const { socialId, kind, workspaceUuid, key } = params

  return await db.integrationSecret.find({ socialId, kind, workspaceUuid, key })
}

export async function findFullSocialIdBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialKey: string }
): Promise<SocialId | null> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['telegram-bot', 'gmail', 'tool', 'workspace', 'google-calendar'], extra)

  const { socialKey } = params

  if (socialKey == null || socialKey === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  return await db.socialId.findOne({ key: socialKey })
}

export async function findFullSocialIds (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialIds: PersonId[] }
): Promise<SocialId[]> {
  const { socialIds } = params
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['gmail', 'tool', 'workspace', 'huly-mail', 'rating'], extra)

  if (socialIds == null || socialIds.length === 0) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  // Add validation to social Ids

  return await db.socialId.find({ _id: { $in: socialIds } })
}

export async function mergeSpecifiedAccounts (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    primaryAccount: AccountUuid
    secondaryAccount: AccountUuid
  }
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)
  verifyAllowedServices(['tool', 'workspace'], extra)

  const { primaryAccount, secondaryAccount } = params
  if (primaryAccount == null || primaryAccount === '' || secondaryAccount == null || secondaryAccount === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  await doMergeAccounts(db, primaryAccount, secondaryAccount)
}

export async function findPersonBySocialKey (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: { socialString: string, requireAccount?: boolean }
): Promise<PersonUuid | undefined> {
  const { socialString } = params

  if (socialString == null || socialString === '') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
  }

  const { extra } = decodeTokenVerbose(ctx, token)

  verifyAllowedServices(['tool', 'workspace', 'aibot', ...integrationServices], extra)

  const socialId = await db.socialId.findOne({ key: socialString })

  if (socialId == null) {
    return
  }

  if (params.requireAccount === true) {
    const account = await db.account.findOne({ uuid: socialId.personUuid as AccountUuid })

    return account?.uuid
  }

  return socialId.personUuid
}

/**
 * Upsert (create or update) subscription for a workspace
 * Only accessible by payment service
 * Creates new subscription or updates existing one based on providerId
 * @public
 */
export async function upsertSubscription (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: SubscriptionData
): Promise<void> {
  const { extra } = decodeTokenVerbose(ctx, token)

  // Only payment service can upsert subscriptions
  if (extra?.service !== 'payment') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const { workspaceUuid, provider, providerSubscriptionId } = params

  // Verify workspace exists
  const workspace = await getWorkspaceById(db, workspaceUuid)
  if (workspace === null) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid }))
  }

  // Check if subscription exists by provider + providerSubscriptionId (unique external ID)
  const existing = await db.subscription.findOne({ provider, providerSubscriptionId })
  const updateData = {
    workspaceUuid: params.workspaceUuid,
    accountUuid: params.accountUuid,
    provider: params.provider,
    providerSubscriptionId: params.providerSubscriptionId,
    providerCheckoutId: params.providerCheckoutId,
    amount: params.amount,
    type: params.type,
    status: params.status,
    plan: params.plan,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    trialEnd: params.trialEnd,
    canceledAt: params.canceledAt,
    willCancelAt: params.willCancelAt,
    providerData: params.providerData,
    updatedOn: Date.now()
  }
  if (existing !== null) {
    // Update existing subscription
    await db.subscription.update({ id: existing.id }, updateData)
    ctx.info('Subscription updated', {
      id: existing.id,
      workspaceUuid,
      status: params.status,
      type: params.type,
      plan: params.plan
    })
  } else {
    // Create new subscription
    await db.subscription.insertOne({
      ...updateData,
      id: params.id,
      createdOn: Date.now()
    })
    ctx.info('Subscription created', {
      id: params.id,
      workspaceUuid,
      status: params.status,
      type: params.type,
      plan: params.plan
    })
  }
}

export async function getSubscriptionByProviderId (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {
    provider: string
    providerSubscriptionId: string
  }
): Promise<Subscription | null> {
  const { extra } = decodeTokenVerbose(ctx, token)

  // Only payment service can query subscriptions by provider ID
  if (extra?.service !== 'payment') {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }

  const { provider, providerSubscriptionId } = params

  // Find subscription by provider and providerSubscriptionId (unique external ID)
  const subscription = await db.subscription.findOne({
    provider,
    providerSubscriptionId
  })

  return subscription ?? null
}

export async function getAdminEmails (
  ctx: MeasureContext,
  db: AccountDB,
  branding: Branding | null,
  token: string,
  params: {}
): Promise<{ emails: string[] }> {
  await assertAdmin(ctx, db, token)
  const emails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)
  return { emails }
}

export type AccountServiceMethods =
  | 'getPendingWorkspace'
  | 'updateWorkspaceInfo'
  | 'workerHandshake'
  | 'updateBackupInfo'
  | 'updateUsageInfo'
  | 'assignWorkspace'
  | 'listWorkspaces'
  | 'performWorkspaceOperation'
  | 'updateWorkspaceRoleBySocialKey'
  | 'addSocialIdToPerson'
  | 'updateSocialId'
  | 'getPersonInfo'
  | 'createIntegration'
  | 'updateIntegration'
  | 'deleteIntegration'
  | 'listIntegrations'
  | 'getIntegration'
  | 'addIntegrationSecret'
  | 'updateIntegrationSecret'
  | 'deleteIntegrationSecret'
  | 'getIntegrationSecret'
  | 'listIntegrationsSecrets'
  | 'findFullSocialIdBySocialKey'
  | 'mergeSpecifiedAccounts'
  | 'findPersonBySocialKey'
  | 'listAccounts'
  | 'listAccountsAdmin'
  | 'getAccountDetails'
  | 'listAuditAdmin'
  | 'addWorkspaceMember'
  | 'getWorkspaceMembersAdmin'
  | 'createAccountAdmin'
  | 'bulkAddToWorkspace'
  | 'bulkRemoveFromWorkspace'
  | 'bulkSetDisabled'
  | 'bulkSendPasswordReset'
  | 'findFullSocialIds'
  | 'getSubscriptionByProviderId'
  | 'upsertSubscription'
  | 'getAdminEmails'

/**
 * @public
 */
export function getServiceMethods (deps?: AccountMethodDeps): Partial<Record<AccountServiceMethods, AccountMethodHandler>> {
  return {
    getPendingWorkspace: wrap(getPendingWorkspace),
    updateWorkspaceInfo: wrap(updateWorkspaceInfo),
    workerHandshake: wrap(workerHandshake),
    updateBackupInfo: wrap(updateBackupInfo),
    updateUsageInfo: wrap(updateUsageInfo),
    assignWorkspace: wrap(assignWorkspace),
    listWorkspaces: wrap(listWorkspaces),
    performWorkspaceOperation: wrap(performWorkspaceOperation),
    updateWorkspaceRoleBySocialKey: wrap(updateWorkspaceRoleBySocialKey),
    addSocialIdToPerson: wrap(addSocialIdToPerson),
    updateSocialId: wrap(updateSocialId),
    getPersonInfo: wrap(getPersonInfo),
    createIntegration: wrap(createIntegration),
    updateIntegration: wrap(updateIntegration),
    deleteIntegration: wrap(deleteIntegration),
    listIntegrations: wrap(listIntegrations),
    getIntegration: wrap(getIntegration),
    addIntegrationSecret: wrap(addIntegrationSecret),
    updateIntegrationSecret: wrap(updateIntegrationSecret),
    deleteIntegrationSecret: wrap(deleteIntegrationSecret),
    getIntegrationSecret: wrap(getIntegrationSecret),
    listIntegrationsSecrets: wrap(listIntegrationsSecrets),
    findFullSocialIdBySocialKey: wrap(findFullSocialIdBySocialKey),
    findFullSocialIds: wrap(findFullSocialIds),
    mergeSpecifiedAccounts: wrap(mergeSpecifiedAccounts),
    findPersonBySocialKey: wrap(findPersonBySocialKey),
    listAccounts: wrap(listAccounts),
    listAccountsAdmin: wrap(listAccountsAdmin),
    getAccountDetails: wrap(getAccountDetails),
    listAuditAdmin: wrap(listAuditAdmin),
    addWorkspaceMember: wrap(addWorkspaceMember),
    getWorkspaceMembersAdmin: wrap(getWorkspaceMembersAdmin),
    createAccountAdmin: wrap(createAccountAdmin),
    bulkAddToWorkspace: wrap(bulkAddToWorkspace),
    bulkRemoveFromWorkspace: wrap(bulkRemoveFromWorkspace),
    bulkSetDisabled: wrapWithDeps(bulkSetDisabled, deps),
    bulkSendPasswordReset: wrap(bulkSendPasswordReset),
    getSubscriptionByProviderId: wrap(getSubscriptionByProviderId),
    upsertSubscription: wrap(upsertSubscription),
    getAdminEmails: wrap(getAdminEmails)
  }
}
