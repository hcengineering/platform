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
// but a future env value like " Michael@Uray.io " would silently break
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
    const { isAdminEmail } = loadAdmin(' Michael@Uray.io ')
    expect(isAdminEmail('michael@uray.io')).toBe(true)
  })

  test('2. case-insensitive env — uppercase env entry matches lowercase lookup', () => {
    const { isAdminEmail } = loadAdmin('MICHAEL@URAY.IO')
    expect(isAdminEmail('michael@uray.io')).toBe(true)
  })

  test('3. case-insensitive lookup — lowercase env matches uppercase lookup input', () => {
    const { isAdminEmail } = loadAdmin('michael@uray.io')
    expect(isAdminEmail('MICHAEL@URAY.IO')).toBe(true)
  })

  test('4. invalid-shape entries WARN (not reject) — no-@ entries kept for backwards compatibility', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { isAdminEmail } = loadAdmin('foo,bar@@,baz')
      // All entries kept; warn lists no-@ entries
      expect(isAdminEmail('foo')).toBe(true)
      expect(isAdminEmail('baz')).toBe(true)
      expect(isAdminEmail('bar@@')).toBe(true)
      expect(warnSpy).toHaveBeenCalledWith(
        'ADMIN_EMAILS contains entries without "@" (kept for backwards compatibility)',
        { entries: ['foo', 'baz'] }
      )
    } finally {
      warnSpy.mockRestore()
    }
  })

  test('4b. invalid-shape WARN via injected logger — all entries kept', () => {
    // Direct parseAdminEmails call with custom logger — proves the
    // injection point works (admin.ts has no MeasureContext at load time).
    const { parseAdminEmails } = loadAdmin('')
    const warn = jest.fn()
    const set = parseAdminEmails('foo,alice@example.com,baz', { warn })
    expect(set.has('foo')).toBe(true)
    expect(set.has('alice@example.com')).toBe(true)
    expect(set.has('baz')).toBe(true)
    expect(set.size).toBe(3)
    expect(warn).toHaveBeenCalledWith(
      'ADMIN_EMAILS contains entries without "@" (kept for backwards compatibility)',
      { entries: ['foo', 'baz'] }
    )
  })

  test('5. empty env string — empty set, all lookups return false', () => {
    const { isAdminEmail } = loadAdmin('')
    expect(isAdminEmail('michael@uray.io')).toBe(false)
    expect(isAdminEmail('')).toBe(false)
  })

  test('6. unset env — empty set, all lookups return false', () => {
    const { isAdminEmail } = loadAdmin(undefined)
    expect(isAdminEmail('michael@uray.io')).toBe(false)
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
