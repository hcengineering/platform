import { type Token, decodeToken } from '@hcengineering/server-token'
import { type IncomingHttpHeaders } from 'http'

const extractCookieToken = (cookie?: string): string | null => {
  if (cookie === undefined || cookie === null) {
    return null
  }

  const cookies = cookie.split(';')
  const tokenCookie = cookies.find((cookie) => cookie.toLocaleLowerCase().includes('token'))
  if (tokenCookie === undefined) {
    return null
  }

  const encodedToken = tokenCookie.split('=')[1]
  if (encodedToken === undefined) {
    return null
  }

  return encodedToken
}

const extractAuthorizationToken = (authorization?: string): string | null => {
  if (authorization === undefined || authorization === null) {
    return null
  }
  const encodedToken = authorization.split(' ')[1]

  if (encodedToken === undefined) {
    return null
  }

  return encodedToken
}

export function readToken (headers: IncomingHttpHeaders): string | undefined {
  try {
    return extractAuthorizationToken(headers.authorization) ?? extractCookieToken(headers.cookie) ?? undefined
  } catch {
    return undefined
  }
}

export function extractToken (headers: IncomingHttpHeaders): Token | undefined {
  try {
    const tokenStr = readToken(headers)

    return tokenStr !== undefined ? decodeToken(tokenStr) : undefined
  } catch {
    return undefined
  }
}
