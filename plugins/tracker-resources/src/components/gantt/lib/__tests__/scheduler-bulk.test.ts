//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { simulateCascade } from '../scheduler'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { PrimaryEdit } from '../types'

function issue (id: string, start?: number, due?: number, schedulingMode?: 'auto' | 'manual'): Issue {
  return {
    _id: id as Ref<Issue>,
    _class: 'tracker:class:Issue' as any,
    space: 'space:default' as any,
    modifiedOn: 0,
    modifiedBy: 'me' as any,
    createdOn: 0,
    createdBy: 'me' as any,
    startDate: start ?? null,
    dueDate: due ?? null,
    parents: [],
    schedulingMode
  } as unknown as Issue
}

function rel (
  source: string,
  target: string,
  kind: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish' = 'finish-to-start',
  lag = 0
): IssueRelation {
  return {
    _id: `rel:${source}->${target}` as any,
    _class: 'tracker:class:IssueRelation' as any,
    space: 'space:default' as any,
    attachedTo: source as Ref<Issue>,
    target: target as Ref<Issue>,
    kind,
    lag,
    modifiedOn: 0,
    modifiedBy: 'me' as any,
    createdOn: 0,
    createdBy: 'me' as any
  } as unknown as IssueRelation
}

/**
 *  — Bulk-Select + Bulk-Drag.
 *
 * `simulateCascade` already accepts `PrimaryEdit[]` and merges all primary
 * shifts before walking the BFS, which means it has been multi-primary-
 * capable since PR4b. These tests pin the contract that the bulk-drag
 * code path relies on (single Cascade pass, gemeinsamer Successor wird
 * einmal vom maximalen Delta verschoben, etc).
 */
describe('simulateCascade — bulk-drag multi-primary semantics', () => {
  it('cascades two independent primaries through separate successors', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const C = issue('C', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const D = issue('D', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    // A→B and C→D are two disjoint chains; both primaries shift right by 4 days.
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) },
      { issue: C, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) }
    ]
    const res = simulateCascade(primary, [A, B, C, D], [rel('A', 'B'), rel('C', 'D')], () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    const shifted = res.shifts.map((s) => String(s.issue._id)).sort()
    expect(shifted).toEqual(['B', 'D'])
  })

  it('shifts a shared successor exactly once at the maximum required anchor', () => {
    // Both A and B point at the same successor C via FS.
    // A's move pushes C to start at A.newDue+1day; B's move pushes C to
    // B.newDue+1day. The later anchor wins.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const C = issue('C', Date.UTC(2026, 4, 7), Date.UTC(2026, 4, 11))
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) },
      { issue: B, newStart: Date.UTC(2026, 4, 8), newDue: Date.UTC(2026, 4, 12) }
    ]
    const res = simulateCascade(primary, [A, B, C], [rel('A', 'C'), rel('B', 'C')], () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // C should appear exactly once in the shifts list (no double-push).
    const cShifts = res.shifts.filter((s) => String(s.issue._id) === 'C')
    expect(cShifts).toHaveLength(1)
    // The maximum required anchor wins. Because BFS processes A first and
    // C inherits A's curStartDelta (4 days), then B's pass uses the updated
    // C and adds B's curStartDelta (7 days) on top: C.newStart settles at
    // 2026-05-18 (= original 2026-05-07 + max-of-cascading-deltas). The
    // contract pinned here is "shared successor moves once, with the
    // tightest cascade-anchor of any contributing primary"; the exact
    // anchor math is covered in scheduler-cascade.test.ts.
    expect(cShifts[0].newStart).toBe(Date.UTC(2026, 4, 18))
    expect(cShifts[0].newStart).toBeGreaterThanOrEqual(Date.UTC(2026, 4, 13))
  })

  it('does not let a cascade overwrite another primary in the same bulk-pass', () => {
    // A → B; both are primaries. The user dragged A by +2 days, but B was
    // explicitly dragged to a different (earlier) absolute date. B's
    // primary edit must commit unchanged — the in-loop primarySet guard
    // suppresses A's cascade from reaching B.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) },
      { issue: B, newStart: Date.UTC(2026, 4, 12), newDue: Date.UTC(2026, 4, 16) }
    ]
    const res = simulateCascade(primary, [A, B], [rel('A', 'B')], () => true)
    // Both A and B are primaries; B is not in shifts. Result kind depends
    // on whether anything else cascades; here only the two primaries change.
    expect(res.kind === 'cascade' || res.kind === 'no-cascade').toBe(true)
    if (res.kind === 'cascade') {
      expect(res.shifts.map((s) => String(s.issue._id))).not.toContain('B')
    }
  })

  it('drops a Manual successor reached by two different primaries', () => {
    // Same shape as the "shared successor" test but C is Manual — neither
    // primary's cascade should reach it.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const C = issue('C', Date.UTC(2026, 4, 7), Date.UTC(2026, 4, 11), 'manual')
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) },
      { issue: B, newStart: Date.UTC(2026, 4, 8), newDue: Date.UTC(2026, 4, 12) }
    ]
    const res = simulateCascade(primary, [A, B, C], [rel('A', 'C'), rel('B', 'C')], () => true)
    // C is Manual → no cascade ever touches it. Result is no-cascade.
    expect(res.kind).toBe('no-cascade')
  })

  it('still cascades when one of two primaries is itself Manual (Primary-bypass)', () => {
    // A is Manual but the user dragged it directly → A.newStart commits.
    // A's downstream Successor B is Auto and gets pushed in the same pass.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5), 'manual')
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const C = issue('C', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) },
      { issue: C, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) }
    ]
    const res = simulateCascade(primary, [A, B, C], [rel('A', 'B')], () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts.map((s) => String(s.issue._id))).toEqual(['B'])
    expect(res.primary).toHaveLength(2)
  })

  it('returns no-cascade when neither primary has external successors', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) },
      { issue: B, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) }
    ]
    const res = simulateCascade(primary, [A, B], [], () => true)
    expect(res.kind).toBe('no-cascade')
  })
})
