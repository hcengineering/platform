import { getMetadata } from '@hcengineering/platform'
import serverPlugin from './plugin'
import { encode, decode } from 'jwt-simple'

/**
 * @public
 */
export interface Token {
  email: string
  workspace: string
  extra?: Record<string, string>
}

const getSecret = (): string => {
  return getMetadata(serverPlugin.metadata.Secret) ?? 'secret'
}

/**
 * @public
 */
export function generateToken (email: string, workspace: string, extra?: Record<string, string>): string {
  return encode({ ...(extra ?? {}), email, workspace }, getSecret())
}

/**
 * @public
 */
export function decodeToken (token: string): Token {
  const value = decode(token, getSecret(), false)
  const { email, workspace, ...extra } = value
  return { email, workspace, extra }
}
