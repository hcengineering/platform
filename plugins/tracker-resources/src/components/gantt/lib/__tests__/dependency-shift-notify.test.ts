//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { AccountUuid, Ref } from '@hcengineering/core'
import type { Issue, ShiftedIssuePayload } from '@hcengineering/tracker'
import {
  buildPayloadFromPrimary,
  buildPayloadFromShift,
  buildRecipientBundles,
  groupShiftsByRecipient
} from '../dependency-shift-notify'
import type { CascadeShift, PrimaryEdit } from '../types'

function issue (id: string, identifier: string, title: string, start: number | null, due: number | null): Issue {
  return {
    _id: id as Ref<Issue>,
    _class: 'tracker:class:Issue' as any,
    space: 'space:default' as any,
    modifiedOn: 0,
    modifiedBy: 'me' as any,
    createdOn: 0,
    createdBy: 'me' as any,
    identifier,
    title,
    startDate: start,
    dueDate: due,
    parents: []
  } as unknown as Issue
}

const A = issue('A', 'PROJ-1', 'Alpha', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
const B = issue('B', 'PROJ-2', 'Beta', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
const C = issue('C', 'PROJ-3', 'Gamma', Date.UTC(2026, 4, 11), Date.UTC(2026, 4, 15))
const D = issue('D', 'PROJ-4', 'Delta', null, null)

describe('buildPayloadFromPrimary', () => {
  it('uses dueDate-delta when both old and new due are set', () => {
    const pe: PrimaryEdit = { issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) }
    const payload = buildPayloadFromPrimary(pe)
    expect(payload.deltaMs).toBe(Date.UTC(2026, 4, 7) - Date.UTC(2026, 4, 5))
    expect(payload.identifier).toBe('PROJ-1')
    expect(payload.title).toBe('Alpha')
    expect(payload.oldDue).toBe(Date.UTC(2026, 4, 5))
    expect(payload.newDue).toBe(Date.UTC(2026, 4, 7))
  })

  it('falls back to startDate-delta when oldDue is unset', () => {
    const pe: PrimaryEdit = { issue: D, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 5) }
    const payload = buildPayloadFromPrimary(pe)
    // Both oldStart and oldDue are null on D, so the delta cannot be computed and stays at 0.
    expect(payload.deltaMs).toBe(0)
    expect(payload.oldStart).toBeNull()
    expect(payload.newStart).toBe(Date.UTC(2026, 4, 1))
  })

  it('reports a negative delta when the primary moves earlier', () => {
    const pe: PrimaryEdit = { issue: B, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) }
    const payload = buildPayloadFromPrimary(pe)
    expect(payload.deltaMs).toBe(Date.UTC(2026, 4, 7) - Date.UTC(2026, 4, 10))
    expect(payload.deltaMs).toBeLessThan(0)
  })
})

describe('buildPayloadFromShift', () => {
  it('honours working-days-adjusted oldDue/newDue when both are set', () => {
    const shift: CascadeShift = {
      issue: B,
      oldStart: Date.UTC(2026, 4, 6),
      oldDue: Date.UTC(2026, 4, 10),
      newStart: Date.UTC(2026, 4, 8),
      newDue: Date.UTC(2026, 4, 13), // weekend-skip → +3 calendar days
      reason: 'push-successor',
      triggeredBy: A._id
    }
    const payload = buildPayloadFromShift(shift)
    expect(payload.deltaMs).toBe(3 * 86_400_000)
    expect(payload.identifier).toBe('PROJ-2')
  })
})

describe('groupShiftsByRecipient', () => {
  const userA = 'user-a' as AccountUuid
  const userB = 'user-b' as AccountUuid
  const userC = 'user-c' as AccountUuid
  const trigger = userA

  it('produces one bundle per recipient when issues map to distinct collaborators', () => {
    const entries: ShiftedIssuePayload[] = [
      buildPayloadFromPrimary({ issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) }),
      buildPayloadFromPrimary({ issue: B, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }),
      buildPayloadFromPrimary({ issue: C, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) })
    ]
    const collab = new Map<Ref<Issue>, AccountUuid[]>([
      [A._id, [userB]],
      [B._id, [userC]],
      [C._id, [userB, userC]]
    ])
    const bundles = groupShiftsByRecipient(trigger, entries, collab)
    expect(bundles.size).toBe(2)
    expect(bundles.get(userB)?.length).toBe(2) // A + C
    expect(bundles.get(userC)?.length).toBe(2) // B + C
  })

  it('produces one bundle with N entries when N issues share a single recipient', () => {
    const entries: ShiftedIssuePayload[] = [A, B, C].map((i) =>
      buildPayloadFromPrimary({ issue: i, newStart: i.startDate! + 86400000, newDue: i.dueDate! + 86400000 })
    )
    const collab = new Map<Ref<Issue>, AccountUuid[]>([
      [A._id, [userB]],
      [B._id, [userB]],
      [C._id, [userB]]
    ])
    const bundles = groupShiftsByRecipient(trigger, entries, collab)
    expect(bundles.size).toBe(1)
    expect(bundles.get(userB)?.length).toBe(3)
  })

  it('self-suppresses the trigger user from every recipient bundle', () => {
    const entries: ShiftedIssuePayload[] = [
      buildPayloadFromPrimary({ issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) })
    ]
    const collab = new Map<Ref<Issue>, AccountUuid[]>([
      [A._id, [trigger, userB]]
    ])
    const bundles = groupShiftsByRecipient(trigger, entries, collab)
    expect(bundles.has(trigger)).toBe(false)
    expect(bundles.size).toBe(1)
    expect(bundles.get(userB)?.length).toBe(1)
  })

  it('deduplicates a recipient that appears twice in the same issue collaborator list', () => {
    const entries: ShiftedIssuePayload[] = [
      buildPayloadFromPrimary({ issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) })
    ]
    const collab = new Map<Ref<Issue>, AccountUuid[]>([[A._id, [userB, userB, userB]]])
    const bundles = groupShiftsByRecipient(trigger, entries, collab)
    expect(bundles.size).toBe(1)
    expect(bundles.get(userB)?.length).toBe(1)
  })

  it('skips entries with no collaborators (no bundle for nobody)', () => {
    const entries: ShiftedIssuePayload[] = [
      buildPayloadFromPrimary({ issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) })
    ]
    const collab = new Map<Ref<Issue>, AccountUuid[]>()
    const bundles = groupShiftsByRecipient(trigger, entries, collab)
    expect(bundles.size).toBe(0)
  })

  it('still emits a bundle when triggerUserId is undefined (no self-suppress filter)', () => {
    const entries: ShiftedIssuePayload[] = [
      buildPayloadFromPrimary({ issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) })
    ]
    const collab = new Map<Ref<Issue>, AccountUuid[]>([[A._id, [userA, userB]]])
    const bundles = groupShiftsByRecipient(undefined, entries, collab)
    expect(bundles.size).toBe(2)
    expect(bundles.get(userA)?.length).toBe(1)
    expect(bundles.get(userB)?.length).toBe(1)
  })
})

describe('buildRecipientBundles — end-to-end', () => {
  const userA = 'user-a' as AccountUuid
  const userB = 'user-b' as AccountUuid

  it('merges primary + shift entries in one pass and groups by recipient', () => {
    const primaries: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) }
    ]
    const shifts: CascadeShift[] = [
      {
        issue: B,
        oldStart: B.startDate!,
        oldDue: B.dueDate!,
        newStart: B.startDate! + 2 * 86400000,
        newDue: B.dueDate! + 2 * 86400000,
        reason: 'push-successor',
        triggeredBy: A._id
      },
      {
        issue: C,
        oldStart: C.startDate!,
        oldDue: C.dueDate!,
        newStart: C.startDate! + 86400000,
        newDue: C.dueDate! + 86400000,
        reason: 'push-successor',
        triggeredBy: B._id
      }
    ]
    const collab = new Map<Ref<Issue>, AccountUuid[]>([
      [A._id, [userA]], // trigger user, self-suppressed
      [B._id, [userB]],
      [C._id, [userB]]
    ])
    const bundles = buildRecipientBundles(userA, primaries, shifts, collab)
    expect(bundles.size).toBe(1)
    const bundle = bundles.get(userB)!
    expect(bundle.length).toBe(2)
    expect(bundle.map((b) => b.identifier).sort()).toEqual(['PROJ-2', 'PROJ-3'])
    expect(bundle[0].deltaMs).toBeGreaterThan(0)
  })

  it('produces zero bundles when only the trigger user has stake in any shift', () => {
    const primaries: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) }
    ]
    const collab = new Map<Ref<Issue>, AccountUuid[]>([[A._id, [userA]]])
    const bundles = buildRecipientBundles(userA, primaries, [], collab)
    expect(bundles.size).toBe(0)
  })
})
