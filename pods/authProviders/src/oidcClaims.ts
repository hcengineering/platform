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

export type OidcClaims = Record<string, unknown>

export interface OidcEmail {
  email: string
  verified: boolean
}

export interface OidcEmailOptions {
  issuer?: string
  trustEmail?: boolean
}

function getStringClaim (claims: OidcClaims | undefined, name: string): string | undefined {
  const value = claims?.[name]
  return typeof value === 'string' ? value : undefined
}

function normalizeEmail (value: string | undefined): string | undefined {
  const email = value?.trim().toLowerCase()
  return email === '' || email == null ? undefined : email
}

function isVerifiedEmailClaim (value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.toLowerCase() === 'true')
}

function isEmail (value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function getOidcEmailCandidate (claims: OidcClaims | undefined): string | undefined {
  const emailClaim = normalizeEmail(getStringClaim(claims, 'email'))
  if (emailClaim !== undefined) return !emailClaim.includes('#') && isEmail(emailClaim) ? emailClaim : undefined

  const preferredUsername = normalizeEmail(getStringClaim(claims, 'preferred_username'))
  return preferredUsername !== undefined && !preferredUsername.includes('#') && isEmail(preferredUsername)
    ? preferredUsername
    : undefined
}

export function getTenantIdFromIssuer (issuer: string | undefined): string | undefined {
  if (issuer == null) return undefined

  try {
    const url = new URL(issuer)
    const path = url.pathname.split('/').filter((part) => part !== '')
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'login.microsoftonline.com' ||
      path.length !== 2 ||
      path[1] !== 'v2.0'
    ) {
      return undefined
    }

    return path[0].toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * Entra B2B guests and accounts from other identity providers carry an `email`
 * claim that their home directory controls, so it must not be trusted on the
 * strength of this tenant's issuer and `tid` alone.
 */
export function isExternalEntraUser (claims: OidcClaims | undefined): boolean {
  const usernames = [getStringClaim(claims, 'preferred_username'), getStringClaim(claims, 'upn')]
  if (usernames.some((name) => name?.toLowerCase().includes('#ext#') === true)) return true
  const idp = getStringClaim(claims, 'idp')
  if (idp !== undefined && idp !== getStringClaim(claims, 'iss')) return true
  const acct = claims?.acct
  return acct === 1 || acct === '1'
}

export function isTrustedOidcEmail (
  claims: OidcClaims | undefined,
  { issuer, trustEmail = false }: OidcEmailOptions
): boolean {
  // email_verified and xms_edov vouch for the `email` claim only, never for a
  // preferred_username fallback.
  const email = normalizeEmail(getStringClaim(claims, 'email'))
  const hasEmailClaim = email !== undefined && isEmail(email)
  if (hasEmailClaim && (isVerifiedEmailClaim(claims?.email_verified) || claims?.xms_edov === true)) return true
  if (!trustEmail || issuer == null || claims?.iss !== issuer || isExternalEntraUser(claims)) return false

  const expectedTenantId = getTenantIdFromIssuer(issuer)
  const tenantId = getStringClaim(claims, 'tid')
  return expectedTenantId !== undefined && tenantId?.toLowerCase() === expectedTenantId
}

/**
 * Selects a verified email for account linking. A trusted ID-token email takes
 * precedence; otherwise, a verified userinfo email remains a fallback.
 */
export function getVerifiedOidcEmail (
  claims: OidcClaims | undefined,
  userinfo: OidcClaims | undefined,
  options: OidcEmailOptions
): OidcEmail {
  const idTokenEmail = getOidcEmailCandidate(claims)
  if (idTokenEmail !== undefined && isTrustedOidcEmail(claims, options)) {
    return { email: idTokenEmail, verified: true }
  }

  const userinfoEmail = normalizeEmail(getStringClaim(userinfo, 'email'))
  if (
    userinfoEmail !== undefined &&
    isEmail(userinfoEmail) &&
    !userinfoEmail.includes('#') &&
    isVerifiedEmailClaim(userinfo?.email_verified)
  ) {
    return { email: userinfoEmail, verified: true }
  }

  return { email: idTokenEmail ?? userinfoEmail ?? '', verified: false }
}
