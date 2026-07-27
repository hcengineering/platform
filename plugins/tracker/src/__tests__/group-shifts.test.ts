//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { AccountUuid, Ref } from '@hcengineering/core'
import { groupShiftsByRecipient } from '../index'
import type { Issue, ShiftedIssuePayload } from '../index'

function payload (issueId: string): ShiftedIssuePayload {
  return {
    issueId: issueId as Ref<Issue>,
    identifier: issueId,
    title: issueId
  }
}

const A = 'acc-a' as AccountUuid
const B = 'acc-b' as AccountUuid
const TRIGGER = 'trigger-user' as AccountUuid

describe('groupShiftsByRecipient (shared pure logic)', () => {
  it('self-suppresses the trigger user across every bundle', () => {
    const collab = new Map<Ref<Issue>, AccountUuid[]>([['iss1' as Ref<Issue>, [TRIGGER, A]]])
    const bundles = groupShiftsByRecipient(TRIGGER, [payload('iss1')], collab)
    expect(bundles.has(TRIGGER)).toBe(false)
    expect(bundles.get(A)).toHaveLength(1)
  })

  it('routes each shift to all non-trigger collaborators, de-duplicated per entry', () => {
    const collab = new Map<Ref<Issue>, AccountUuid[]>([['iss1' as Ref<Issue>, [A, B, A]]])
    const bundles = groupShiftsByRecipient(TRIGGER, [payload('iss1')], collab)
    expect(bundles.get(A)).toHaveLength(1)
    expect(bundles.get(B)).toHaveLength(1)
  })

  it('accumulates multiple shifted issues into one bundle per recipient', () => {
    const collab = new Map<Ref<Issue>, AccountUuid[]>([
      ['iss1' as Ref<Issue>, [A]],
      ['iss2' as Ref<Issue>, [A]]
    ])
    const bundles = groupShiftsByRecipient(TRIGGER, [payload('iss1'), payload('iss2')], collab)
    expect(bundles.get(A)).toHaveLength(2)
  })

  it('emits nothing when the only collaborator is the trigger user', () => {
    const collab = new Map<Ref<Issue>, AccountUuid[]>([['iss1' as Ref<Issue>, [TRIGGER]]])
    const bundles = groupShiftsByRecipient(TRIGGER, [payload('iss1')], collab)
    expect(bundles.size).toBe(0)
  })
})
