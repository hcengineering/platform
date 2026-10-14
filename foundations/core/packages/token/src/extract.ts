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

import { type IncomingHttpHeaders } from 'http'
import { type Token, TokenError, decodeToken } from './token'

const accountTokenCookie = 'account-metadata-Token'.toLocaleLowerCase()
const presentationTokenCookie = 'presentation-metadata-Token'.toLocaleLowerCase()

const extractCookieToken = (cookie?: string): string | null => {
  if (cookie === undefined || cookie === null) {
    return null
  }

  let authToken: string | null = null

  const cookies = cookie.split(';')
  for (const cookie of cookies) {
    const lcookie = cookie.toLocaleLowerCase()
    if (lcookie.includes(presentationTokenCookie) || lcookie.includes(accountTokenCookie)) {
      try {
        const encodedToken = cookie.split('=')[1]
        const token = decodeToken(encodedToken)

        if (token.workspace != null) {
          return encodedToken
        }

        authToken = encodedToken
      } catch {}
    }
  }

  return authToken
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

export function requireToken (headers: IncomingHttpHeaders): Token {
  const token = extractToken(headers)
  if (token === undefined) {
    throw new TokenError('Missing token')
  }
  return token
}
