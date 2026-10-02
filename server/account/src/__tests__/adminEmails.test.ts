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
// lookup (isAdminEmail) must trim+lowercase, empty entries (in any position)
// must never make an empty email an admin, and entries without "@" must stay
// admins by default (existing deployments use ADMIN_EMAILS=admin,...) unless
// ADMIN_EMAILS_STRICT=true opts into dropping them.
//

import type * as AdminModuleType from '../admin'

type AdminModule = typeof AdminModuleType

const KEPT_MSG =
  'ADMIN_EMAILS: entries without "@" kept for backwards compatibility; set ADMIN_EMAILS_STRICT=true to drop them'
const DROPPED_MSG = 'ADMIN_EMAILS: entries without "@" dropped (ADMIN_EMAILS_STRICT=true)'

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
  let savedAdminEmails: string | undefined
  let savedStrict: string | undefined
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    // No test may depend on the outer environment.
    savedAdminEmails = process.env.ADMIN_EMAILS
    savedStrict = process.env.ADMIN_EMAILS_STRICT
    delete process.env.ADMIN_EMAILS
    delete process.env.ADMIN_EMAILS_STRICT
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    if (savedAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS
    } else {
      process.env.ADMIN_EMAILS = savedAdminEmails
    }
    if (savedStrict === undefined) {
      delete process.env.ADMIN_EMAILS_STRICT
    } else {
      process.env.ADMIN_EMAILS_STRICT = savedStrict
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

  test('4. no-@ entries are KEPT by default (backwards compatible) + warn', () => {
    const { isAdminEmail } = loadAdmin('foo,bar@@,baz')
    expect(isAdminEmail('foo')).toBe(true)
    expect(isAdminEmail('baz')).toBe(true)
    expect(isAdminEmail('bar@@')).toBe(true)
    expect(warnSpy).toHaveBeenCalledWith(KEPT_MSG, { entries: ['foo', 'baz'] })
  })

  test('4a. ADMIN_EMAILS=admin,<email> keeps the login-id admin (dev/tests compose default)', () => {
    const { isAdminEmail } = loadAdmin('admin,ops@example.com')
    expect(isAdminEmail('admin')).toBe(true)
    expect(isAdminEmail('ops@example.com')).toBe(true)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(KEPT_MSG, { entries: ['admin'] })
  })

  test('4b. injected logger sees kept no-@ entries by default', () => {
    // Direct parseAdminEmails call with custom logger — proves the
    // injection point works (admin.ts has no MeasureContext at load time).
    const { parseAdminEmails } = loadAdmin('')
    const warn = jest.fn()
    const set = parseAdminEmails('foo,alice@example.com,baz', { warn })
    expect(set.has('foo')).toBe(true)
    expect(set.has('alice@example.com')).toBe(true)
    expect(set.has('baz')).toBe(true)
    expect(set.size).toBe(3)
    expect(warn).toHaveBeenCalledWith(KEPT_MSG, { entries: ['foo', 'baz'] })
  })

  test('4c. ADMIN_EMAILS_STRICT=true drops no-@ entries (opt-in, fail-closed) + warn', () => {
    process.env.ADMIN_EMAILS_STRICT = 'true'
    const { parseAdminEmails } = loadAdmin('')
    const warn = jest.fn()
    const set = parseAdminEmails('foo,alice@example.com,baz', { warn })
    expect(set.has('foo')).toBe(false)
    expect(set.has('alice@example.com')).toBe(true)
    expect(set.has('baz')).toBe(false)
    expect(set.size).toBe(1)
    expect(warn).toHaveBeenCalledWith(DROPPED_MSG, { entries: ['foo', 'baz'] })
  })

  test('4d. ADMIN_EMAILS_STRICT=true at module load: login-id admin is no longer admin', () => {
    process.env.ADMIN_EMAILS_STRICT = 'true'
    const { isAdminEmail } = loadAdmin('admin,ops@example.com')
    expect(isAdminEmail('admin')).toBe(false)
    expect(isAdminEmail('ops@example.com')).toBe(true)
    expect(warnSpy).toHaveBeenCalledWith(DROPPED_MSG, { entries: ['admin'] })
  })

  test.each(['false', 'TRUE', '1', ''])(
    '4e. ADMIN_EMAILS_STRICT=%p (anything but "true") keeps no-@ entries',
    (value) => {
      process.env.ADMIN_EMAILS_STRICT = value
      const { parseAdminEmails, isAdminEmail } = loadAdmin('admin,alice@example.com')
      expect(isAdminEmail('admin')).toBe(true)
      const warn = jest.fn()
      const set = parseAdminEmails('admin,alice@example.com', { warn })
      expect(set.has('admin')).toBe(true)
      expect(set.size).toBe(2)
      expect(warn).toHaveBeenCalledWith(KEPT_MSG, { entries: ['admin'] })
    }
  )

  test('4f. only "@" entries — no warning at all', () => {
    const { parseAdminEmails } = loadAdmin('')
    const warn = jest.fn()
    const set = parseAdminEmails('alice@example.com, bob@example.org', { warn })
    expect(set.size).toBe(2)
    expect(warn).not.toHaveBeenCalled()
  })

  test('5. empty env string — empty set, all lookups return false', () => {
    // Old code: ''.split(',') === [''], so isAdminEmail('') was true.
    const { isAdminEmail } = loadAdmin('')
    expect(isAdminEmail('admin@example.com')).toBe(false)
    expect(isAdminEmail('')).toBe(false)
  })

  test.each([',admin', 'admin,', 'admin,,ops@example.com', 'admin, ,ops@example.com'])(
    '5a. empty entry in %p is dropped — an empty email is never admin, admin stays admin',
    (envValue) => {
      // Old code kept '' from any empty split entry, so isAdminEmail('') was
      // true and a provider login without an email got an admin token.
      const { isAdminEmail, parseAdminEmails } = loadAdmin(envValue)
      expect(isAdminEmail('')).toBe(false)
      expect(isAdminEmail('   ')).toBe(false)
      expect(isAdminEmail('admin')).toBe(true)
      expect(parseAdminEmails(envValue, { warn: jest.fn() }).has('')).toBe(false)
    }
  )

  test('6. unset env — empty set, all lookups return false', () => {
    const { isAdminEmail } = loadAdmin(undefined)
    expect(isAdminEmail('admin@example.com')).toBe(false)
    expect(isAdminEmail('')).toBe(false)
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
