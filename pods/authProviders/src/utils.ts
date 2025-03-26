//
// Copyright © 2024 Hardcore Engineering, Inc.
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
import { AccountDB, joinWithProvider, LoginInfo, loginOrSignUpWithProvider } from '@hcengineering/account'
import { BrandingMap, concatLink, getBranding, MeasureContext, SocialKey } from '@hcengineering/core'
import { IncomingHttpHeaders } from 'http'
import qs from 'querystringify'

export function getHost (headers: IncomingHttpHeaders): string | undefined {
  let host: string | undefined
  const origin = headers.origin ?? headers.referer
  if (origin !== undefined) {
    host = new URL(origin).host
  }

  return host
}

export interface AuthState {
  inviteId?: string
  branding?: string
}

export function safeParseAuthState (rawState: string | undefined): AuthState {
  if (rawState == null) {
    return {}
  }

  try {
    return JSON.parse(decodeURIComponent(rawState))
  } catch {
    return {}
  }
}

export async function handleProviderAuth (
  measureCtx: MeasureContext,
  db: AccountDB,
  brandings: BrandingMap,
  frontUrl: string,
  providerType: string,
  rawState: string | undefined,
  user: any,
  email: string,
  first: string,
  last: string,
  socialKey: SocialKey,
  signUpDisabled: boolean | undefined
): Promise<string> {
  try {
    measureCtx.info('Provider auth handler', { email, type: providerType })
    let loginInfo: LoginInfo | null
    const state = safeParseAuthState(rawState)
    const branding = getBranding(brandings, state?.branding)

    if (state.inviteId != null && state.inviteId !== '') {
      loginInfo = await joinWithProvider(
        measureCtx,
        db,
        null,
        email,
        first,
        last,
        state.inviteId as any,
        socialKey,
        signUpDisabled
      )
    } else {
      loginInfo = await loginOrSignUpWithProvider(measureCtx, db, null, email, first, last, socialKey, signUpDisabled)
    }

    if (loginInfo === null) {
      measureCtx.info('Failed to auth: no associated account found', {
        email,
        type: providerType,
        user
      })
      return concatLink(branding?.front ?? frontUrl, '/login')
    } else {
      const origin = concatLink(branding?.front ?? frontUrl, '/login/auth')
      const query = encodeURIComponent(qs.stringify({ token: loginInfo.token }))

      // Successful authentication, redirect to your application
      measureCtx.info('Success auth, redirect', { email, type: providerType, target: origin })
      return `${origin}?${query}`
    }
  } catch (err: any) {
    measureCtx.error('failed to auth', { err, type: providerType, user })
    return ''
  }
}
