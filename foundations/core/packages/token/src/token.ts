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

import { AccountRole, AccountUuid, MeasureContext, PersonUuid, WorkspaceUuid } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { decode, encode } from 'jwt-simple'
import { validate } from 'uuid'
import serverPlugin from './plugin'
import { getSecret } from './secret'

/**
 * @public
 */
export interface Token {
  account: AccountUuid
  workspace: WorkspaceUuid
  extra?: Record<string, any>
  grant?: PermissionsGrant

  sub?: AccountUuid // Subject
  exp?: number // Expiration, seconds since epoch
  nbf?: number // Not valid before, seconds since epoch
}

// Permissions grant provides the token presenter access to a specific workspace
export interface PermissionsGrant {
  workspace: WorkspaceUuid
  role: AccountRole

  // Ideally we shouldn't need this but for now it's the only way to check
  // if some granted permissions are valid - the ones which can only be verified in the workspace
  grantedBy?: AccountUuid

  firstName?: string
  lastName?: string

  spaces?: string[]

  extra?: Record<string, any>
}

/**
 * @public
 */
export class TokenError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'TokenError'
  }
}

/**
 * @public
 */
export function generateToken (
  accountUuid: PersonUuid,
  workspaceUuid?: WorkspaceUuid,
  extra?: Record<string, string>,
  secret?: string,
  options?: {
    grant?: PermissionsGrant
    nbf?: number
    exp?: number
    sub?: PersonUuid
  }
): string {
  if (!validate(accountUuid)) {
    throw new TokenError(`Invalid account uuid: "${accountUuid}"`)
  }
  if (workspaceUuid !== undefined && !validate(workspaceUuid)) {
    throw new TokenError(`Invalid workspace uuid: "${workspaceUuid}"`)
  }
  const { grant, nbf, exp, sub } = options ?? {}
  if (grant?.workspace !== undefined && !validate(grant?.workspace)) {
    throw new TokenError(`Invalid grant workspace uuid: "${grant?.workspace}"`)
  }

  if (grant != null && sub == null && (nbf == null || exp == null)) {
    throw new TokenError('nbf and exp are required when sub is not provided')
  }

  const service = getMetadata(serverPlugin.metadata.Service)
  if (service !== undefined) {
    extra = { service, ...extra }
  }

  const sanitizedGrant: PermissionsGrant | undefined =
    grant !== undefined
      ? {
          workspace: grant.workspace,
          role: grant.role,
          grantedBy: grant.grantedBy,
          firstName: grant.firstName,
          lastName: grant.lastName,
          spaces: grant.spaces,
          extra: grant.extra
        }
      : undefined

  return encode(
    {
      ...(extra !== undefined ? { extra } : {}),
      account: accountUuid,
      workspace: workspaceUuid,
      grant: sanitizedGrant,
      sub,
      exp,
      nbf
    },
    secret ?? getSecret()
  )
}

/**
 * @public
 */
export function decodeToken (token: string, verify: boolean = true, secret?: string): Token {
  try {
    return decode(token, secret ?? getSecret(), !verify)
  } catch (err: any) {
    throw new TokenError(err.message)
  }
}

/**
 * @public
 */
export function decodeTokenVerbose (ctx: MeasureContext, token: string): Token {
  try {
    return decodeToken(token)
  } catch (err: any) {
    try {
      const decode = decodeToken(token, false)
      ctx.warn('Failed to verify token', { ...decode })
    } catch (err2: any) {
      // Nothing to do
    }
    throw new TokenError(err.message)
  }
}
