import { Token, decodeToken } from '@hcengineering/server-token'
import { IncomingHttpHeaders } from 'http'

const extractCookieToken = (cookie?: string): Token | null => {
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

  return decodeToken(encodedToken)
}

const extractAuthorizationToken = (authorization?: string): Token | null => {
  if (authorization === undefined || authorization === null) {
    return null
  }
  const encodedToken = authorization.split(' ')[1]

  if (encodedToken === undefined) {
    return null
  }

  return decodeToken(encodedToken)
}

export function extractToken (headers: IncomingHttpHeaders): Token | undefined {
  try {
    const token = extractCookieToken(headers.cookie) ?? extractAuthorizationToken(headers.authorization)

    return token ?? undefined
  } catch {
    return undefined
  }
}
