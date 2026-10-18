//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { getIssueIdentifierPrefix } from '../issueIdentifier'

describe('getIssueIdentifierPrefix', () => {
  it('returns the project identifier of an issue identifier', () => {
    expect(getIssueIdentifierPrefix('TSK-999')).toBe('TSK')
    expect(getIssueIdentifierPrefix('HULY2-1')).toBe('HULY2')
  })

  it('splits on the last dash', () => {
    expect(getIssueIdentifierPrefix('MY-PRJ-42')).toBe('MY-PRJ')
  })

  it('returns undefined for values that are not issue identifiers', () => {
    expect(getIssueIdentifierPrefix('TSK')).toBeUndefined()
    expect(getIssueIdentifierPrefix('TSK-')).toBeUndefined()
    expect(getIssueIdentifierPrefix('-12')).toBeUndefined()
    expect(getIssueIdentifierPrefix('TSK-12a')).toBeUndefined()
    expect(getIssueIdentifierPrefix('T SK-12')).toBeUndefined()
  })
})
