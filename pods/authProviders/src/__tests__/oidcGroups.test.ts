//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// SPDX-License-Identifier: EPL-2.0
//
import { evaluateGroupAccess, parseAllowedGroups } from '../oidcGroups'

describe('OIDC group allowlist', () => {
  test('allows a member with case-insensitive, trimmed names', () => {
    expect(evaluateGroupAccess({ groups: ['  engineering '] }, ' Sales, ENGINEERING ')).toBe('allowed')
  })

  test('allows an Entra group object ID', () => {
    expect(
      evaluateGroupAccess({ groups: ['A0B1C2D3-0000-4000-8000-123456789ABC'] }, 'a0b1c2d3-0000-4000-8000-123456789abc')
    ).toBe('allowed')
  })

  test('denies a non-member', () => {
    expect(evaluateGroupAccess({ groups: ['engineering'] }, 'sales')).toBe('denied')
  })

  test('fails closed when the groups claim is absent', () => {
    expect(evaluateGroupAccess({ sub: 'subject' }, 'engineering')).toBe('missing')
  })

  test.each([{ _claim_names: { groups: 'src1' } }, { _claim_sources: { src1: {} } }, { hasgroups: true }])(
    'fails closed for group overage claims',
    (claims) => {
      expect(evaluateGroupAccess(claims, 'engineering')).toBe('overage')
    }
  )

  test('keeps the existing behavior for an empty allowlist', () => {
    expect(evaluateGroupAccess(undefined, ' , ')).toBe('allowed')
    expect(parseAllowedGroups(' Sales, sales, ')).toEqual(['sales'])
  })
})
