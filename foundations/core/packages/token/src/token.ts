import { AccountRole, AccountUuid, MeasureContext, PersonUuid, WorkspaceUuid } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { decode, encode } from 'jwt-simple'
import { validate } from 'uuid'
import serverPlugin from './plugin'

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

const getSecret = (): string => {
  return getMetadata(serverPlugin.metadata.Secret) ?? 'secret'
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

/**
 * Checks whether a token has passed its `exp` (seconds since epoch) deadline.
 * `decodeToken` only verifies the signature — expiry must be checked separately.
 * @public
 */
export function isTokenExpired (token: Token, now: number = Date.now()): boolean {
  return token.exp !== undefined && token.exp * 1000 <= now
}

/**
 * Resolves whether a revokable API token (identified by `extra.apiTokenId`)
 * has been revoked. Registered by services that can reach the account
 * (see {@link setApiTokenRevocationChecker}); other services skip the check.
 * @public
 */
export type ApiTokenRevocationChecker = (apiTokenId: string, token: Token, raw: string) => Promise<boolean>

let apiTokenRevocationChecker: ApiTokenRevocationChecker | undefined

const REVOCATION_CACHE_TTL_MS = 60_000
const revocationCache = new Map<string, { revoked: boolean, checkedAt: number }>()

/**
 * Registers the revocation resolver used by {@link verifyToken}. Services with
 * an account client install this once at startup; this is the "method to verify"
 * metadata the token plugin needs to enforce revocation without depending on the
 * account client directly.
 * @public
 */
export function setApiTokenRevocationChecker (checker: ApiTokenRevocationChecker | undefined): void {
  apiTokenRevocationChecker = checker
  revocationCache.clear()
}

async function isApiTokenRevoked (apiTokenId: string, token: Token, raw: string, now: number): Promise<boolean> {
  const cached = revocationCache.get(apiTokenId)
  // Revocation is irreversible — once confirmed it stays cached.
  if (cached?.revoked === true) return true
  if (cached === undefined || now - cached.checkedAt > REVOCATION_CACHE_TTL_MS) {
    try {
      const revoked = await (apiTokenRevocationChecker as ApiTokenRevocationChecker)(apiTokenId, token, raw)
      revocationCache.set(apiTokenId, { revoked, checkedAt: now })
      return revoked
    } catch {
      // Account unreachable: fall back to the stale verdict (fail-open) and retry next TTL.
      return cached?.revoked ?? false
    }
  }
  return cached.revoked
}

/**
 * Decodes and fully validates a token: signature (via {@link decodeToken}),
 * expiry, and — for revokable API tokens — revocation. Reuse this instead of
 * `decodeToken` anywhere expired or revoked tokens must be rejected (transactor
 * REST API, blob access, etc.) so the policy lives in one place.
 * @public
 */
export async function verifyToken (token: string, secret?: string): Promise<Token> {
  const decoded = decodeToken(token, true, secret)
  if (isTokenExpired(decoded)) {
    throw new TokenError('Token expired')
  }
  const apiTokenId = decoded.extra?.apiTokenId
  if (apiTokenId !== undefined && apiTokenRevocationChecker !== undefined) {
    if (await isApiTokenRevoked(apiTokenId, decoded, token, Date.now())) {
      throw new TokenError('Token revoked')
    }
  }
  return decoded
}
