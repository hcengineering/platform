import { AccountUuid, MeasureContext, PersonUuid, WorkspaceUuid } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { decode, encode } from 'jwt-simple'
import serverPlugin from './plugin'

/**
 * @public
 */
export interface Token {
  account: AccountUuid
  workspace: WorkspaceUuid
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
  secret?: string
): string {
  return encode(
    { ...(extra !== undefined ? { extra } : {}), account: accountUuid, workspace: workspaceUuid },
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
