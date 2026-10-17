//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type MeasureContext } from '@hcengineering/core'

import { getOidcEmailCandidate, getVerifiedOidcEmail, type OidcClaims } from './oidcClaims'
import { evaluateGroupAccess, parseAllowedGroups } from './oidcGroups'

export interface OpenidUser extends Record<string, unknown> {
  _idClaims?: OidcClaims
}

export type Authenticate = (email: string | undefined, signUpDisabled: boolean) => Promise<string>

export async function authorizeOpenidUser (
  measureCtx: MeasureContext,
  user: OpenidUser,
  issuer: string,
  signUpDisabled: boolean | undefined,
  authenticate: Authenticate
): Promise<string> {
  const claims = user._idClaims
  const allowedGroups = process.env.OPENID_ALLOWED_GROUPS
  const groupAccess = evaluateGroupAccess(claims, allowedGroups)
  const candidateEmail = getOidcEmailCandidate(claims)
  const sub = typeof claims?.sub === 'string' ? claims.sub : typeof user.sub === 'string' ? user.sub : undefined

  if (groupAccess !== 'allowed') {
    const event =
      groupAccess === 'overage'
        ? 'oidc_groups_overage'
        : groupAccess === 'missing'
          ? 'oidc_groups_missing'
          : 'oidc_groups_not_allowed'
    measureCtx.info(event, { sub, email: candidateEmail })
    return '/login?oidcError=group_not_allowed'
  }

  const email = getVerifiedOidcEmail(claims, user, {
    issuer,
    trustEmail: process.env.OPENID_TRUST_EMAIL === 'true'
  })
  const allowSignup =
    process.env.OPENID_SIGNUP_FOR_ALLOWED_GROUPS === 'true' && parseAllowedGroups(allowedGroups).length > 0

  return await authenticate(email.verified ? email.email : '', allowSignup ? false : signUpDisabled === true)
}
