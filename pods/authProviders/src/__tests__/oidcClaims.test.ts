//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// SPDX-License-Identifier: EPL-2.0
//
import { getOidcEmailCandidate, getTenantIdFromIssuer, getVerifiedOidcEmail, type OidcClaims } from '../oidcClaims'

const issuer = 'https://login.microsoftonline.com/tenant-id/v2.0'

describe('OIDC email claims', () => {
  test('links a normalized Entra email for the configured tenant when trust is enabled', () => {
    expect(
      getVerifiedOidcEmail({ email: '  User@Example.COM ', tid: 'TENANT-ID', iss: issuer }, undefined, {
        issuer,
        trustEmail: true
      })
    ).toEqual({ email: 'user@example.com', verified: true })
  })

  test.each<[OidcClaims, string]>([
    [{ email: 'user@example.com', tid: 'other-tenant', iss: issuer }, 'a different tenant'],
    [{ email: 'user@example.com', tid: 'tenant-id', iss: 'https://issuer.example.com' }, 'a different issuer'],
    [
      { email: 'user@example.com', tid: 'tenant-id', iss: issuer, preferred_username: 'user_example.com#EXT#@tenant.example.com' },
      'a B2B guest'
    ],
    [{ email: 'user@example.com', tid: 'tenant-id', iss: issuer, idp: 'https://sts.windows.net/home-tenant/' }, 'another identity provider'],
    [{ email: 'user@example.com', tid: 'tenant-id', iss: issuer, acct: 1 }, 'a guest account'],
    [
      {
        email: 'user@example.com',
        tid: 'tenant-id',
        iss: issuer,
        preferred_username: 'user@example.com',
        upn: 'user_example.com#EXT#@tenant.example.com'
      },
      'a guest with a plain preferred_username'
    ]
  ])('does not trust an email from %s', (claims) => {
    expect(getVerifiedOidcEmail(claims, undefined, { issuer, trustEmail: true })).toEqual({
      email: 'user@example.com',
      verified: false
    })
  })

  test('does not verify a userinfo email that is not an e-mail address', () => {
    expect(getVerifiedOidcEmail({}, { email: 'admin', email_verified: true }, { issuer })).toEqual({
      email: 'admin',
      verified: false
    })
  })

  test('ignores an email claim that is not an e-mail address', () => {
    expect(getVerifiedOidcEmail({ email: 'admin', email_verified: true }, undefined, { issuer })).toEqual({
      email: '',
      verified: false
    })
  })

  test('does not apply email_verified to a username fallback', () => {
    expect(
      getVerifiedOidcEmail({ preferred_username: 'user@example.com', email_verified: true }, undefined, { issuer })
    ).toEqual({ email: 'user@example.com', verified: false })
  })

  test('does not apply xms_edov to a username fallback', () => {
    expect(
      getVerifiedOidcEmail({ preferred_username: 'user@example.com', xms_edov: true }, undefined, { issuer })
    ).toEqual({ email: 'user@example.com', verified: false })
  })

  test('trusts an email when idp equals the issuer', () => {
    expect(
      getVerifiedOidcEmail({ email: 'user@example.com', tid: 'tenant-id', iss: issuer, idp: issuer }, undefined, {
        issuer,
        trustEmail: true
      })
    ).toEqual({ email: 'user@example.com', verified: true })
  })

  test('accepts xms_edov without tenant trust', () => {
    expect(getVerifiedOidcEmail({ email: 'user@example.com', xms_edov: true }, undefined, { issuer })).toEqual({
      email: 'user@example.com',
      verified: true
    })
  })

  test('accepts an explicit email_verified claim', () => {
    expect(getVerifiedOidcEmail({ email: 'user@example.com', email_verified: true }, undefined, { issuer })).toEqual({
      email: 'user@example.com',
      verified: true
    })
  })

  test('accepts a case-insensitive string email_verified claim', () => {
    expect(getVerifiedOidcEmail({ email: 'user@example.com', email_verified: 'TrUe' }, undefined, { issuer })).toEqual({
      email: 'user@example.com',
      verified: true
    })
  })

  test('does not use a non-email preferred username', () => {
    expect(getOidcEmailCandidate({ preferred_username: 'user-name' })).toBeUndefined()
  })

  test('rejects Entra guest UPN candidates', () => {
    expect(getOidcEmailCandidate({ email: 'user_gmail.com#EXT#@tenant.onmicrosoft.com' })).toBeUndefined()
    expect(getOidcEmailCandidate({ preferred_username: 'user_gmail.com#EXT#@tenant.onmicrosoft.com' })).toBeUndefined()
  })

  test('retains verified userinfo email fallback for other providers', () => {
    expect(getVerifiedOidcEmail({}, { email: ' User@Example.COM ', email_verified: true }, { issuer })).toEqual({
      email: 'user@example.com',
      verified: true
    })
  })

  test('uses a verified userinfo email when the ID-token email is not trusted', () => {
    expect(
      getVerifiedOidcEmail(
        { email: 'untrusted@example.com' },
        { email: ' User@Example.COM ', email_verified: true },
        { issuer }
      )
    ).toEqual({ email: 'user@example.com', verified: true })
  })

  test('parses only an Entra v2 issuer tenant', () => {
    expect(getTenantIdFromIssuer(issuer)).toBe('tenant-id')
    expect(getTenantIdFromIssuer('https://issuer.example.com/tenant-id/v2.0')).toBeUndefined()
  })
})
