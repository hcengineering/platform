//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { computeBulkDeltaBounds } from '../bulk-boundary'

const DAY_MS = 86_400_000

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

describe('computeBulkDeltaBounds', () => {
  it('returns unbounded for a single bar without predecessors', () => {
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const r = computeBulkDeltaBounds(new Set([B._id]), [B], [])
    expect(r.minDeltaMs).toBe(-Infinity)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('clamps to FS predecessor: cannot drag earlier than fsAnchor(predDue)', () => {
    // A finishes 2026-05-05, B starts 2026-05-10 → 5 days slack-to-pred.
    // fsAnchor with lag=0 (legacy) is predDue + DAY_MS → 2026-05-06.
    // B can move left by (B.start - fsAnchor) = 4 days = 4*DAY_MS.
    // → minDeltaMs = -4 days.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const r = computeBulkDeltaBounds(
      new Set([B._id]),
      [A, B],
      [rel('A', 'B', 'finish-to-start', 0)]
    )
    expect(r.minDeltaMs).toBe(-4 * DAY_MS)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('takes the tightest boundary across multiple members (hard-stop entire group)', () => {
    // A→B (FS, 0 lag), C→D (FS, 0 lag). B has 5 days slack (4 days move-left budget),
    // D has 2 days slack (1 day move-left budget). Group min = -1 day.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const C = issue('C', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const D = issue('D', Date.UTC(2026, 4, 7), Date.UTC(2026, 4, 12))
    const r = computeBulkDeltaBounds(
      new Set([B._id, D._id]),
      [A, B, C, D],
      [rel('A', 'B'), rel('C', 'D')]
    )
    expect(r.minDeltaMs).toBe(-1 * DAY_MS)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('ignores predecessors that are themselves group members (they move along)', () => {
    // A→B both in selection. A's FS-constraint on B no longer counts as a
    // hard stop because A is being dragged in lockstep.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const r = computeBulkDeltaBounds(
      new Set([A._id, B._id]),
      [A, B],
      [rel('A', 'B')]
    )
    // A has no predecessor; B's only predecessor (A) is a member → unbounded.
    expect(r.minDeltaMs).toBe(-Infinity)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('ignores predecessors without dates', () => {
    const A = issue('A') // unscheduled
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const r = computeBulkDeltaBounds(new Set([B._id]), [A, B], [rel('A', 'B')])
    expect(r.minDeltaMs).toBe(-Infinity)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('handles SS relations: clamps based on predStart vs memberStart', () => {
    // SS lag=0 → succStart >= predStart. B.start=2026-05-10, A.start=2026-05-05.
    // B can move left by 5 days. → minDelta = -5 days.
    const A = issue('A', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 8))
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const r = computeBulkDeltaBounds(
      new Set([B._id]),
      [A, B],
      [rel('A', 'B', 'start-to-start', 0)]
    )
    expect(r.minDeltaMs).toBe(-5 * DAY_MS)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('handles FF relations: clamps based on predDue vs memberDue', () => {
    // FF lag=0 → succDue >= predDue. A.due=2026-05-05, B.due=2026-05-14.
    // B can move left by 9 days. → minDelta = -9 days.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const r = computeBulkDeltaBounds(
      new Set([B._id]),
      [A, B],
      [rel('A', 'B', 'finish-to-finish', 0)]
    )
    expect(r.minDeltaMs).toBe(-9 * DAY_MS)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('returns unbounded on a cyclic relation graph (defensive bail-out)', () => {
    // A↔B cycle. The cycle-detection in simulateCascade refuses to run
    // cascade on a cyclic graph; we mirror that here by giving up the
    // boundary computation and letting the drag proceed unclamped — the
    // popup will surface the cycle error on commit.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const r = computeBulkDeltaBounds(
      new Set([B._id]),
      [A, B],
      [rel('A', 'B'), rel('B', 'A')]
    )
    expect(r.minDeltaMs).toBe(-Infinity)
    expect(r.maxDeltaMs).toBe(Infinity)
  })

  it('ignores members that themselves have no dates', () => {
    const B = issue('B') // unscheduled
    const r = computeBulkDeltaBounds(new Set([B._id]), [B], [])
    expect(r.minDeltaMs).toBe(-Infinity)
    expect(r.maxDeltaMs).toBe(Infinity)
  })
})
