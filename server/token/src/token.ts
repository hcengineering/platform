import { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { decode, encode } from 'jwt-simple'
import serverPlugin from './plugin'

/**
 * @public
 */
export interface Token {
  account: string
  workspace: string
  extra?: Record<string, any>
}

const getSecret = (): string => {
  return getMetadata(serverPlugin.metadata.Secret) ?? 'secret'
}

/**
 * @public
 */
export function generateToken (
  accountUuid: string,
  workspaceUuid?: WorkspaceUuid,
  extra?: Record<string, string>
): string {
  return encode(
    { ...(extra !== undefined ? { extra } : {}), account: accountUuid, workspace: workspaceUuid },
    getSecret()
  )
}

/**
 * @public
 */
export function decodeToken (token: string, verify: boolean = true, secret?: string): Token {
  return decode(token, secret ?? getSecret(), !verify)
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
    throw err
  }
}
