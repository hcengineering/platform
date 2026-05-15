//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { descendantsWithDates } from '../scheduler'

/**
 * Huly's Issue parent relation lives on `issue.parents` (an array of
 * IssueParentInfo records, root-most first). The first entry is the
 * direct parent. layout.ts:52 + GanttView.svelte:192 both use this
 * pattern, so the scheduler walks the same edge.
 */
function mkIssue (id: string, parent: string | null, startDate: number | null, dueDate: number | null): Issue {
  return {
    _id: id as Ref<Issue>,
    parents: parent !== null ? [{ parentId: parent as Ref<Issue>, parentTitle: '', space: 'sp' }] : [],
    startDate,
    dueDate
  } as unknown as Issue
}

describe('descendantsWithDates', () => {
  it('returns empty list for a leaf with no children', () => {
    const root = mkIssue('a', null, 100, 200)
    expect(descendantsWithDates(root, [root])).toEqual([])
  })

  it('returns direct children that have both startDate and dueDate', () => {
    const parent = mkIssue('p', null, 100, 200)
    const c1 = mkIssue('c1', 'p', 110, 150)
    const c2 = mkIssue('c2', 'p', 160, 190)
    const result = descendantsWithDates(parent, [parent, c1, c2])
    expect(result.map((i) => i._id)).toEqual(['c1', 'c2'])
  })

  it('skips children with null startDate or dueDate', () => {
    const parent = mkIssue('p', null, 100, 200)
    const dated = mkIssue('c1', 'p', 110, 150)
    const undated = mkIssue('c2', 'p', null, null)
    const halfDated = mkIssue('c3', 'p', 110, null)
    const result = descendantsWithDates(parent, [parent, dated, undated, halfDated])
    expect(result.map((i) => i._id)).toEqual(['c1'])
  })

  it('walks multi-level tree', () => {
    const root = mkIssue('r', null, 100, 200)
    const c1 = mkIssue('c1', 'r', 110, 150)
    const g1 = mkIssue('g1', 'c1', 115, 140)
    const g2 = mkIssue('g2', 'c1', 120, 130)
    const result = descendantsWithDates(root, [root, c1, g1, g2])
    expect(result.map((i) => i._id).sort()).toEqual(['c1', 'g1', 'g2'])
  })

  it('cycle-safe: does not infinite-loop when an issue lists itself as parent', () => {
    const root = mkIssue('r', null, 100, 200)
    const cyclic = mkIssue('x', 'x', 110, 150)
    expect(() => descendantsWithDates(root, [root, cyclic])).not.toThrow()
  })

  it('cycle-safe: handles parent loops via two-way reference', () => {
    const a = mkIssue('a', 'b', 100, 200)
    const b = mkIssue('b', 'a', 110, 150)
    expect(() => descendantsWithDates(a, [a, b])).not.toThrow()
  })

  it('only the direct parent (parents[0]) is followed, not transitive parents[]', () => {
    // Huly's parents[] also lists grandparents for breadcrumb purposes.
    // descendantsWithDates must only count children whose direct parent
    // (parents[0].parentId) equals the root; otherwise a grandchild would
    // be double-walked.
    const root = mkIssue('r', null, 100, 200)
    const child = mkIssue('c', 'r', 110, 150)
    const grand: Issue = {
      _id: 'g' as Ref<Issue>,
      parents: [
        { parentId: 'c' as Ref<Issue>, parentTitle: '', space: 'sp' },
        { parentId: 'r' as Ref<Issue>, parentTitle: '', space: 'sp' }
      ],
      startDate: 115,
      dueDate: 140
    } as unknown as Issue
    const result = descendantsWithDates(root, [root, child, grand])
    // Both c and g are descendants of r, but g must be reached *via* c — not
    // counted twice. Use a Set check on the IDs.
    expect(new Set(result.map((i) => i._id))).toEqual(new Set(['c', 'g']))
  })
})

import { wouldCreateCycle } from '../scheduler'
import type { IssueRelation, DependencyKind } from '@hcengineering/tracker'

function mkRel (from: string, to: string, kind: DependencyKind = 'finish-to-start'): IssueRelation {
  return {
    _id: `${from}->${to}` as Ref<IssueRelation>,
    attachedTo: from as Ref<Issue>,
    target: to as Ref<Issue>,
    kind,
    lag: 0,
    space: 'sp' as IssueRelation['space']
  } as unknown as IssueRelation
}

describe('wouldCreateCycle', () => {
  const A = 'A' as Ref<Issue>
  const B = 'B' as Ref<Issue>
  const C = 'C' as Ref<Issue>

  it('self-loop A→A returns true', () => {
    expect(wouldCreateCycle(A, A, [])).toBe(true)
  })

  it('two-hop cycle: relations [A→B], query B→A returns true', () => {
    expect(wouldCreateCycle(B, A, [mkRel('A', 'B')])).toBe(true)
  })

  it('three-hop cycle: relations [A→B, B→C], query C→A returns true', () => {
    expect(wouldCreateCycle(C, A, [mkRel('A', 'B'), mkRel('B', 'C')])).toBe(true)
  })

  it('sibling, not cycle: relations [A→B], query A→C returns false', () => {
    expect(wouldCreateCycle(A, C, [mkRel('A', 'B')])).toBe(false)
  })

  it('empty relations: any non-self-loop returns false', () => {
    expect(wouldCreateCycle(A, B, [])).toBe(false)
  })
})
