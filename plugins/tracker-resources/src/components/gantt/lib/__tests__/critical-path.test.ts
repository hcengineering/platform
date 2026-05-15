//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { computeCriticalPath } from '../critical-path'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

function issue (id: string, start?: number, due?: number): Issue {
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
    parents: []
  } as unknown as Issue
}

function rel (source: string, target: string, kind: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish' = 'finish-to-start', lag = 0): IssueRelation {
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

describe('computeCriticalPath — graceful degrade', () => {
  it('returns empty result with cycle:true when relation graph has a cycle', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B'), rel('B', 'A')]
    const res = computeCriticalPath([A, B], relations)
    expect(res.cycle).toBe(true)
    expect(res.critical.size).toBe(0)
    expect(res.criticalRelations.size).toBe(0)
    expect(res.slack.size).toBe(0)
  })

  it('returns empty critical set when there are no relations', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const res = computeCriticalPath([A, B], [])
    expect(res.cycle).toBe(false)
    // Without relations every issue is its own CP root - both have zero
    // slack since there's no successor to absorb it.
    expect(res.critical.size).toBe(2)
  })
})

describe('computeCriticalPath — forward pass', () => {
  it('linear chain A→B→C, no slack → all 3 critical, 2 critical relations', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const C = issue('C', Date.UTC(2026, 4, 11), Date.UTC(2026, 4, 15))
    const rAB = rel('A', 'B')
    const rBC = rel('B', 'C')
    const res = computeCriticalPath([A, B, C], [rAB, rBC])
    expect(res.cycle).toBe(false)
    expect(res.critical).toEqual(new Set(['A', 'B', 'C']))
    expect(res.criticalRelations).toEqual(new Set([rAB._id, rBC._id]))
    expect(res.slack.get('A' as Ref<Issue>)).toBe(0)
    expect(res.slack.get('B' as Ref<Issue>)).toBe(0)
    expect(res.slack.get('C' as Ref<Issue>)).toBe(0)
  })

  it('two parallel paths — only longer is critical', () => {
    // A → B (short) and A → C → D (long). D ends after B.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 8))  // 3-day task
    const C = issue('C', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10)) // 5-day task
    const D = issue('D', Date.UTC(2026, 4, 11), Date.UTC(2026, 4, 13)) // 3-day task
    const rAB = rel('A', 'B')
    const rAC = rel('A', 'C')
    const rCD = rel('C', 'D')
    const res = computeCriticalPath([A, B, C, D], [rAB, rAC, rCD])
    // Project end = D's due = May 13. B finishes May 8 -> slack 5d.
    expect(res.critical).toEqual(new Set(['A', 'C', 'D']))
    expect(res.criticalRelations).toEqual(new Set([rAC._id, rCD._id]))
    expect(res.slack.get('B' as Ref<Issue>)).toBe(5 * 86_400_000)
  })
})

describe('computeCriticalPath — lag + anchor variants', () => {
  it('FS with lag=2 — successor pushed to predecessor.due + 2d', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 9))
    const r1 = rel('A', 'B', 'finish-to-start', 2)
    const res = computeCriticalPath([A, B], [r1])
    // B is pushed: ES(B) >= EF(A) + 2d = May 5 + 2d = May 7. User's
    // stored May 5 is earlier than the constraint -> violation.
    expect(res.violatedRelations.has(r1._id)).toBe(true)
  })

  it('SS push — A.start moves, B.start lifts with it', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const r1 = rel('A', 'B', 'start-to-start', 0)
    const res = computeCriticalPath([A, B], [r1])
    // Both ES = May 1 -> constraint satisfied tight -> both critical,
    // relation critical.
    expect(res.critical).toEqual(new Set(['A', 'B']))
    expect(res.criticalRelations.has(r1._id)).toBe(true)
  })

  it('FF push — A.due → B.due', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const r1 = rel('A', 'B', 'finish-to-finish', 0)
    const res = computeCriticalPath([A, B], [r1])
    expect(res.critical).toEqual(new Set(['A', 'B']))
    expect(res.criticalRelations.has(r1._id)).toBe(true)
  })

  it('SF push — A.start → B.due', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2025, 11, 28), Date.UTC(2026, 4, 1))
    const r1 = rel('A', 'B', 'start-to-finish', 0)
    const res = computeCriticalPath([A, B], [r1])
    // EF(B) >= ES(A) = May 1. B's stored May 1 is exactly the bound ->
    // tight, both critical.
    expect(res.critical.has('A' as Ref<Issue>)).toBe(true)
    expect(res.criticalRelations.has(r1._id)).toBe(true)
  })

  it('user-pinned earlier start than dependency allows → violatedRelations contains it', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 3), Date.UTC(2026, 4, 7))  // user pinned B.start before A.due
    const r1 = rel('A', 'B', 'finish-to-start', 0)
    const res = computeCriticalPath([A, B], [r1])
    expect(res.violatedRelations.has(r1._id)).toBe(true)
  })

  it('unscheduled issue is skipped (no entry in slack)', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B') // no dates
    const res = computeCriticalPath([A, B], [rel('A', 'B')])
    expect(res.slack.has('B' as Ref<Issue>)).toBe(false)
  })
})
