//
// Copyright © 2026 TraceX SAS.
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

import { AccountRole, docGuestAccountUuid, readOnlyGuestAccountUuid, systemAccountUuid } from '@hcengineering/core'
import platform, { Severity, Status } from '@hcengineering/platform'
import { decodeTokenVerbose } from '@hcengineering/server-token'

import type { AccountDB, AccountMethodHandler } from './types'

export type GuestAccessPolicy =
  | 'bypass'
  | 'allGuests'
  | 'readOnlyAndPersonal'
  | 'personalGuest'
  // Personal guests plus regular accounts without workspaces yet (e.g. joining a workspace by invite).
  // Shared anonymous guests and document guests are still rejected.
  | 'joinWorkspace'
  | 'deny'

async function getGuestRole (
  db: AccountDB,
  account: ReturnType<typeof decodeTokenVerbose>
): Promise<AccountRole | undefined> {
  if (account.account === docGuestAccountUuid) return AccountRole.DocGuest
  if (account.account === readOnlyGuestAccountUuid || account.extra?.readonly === 'true') {
    return AccountRole.ReadOnlyGuest
  }
  if (account.account === systemAccountUuid || account.extra?.admin === 'true' || account.extra?.service != null) {
    return undefined
  }

  if (account.workspace != null) {
    const role = await db.getWorkspaceRole(account.account, account.workspace)
    if (role === AccountRole.Guest || role === AccountRole.ReadOnlyGuest || role === AccountRole.DocGuest) {
      return role
    }
    return role == null ? AccountRole.ReadOnlyGuest : undefined
  }

  const roles = await db.getWorkspaceRoles(account.account)
  if (roles.size === 0) return AccountRole.ReadOnlyGuest
  return Array.from(roles.values()).every((role) => role === AccountRole.Guest) ? AccountRole.Guest : undefined
}

function isSharedAnonymous (account: ReturnType<typeof decodeTokenVerbose> | undefined): boolean {
  return (
    account === undefined ||
    account.account === readOnlyGuestAccountUuid ||
    account.account === docGuestAccountUuid ||
    account.extra?.readonly === 'true'
  )
}

/** Reject account RPCs that are not explicitly available to the caller's guest role. */
export function guardGuestMethod (
  handler: AccountMethodHandler,
  policy: GuestAccessPolicy = 'deny'
): AccountMethodHandler {
  // Bypass delegates authorization entirely to the method and the existing wrap checks.
  if (policy === 'bypass') return handler

  return async (ctx, db, branding, request, token, params, meta) => {
    if (token == null || token === '') {
      return { id: request.id, error: new Status(Severity.ERROR, platform.status.Unauthorized, {}) }
    }

    let guestRole: AccountRole | undefined
    let decoded: ReturnType<typeof decodeTokenVerbose> | undefined
    try {
      decoded = decodeTokenVerbose(ctx, token)
      guestRole = await getGuestRole(db, decoded)
    } catch (error) {
      ctx.error('Failed to determine guest access', { error })
      return { id: request.id, error: new Status(Severity.ERROR, platform.status.Unauthorized, {}) }
    }

    const allowed =
      guestRole === undefined ||
      (guestRole === AccountRole.DocGuest && policy === 'allGuests') ||
      (guestRole === AccountRole.ReadOnlyGuest && (policy === 'allGuests' || policy === 'readOnlyAndPersonal')) ||
      (guestRole === AccountRole.Guest &&
        (policy === 'allGuests' ||
          policy === 'readOnlyAndPersonal' ||
          policy === 'personalGuest' ||
          policy === 'joinWorkspace')) ||
      (guestRole === AccountRole.ReadOnlyGuest && policy === 'joinWorkspace' && !isSharedAnonymous(decoded))

    if (!allowed) {
      ctx.warn('Guest access to account method denied', {
        method: request.method,
        policy,
        guestRole,
        account: decoded?.account,
        workspace: decoded?.workspace
      })
      return { id: request.id, error: new Status(Severity.ERROR, platform.status.Forbidden, {}) }
    }

    return await handler(ctx, db, branding, request, token, params, meta)
  }
}
