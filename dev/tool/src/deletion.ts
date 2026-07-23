//
// Copyright © 2026 Hardcore Engineering Inc.
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
  SocialIdType,
  type AccountUuid,
  type MeasureContext,
  type PersonUuid,
  type WorkspaceDataId,
  type WorkspaceUuid
} from '@hcengineering/core'
import { createInterface } from 'readline'

/**
 * Operator-facing prompt used to confirm destructive operations by re-typing the target name.
 */
export interface Prompter {
  prompt: (question: string) => Promise<string>
}

// --------------------------------------------------------------------------------------------
// Audit event types
// --------------------------------------------------------------------------------------------

/**
 * Stable identifiers emitted via {@link MeasureContext.info} as `audit.<action>`. Searchable in
 * Uptrace / stdout logs by exact match. Add new actions here — do not rename existing ones.
 */
export type AuditAction =
  | 'user.delete.start'
  | 'user.delete.done'
  | 'user.delete.refused'
  | 'workspace.delete.start'
  | 'workspace.delete.marked'
  | 'workspace.delete.refused'
  | 'workspace.storage.delete.start'
  | 'workspace.storage.delete.done'
  | 'workspace.storage.delete.refused'

export type AuditTarget =
  | { kind: 'user', email: string, uuid?: AccountUuid }
  | { kind: 'workspace', uuid: WorkspaceUuid, url: string }

export interface AuditEntry {
  action: AuditAction
  target: AuditTarget
  operator: string
  reason?: string
  time?: number
  details?: Record<string, unknown>
}

function emitAudit (ctx: MeasureContext, entry: AuditEntry): void {
  ctx.info(`audit.${entry.action}`, {
    action: entry.action,
    operator: entry.operator,
    reason: entry.reason,
    target: JSON.stringify(entry.target),
    details: entry.details != null ? JSON.stringify(entry.details) : undefined,
    time: entry.time ?? Date.now()
  })
}

/**
 * Minimal view of {@link @hcengineering/account#AccountDB} required for deletion flows.
 * Keeping it narrow keeps the module unit-testable without dragging in the full DB type.
 */
export interface AccountDbView {
  socialId: {
    // Mirrors AccountDB.socialId.findOne (returns SocialId, narrowed to the personUuid we need).
    findOne: (q: { type: SocialIdType, value: string }) => Promise<{ personUuid: PersonUuid } | null>
  }
  getAccountWorkspaces: (
    accountId: AccountUuid
  ) => Promise<Array<{ uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId }>>
  getWorkspaceMembers: (workspaceId: WorkspaceUuid) => Promise<Array<{ person: PersonUuid, role: AccountRole }>>
}

/**
 * Minimal AccountClient slice used by these flows.
 */
export interface AccountAdmin {
  deleteAccount: (uuid: AccountUuid) => Promise<void>
  performWorkspaceOperation: (workspaceId: WorkspaceUuid, op: 'delete') => Promise<boolean>
}

export interface WorkspaceResolver {
  getWorkspace: (idOrUrl: string) => Promise<{ uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId } | null>
}

export interface BlobBatchIterator {
  next: () => Promise<Array<{ _id: string, size?: number }>>
  close: () => Promise<void>
}

/**
 * Minimal storage slice used by storage cleanup. Mirrors {@link StorageAdapter} but narrows
 * the shape we depend on so tests can stub it directly.
 */
export interface StorageOps {
  listStream: (
    ctx: MeasureContext,
    wsIds: { uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId }
  ) => Promise<BlobBatchIterator>
  remove: (
    ctx: MeasureContext,
    wsIds: { uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId },
    objectNames: string[]
  ) => Promise<void>
}

// --------------------------------------------------------------------------------------------
// confirmRetype
// --------------------------------------------------------------------------------------------

export interface ConfirmOptions {
  /** Non-interactive: if equal to `expected`, treated as confirmed without prompting. */
  yes?: string
}

/**
 * Require the operator to re-type the target name (or pass `--yes <name>`).
 *
 * Trimmed, case-sensitive equality. A bad `--yes` value never falls through to the prompt — that
 * would defeat the point of the non-interactive escape hatch.
 */
export async function confirmRetype (prompter: Prompter, expected: string, opts: ConfirmOptions): Promise<boolean> {
  if (opts.yes !== undefined) {
    return opts.yes === expected
  }
  const answer = (await prompter.prompt(`Re-type "${expected}" to confirm: `)).trim()
  return answer === expected
}

/**
 * A readline-backed prompter for CLI use. Tests inject their own.
 */
export function createReadlinePrompter (): Prompter {
  return {
    prompt: async (question) =>
      await new Promise<string>((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        rl.question(question, (answer) => {
          rl.close()
          resolve(answer)
        })
      })
  }
}

// --------------------------------------------------------------------------------------------
// deleteUser
// --------------------------------------------------------------------------------------------

export interface DeleteUserParams {
  email: string
  /** When set, value the operator typed via `--yes <value>` for non-interactive confirmation. */
  confirm?: string
  /** Skip the sole-owner safety check. Required if the user owns workspaces alone. */
  force?: boolean
  /** When true, report what would happen without touching the account. */
  dryRun?: boolean
  /** Human reason (ticket id) recorded in the audit entry. */
  reason?: string
  /** Identifier of the operator running this command. */
  operator: string
}

export interface DeleteUserDeps {
  ctx: MeasureContext
  db: AccountDbView
  admin: AccountAdmin
  prompter: Prompter
  params: DeleteUserParams
}

export type DeleteUserResult =
  | { status: 'not-found' }
  | {
    status: 'dry-run'
    accountUuid: AccountUuid
    workspaces: Array<{ uuid: WorkspaceUuid, url: string }>
    soleOwnerOf: WorkspaceUuid[]
  }
  | { status: 'refused-sole-owner', accountUuid: AccountUuid, soleOwnerOf: WorkspaceUuid[] }
  | { status: 'refused-confirmation', accountUuid: AccountUuid }
  | { status: 'deleted', accountUuid: AccountUuid }

export async function deleteUser (deps: DeleteUserDeps): Promise<DeleteUserResult> {
  const { ctx, db, admin, prompter, params } = deps
  const social = await db.socialId.findOne({ type: SocialIdType.EMAIL, value: params.email })
  if (social == null) {
    return { status: 'not-found' }
  }
  // At this point the social id resolves to an existing person; if no account row exists,
  // accountClient.deleteAccount will be a no-op. The PersonUuid -> AccountUuid cast matches
  // what the rest of the account service does (see operations.ts:deleteAccount).
  const accountUuid = social.personUuid as AccountUuid
  const workspaces = await db.getAccountWorkspaces(accountUuid)
  const soleOwnerOf: WorkspaceUuid[] = []
  for (const ws of workspaces) {
    const members = await db.getWorkspaceMembers(ws.uuid)
    const owners = members.filter((m) => m.role === AccountRole.Owner)
    if (owners.length === 1 && owners[0].person === accountUuid) {
      soleOwnerOf.push(ws.uuid)
    }
  }

  const target: AuditTarget = { kind: 'user', email: params.email, uuid: accountUuid }

  if (params.dryRun === true) {
    return {
      status: 'dry-run',
      accountUuid,
      workspaces: workspaces.map((w) => ({ uuid: w.uuid, url: w.url })),
      soleOwnerOf
    }
  }

  if (soleOwnerOf.length > 0 && params.force !== true) {
    emitAudit(ctx, {
      action: 'user.delete.refused',
      target,
      operator: params.operator,
      reason: params.reason,
      details: { reason: 'sole-owner', soleOwnerOf }
    })
    return { status: 'refused-sole-owner', accountUuid, soleOwnerOf }
  }

  const ok = await confirmRetype(prompter, params.email, { yes: params.confirm })
  if (!ok) {
    emitAudit(ctx, {
      action: 'user.delete.refused',
      target,
      operator: params.operator,
      reason: params.reason,
      details: { reason: 'bad-confirmation' }
    })
    return { status: 'refused-confirmation', accountUuid }
  }

  emitAudit(ctx, {
    action: 'user.delete.start',
    target,
    operator: params.operator,
    reason: params.reason,
    details: { workspaces: workspaces.map((w) => w.uuid), soleOwnerOf, force: params.force === true }
  })

  ctx.info('deleting user', { email: params.email, accountUuid })
  await admin.deleteAccount(accountUuid)

  emitAudit(ctx, {
    action: 'user.delete.done',
    target,
    operator: params.operator,
    reason: params.reason
  })

  return { status: 'deleted', accountUuid }
}

// --------------------------------------------------------------------------------------------
// deleteWorkspace
// --------------------------------------------------------------------------------------------

export interface DeleteWorkspaceParams {
  workspace: string
  confirm?: string
  dryRun?: boolean
  reason?: string
  operator: string
}

export interface DeleteWorkspaceDeps {
  ctx: MeasureContext
  resolver: WorkspaceResolver
  admin: AccountAdmin
  prompter: Prompter
  params: DeleteWorkspaceParams
}

export type DeleteWorkspaceResult =
  | { status: 'not-found' }
  | { status: 'dry-run', workspace: { uuid: WorkspaceUuid, url: string } }
  | { status: 'refused-confirmation', workspace: { uuid: WorkspaceUuid, url: string } }
  | { status: 'marked', workspace: { uuid: WorkspaceUuid, url: string } }

export async function deleteWorkspace (deps: DeleteWorkspaceDeps): Promise<DeleteWorkspaceResult> {
  const { ctx, resolver, admin, prompter, params } = deps
  const ws = await resolver.getWorkspace(params.workspace)
  if (ws == null) {
    return { status: 'not-found' }
  }
  const target: AuditTarget = { kind: 'workspace', uuid: ws.uuid, url: ws.url }
  const wsView = { uuid: ws.uuid, url: ws.url }

  if (params.dryRun === true) {
    return { status: 'dry-run', workspace: wsView }
  }

  const ok = await confirmRetype(prompter, ws.url, { yes: params.confirm })
  if (!ok) {
    emitAudit(ctx, {
      action: 'workspace.delete.refused',
      target,
      operator: params.operator,
      reason: params.reason,
      details: { reason: 'bad-confirmation' }
    })
    return { status: 'refused-confirmation', workspace: wsView }
  }

  emitAudit(ctx, {
    action: 'workspace.delete.start',
    target,
    operator: params.operator,
    reason: params.reason
  })

  ctx.info('marking workspace pending-deletion', { uuid: ws.uuid, url: ws.url })
  await admin.performWorkspaceOperation(ws.uuid, 'delete')

  emitAudit(ctx, {
    action: 'workspace.delete.marked',
    target,
    operator: params.operator,
    reason: params.reason
  })

  return { status: 'marked', workspace: wsView }
}

// --------------------------------------------------------------------------------------------
// deleteWorkspaceStorage (dry-run by default)
// --------------------------------------------------------------------------------------------

export interface DeleteStorageParams {
  workspace: string
  /** When true, actually remove the blobs. Default behaviour is a non-destructive dry-run. */
  apply?: boolean
  confirm?: string
  /** Objects per remove() call. Defaults to 500. */
  batchSize?: number
  reason?: string
  operator: string
}

export interface DeleteStorageDeps {
  ctx: MeasureContext
  resolver: WorkspaceResolver
  storage: StorageOps
  prompter: Prompter
  params: DeleteStorageParams
}

export type DeleteStorageResult =
  | { status: 'not-found' }
  | { status: 'dry-run', workspace: { uuid: WorkspaceUuid, url: string }, objectCount: number, totalBytes: number }
  | {
    status: 'refused-confirmation'
    workspace: { uuid: WorkspaceUuid, url: string }
    objectCount: number
    totalBytes: number
  }
  | {
    status: 'deleted'
    workspace: { uuid: WorkspaceUuid, url: string }
    objectCount: number
    totalBytes: number
  }

interface ScanResult {
  objectCount: number
  totalBytes: number
}

async function scanStorage (
  ctx: MeasureContext,
  storage: StorageOps,
  wsIds: { uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId }
): Promise<ScanResult> {
  const it = await storage.listStream(ctx, wsIds)
  let objectCount = 0
  let totalBytes = 0
  try {
    while (true) {
      const batch = await it.next()
      if (batch.length === 0) break
      for (const b of batch) {
        objectCount++
        totalBytes += b.size ?? 0
      }
    }
  } finally {
    await it.close()
  }
  return { objectCount, totalBytes }
}

async function removeAll (
  ctx: MeasureContext,
  storage: StorageOps,
  wsIds: { uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId },
  batchSize: number
): Promise<ScanResult> {
  const it = await storage.listStream(ctx, wsIds)
  let objectCount = 0
  let totalBytes = 0
  let buffer: string[] = []
  try {
    while (true) {
      const batch = await it.next()
      if (batch.length === 0) break
      for (const b of batch) {
        objectCount++
        totalBytes += b.size ?? 0
        buffer.push(b._id)
        if (buffer.length >= batchSize) {
          await storage.remove(ctx, wsIds, buffer)
          buffer = []
        }
      }
    }
    if (buffer.length > 0) {
      await storage.remove(ctx, wsIds, buffer)
    }
  } finally {
    await it.close()
  }
  return { objectCount, totalBytes }
}

export async function deleteWorkspaceStorage (deps: DeleteStorageDeps): Promise<DeleteStorageResult> {
  const { ctx, resolver, storage, prompter, params } = deps
  const ws = await resolver.getWorkspace(params.workspace)
  if (ws == null) {
    return { status: 'not-found' }
  }
  const target: AuditTarget = { kind: 'workspace', uuid: ws.uuid, url: ws.url }
  const wsView = { uuid: ws.uuid, url: ws.url }

  // Default behaviour is a non-destructive dry-run scan.
  if (params.apply !== true) {
    const scan = await scanStorage(ctx, storage, ws)
    return { status: 'dry-run', workspace: wsView, ...scan }
  }

  const ok = await confirmRetype(prompter, ws.url, { yes: params.confirm })
  if (!ok) {
    // We still report counts so the operator knows what would have been touched.
    const scan = await scanStorage(ctx, storage, ws)
    emitAudit(ctx, {
      action: 'workspace.storage.delete.refused',
      target,
      operator: params.operator,
      reason: params.reason,
      details: { reason: 'bad-confirmation', ...scan }
    })
    return { status: 'refused-confirmation', workspace: wsView, ...scan }
  }

  emitAudit(ctx, {
    action: 'workspace.storage.delete.start',
    target,
    operator: params.operator,
    reason: params.reason
  })

  const result = await removeAll(ctx, storage, ws, params.batchSize ?? 500)

  emitAudit(ctx, {
    action: 'workspace.storage.delete.done',
    target,
    operator: params.operator,
    reason: params.reason,
    details: { objectCount: result.objectCount, totalBytes: result.totalBytes }
  })

  return { status: 'deleted', workspace: wsView, ...result }
}
