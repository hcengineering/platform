//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// SPDX-License-Identifier: EPL-2.0
//
// Coverage for admin.ts hardening: both env-set (parseAdminEmails) AND
// lookup (isAdminEmail) must trim+lowercase. Today ADMIN_EMAILS is clean,
// but a future env value like " Admin@Example.com " would silently break
// admin detection without normalization on the env-side. Mongo backend
// already has this hardening (collections/mongo.ts:1141-1147); this test
// covers the equivalent for the shared helper.
//

import type * as AdminModuleType from '../admin'

type AdminModule = typeof AdminModuleType

/**
 * Re-import admin.ts with a controlled ADMIN_EMAILS env value.
 * admin.ts evaluates ADMIN_EMAILS at module-load, so each test scenario
 * needs an isolated module load.
 */
function loadAdmin (envValue: string | undefined): AdminModule {
  let mod: AdminModule | undefined
  jest.isolateModules(() => {
    if (envValue === undefined) {
      delete process.env.ADMIN_EMAILS
    } else {
      process.env.ADMIN_EMAILS = envValue
    }
    mod = jest.requireActual<AdminModule>('../admin')
  })
  if (mod === undefined) throw new Error('admin module did not load')
  return mod
}

describe('admin.ts — env parsing + lookup normalization', () => {
  const originalEnv = process.env.ADMIN_EMAILS

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.ADMIN_EMAILS
    } else {
      process.env.ADMIN_EMAILS = originalEnv
    }
  })

  test('1. whitespace tolerance — env entry with leading/trailing spaces', () => {
    const { isAdminEmail } = loadAdmin(' Admin@Example.com ')
    expect(isAdminEmail('admin@example.com')).toBe(true)
  })

  test('2. case-insensitive env — uppercase env entry matches lowercase lookup', () => {
    const { isAdminEmail } = loadAdmin('ADMIN@EXAMPLE.COM')
    expect(isAdminEmail('admin@example.com')).toBe(true)
  })

  test('3. case-insensitive lookup — lowercase env matches uppercase lookup input', () => {
    const { isAdminEmail } = loadAdmin('admin@example.com')
    expect(isAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true)
  })

  test('4. L-AUTH-3: no-@ entries are DROPPED by default (fail-closed) + warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const prevFlag = process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
    delete process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
    try {
      const { isAdminEmail } = loadAdmin('foo,bar@@,baz')
      // No-@ entries dropped; only the '@'-bearing entry survives.
      expect(isAdminEmail('foo')).toBe(false)
      expect(isAdminEmail('baz')).toBe(false)
      expect(isAdminEmail('bar@@')).toBe(true)
      expect(warnSpy).toHaveBeenCalledWith('ADMIN_EMAILS contains entries without "@" (DROPPED)', {
        entries: ['foo', 'baz']
      })
    } finally {
      warnSpy.mockRestore()
      if (prevFlag === undefined) delete process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
      else process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID = prevFlag
    }
  })

  test('4b. L-AUTH-3: injected logger sees DROPPED no-@ entries by default', () => {
    // Direct parseAdminEmails call with custom logger — proves the
    // injection point works (admin.ts has no MeasureContext at load time).
    const prevFlag = process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
    delete process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
    try {
      const { parseAdminEmails } = loadAdmin('')
      const warn = jest.fn()
      const set = parseAdminEmails('foo,alice@example.com,baz', { warn })
      expect(set.has('foo')).toBe(false)
      expect(set.has('alice@example.com')).toBe(true)
      expect(set.has('baz')).toBe(false)
      expect(set.size).toBe(1)
      expect(warn).toHaveBeenCalledWith('ADMIN_EMAILS contains entries without "@" (DROPPED)', {
        entries: ['foo', 'baz']
      })
    } finally {
      if (prevFlag === undefined) delete process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
      else process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID = prevFlag
    }
  })

  test('4c. L-AUTH-3: no-@ entries kept when ADMIN_EMAILS_ALLOW_LOGIN_ID=true (opt-in)', () => {
    const prevFlag = process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
    process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID = 'true'
    try {
      const { parseAdminEmails } = loadAdmin('')
      const warn = jest.fn()
      const set = parseAdminEmails('foo,alice@example.com,baz', { warn })
      expect(set.has('foo')).toBe(true)
      expect(set.has('alice@example.com')).toBe(true)
      expect(set.has('baz')).toBe(true)
      expect(set.size).toBe(3)
      expect(warn).toHaveBeenCalledWith(
        'ADMIN_EMAILS contains entries without "@" (kept (ADMIN_EMAILS_ALLOW_LOGIN_ID=true))',
        { entries: ['foo', 'baz'] }
      )
    } finally {
      if (prevFlag === undefined) delete process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID
      else process.env.ADMIN_EMAILS_ALLOW_LOGIN_ID = prevFlag
    }
  })

  test('5. empty env string — empty set, all lookups return false', () => {
    const { isAdminEmail } = loadAdmin('')
    expect(isAdminEmail('admin@example.com')).toBe(false)
    expect(isAdminEmail('')).toBe(false)
  })

  test('6. unset env — empty set, all lookups return false', () => {
    const { isAdminEmail } = loadAdmin(undefined)
    expect(isAdminEmail('admin@example.com')).toBe(false)
  })

  test('7. multiple entries with mixed whitespace + case all normalized', () => {
    const { isAdminEmail } = loadAdmin('alice@example.com, bob@example.org , Carol@example.io')
    expect(isAdminEmail('alice@example.com')).toBe(true)
    expect(isAdminEmail('bob@example.org')).toBe(true)
    expect(isAdminEmail('carol@example.io')).toBe(true)
    // Lookup also normalizes
    expect(isAdminEmail('  Bob@Example.ORG  ')).toBe(true)
  })

  test('8. null/undefined lookup input — return false (no throw)', () => {
    const { isAdminEmail } = loadAdmin('admin@example.com')
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
