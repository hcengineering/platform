//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import { buildLayout, filterVisibleRows } from '../layout'
import { type LayoutRow, type MilestoneMarker } from '../types'

function fakeIssue (id: string, parentId?: string, hasChildren = false, milestone?: string): Issue {
  return {
    _id: id as any,
    _class: 'tracker:class:Issue' as any,
    title: `Issue ${id}`,
    space: 'project-1' as any,
    component: null,
    milestone: milestone ?? null,
    startDate: null,
    dueDate: null,
    parents: parentId !== undefined ? [{ parentId: parentId as any }] : [],
    childInfo: hasChildren ? [{ childId: 'fake-child' as any, count: 0, category: '' }] : [],
    estimation: 0,
    remainingTime: 0,
    reportedTime: 0,
    reports: 0,
    subIssues: 0,
    priority: 0,
    status: '' as any,
    attachedTo: 'tracker:ids:NoParent' as any
  } as unknown as Issue
}

function fakeMilestone (id: string, label = `MS ${id}`): MilestoneMarker {
  return { _id: id as any, label, startDate: null, targetDate: 1_700_000_000_000 }
}

const ROW_H = 28

describe('buildLayout (no grouping)', () => {
  it('flattens a flat list of root issues', () => {
    const issues = [fakeIssue('a'), fakeIssue('b')]
    const rows = buildLayout(issues, [], 'none', ROW_H)
    expect(rows).toHaveLength(2)
    expect(rows[0].issue?._id).toBe('a')
    expect(rows[1].issue?._id).toBe('b')
    expect(rows[0].depth).toBe(0)
    expect(rows[0].y).toBe(0)
    expect(rows[1].y).toBe(ROW_H)
  })

  it('places children below parent with depth+1', () => {
    const a = fakeIssue('a', undefined, true)
    const child = fakeIssue('a.1', 'a')
    const rows = buildLayout([a, child], [], 'none', ROW_H)
    expect(rows.find(r => r.issue?._id === 'a.1')?.depth).toBe(1)
  })

  it('marks parent issues as summary rows', () => {
    const a = fakeIssue('a', undefined, true)
    const child = fakeIssue('a.1', 'a')
    const rows = buildLayout([a, child], [], 'none', ROW_H)
    const parentRow = rows.find(r => r.issue?._id === 'a')!
    expect(parentRow.isSummary).toBe(true)
    expect(rows.find(r => r.issue?._id === 'a.1')?.isSummary).toBe(false)
  })

  it('row Y coordinates are sequential multiples of rowHeight', () => {
    const issues = [fakeIssue('a'), fakeIssue('b'), fakeIssue('c')]
    const rows = buildLayout(issues, [], 'none', ROW_H)
    expect(rows.map(r => r.y)).toEqual([0, ROW_H, 2 * ROW_H])
  })

  it('emits orphan children as roots when their parent is not in the input set', () => {
    const a = fakeIssue('a', 'p')
    const b = fakeIssue('b', 'p')
    const rows = buildLayout([a, b], [], 'none', ROW_H)
    expect(rows.map(r => r.issue?._id)).toEqual(['a', 'b'])
    expect(rows.every(r => r.depth === 0)).toBe(true)
  })

  it('keeps real parent/child nesting when parent IS in the input set', () => {
    const parent = fakeIssue('p', undefined, true)
    const childA = fakeIssue('a', 'p')
    const childB = fakeIssue('b', 'p')
    const rows = buildLayout([parent, childA, childB], [], 'none', ROW_H)
    expect(rows.map(r => r.issue?._id)).toEqual(['p', 'a', 'b'])
    expect(rows[0].depth).toBe(0)
    expect(rows[1].depth).toBe(1)
    expect(rows[2].depth).toBe(1)
  })
})

describe('buildLayout — milestones', () => {
  it('emits milestone parent rows above their issues', () => {
    const ms = fakeMilestone('m1')
    const i1 = fakeIssue('a', undefined, false, 'm1')
    const i2 = fakeIssue('b', undefined, false, 'm1')
    const rows = buildLayout([i1, i2], [ms], 'none', ROW_H)
    expect(rows.map(r => r.id)).toEqual(['milestone:m1', 'issue:a', 'issue:b'])
    expect(rows[0].kind).toBe('milestone')
    expect(rows[0].milestone?.label).toBe('MS m1')
    expect(rows[1].depth).toBe(1)
    expect(rows[2].depth).toBe(1)
  })

  it('places issues without a known milestone as top-level roots', () => {
    const i1 = fakeIssue('a', undefined, false, 'unknown-ms')
    const i2 = fakeIssue('b')
    const rows = buildLayout([i1, i2], [], 'none', ROW_H)
    expect(rows.map(r => r.id)).toEqual(['issue:a', 'issue:b'])
    expect(rows.every(r => r.depth === 0)).toBe(true)
  })

  it('mixes milestone groups with bare issues (milestones first)', () => {
    const ms = fakeMilestone('m1')
    const inGroup = fakeIssue('a', undefined, false, 'm1')
    const ungrouped = fakeIssue('b')
    const rows = buildLayout([inGroup, ungrouped], [ms], 'none', ROW_H)
    expect(rows.map(r => r.id)).toEqual(['milestone:m1', 'issue:a', 'issue:b'])
  })
})

describe('buildLayout — collapse', () => {
  it('hides children of a collapsed milestone row', () => {
    const ms = fakeMilestone('m1')
    const i1 = fakeIssue('a', undefined, false, 'm1')
    const i2 = fakeIssue('b', undefined, false, 'm1')
    const rows = buildLayout([i1, i2], [ms], 'none', {
      rowHeight: ROW_H,
      collapsedIds: new Set(['milestone:m1'])
    })
    expect(rows.map(r => r.id)).toEqual(['milestone:m1'])
    expect(rows[0].collapsed).toBe(true)
  })

  it('hides sub-issues of a collapsed parent issue', () => {
    const parent = fakeIssue('p', undefined, true)
    const child = fakeIssue('a', 'p')
    const rows = buildLayout([parent, child], [], 'none', {
      rowHeight: ROW_H,
      collapsedIds: new Set(['issue:p'])
    })
    expect(rows.map(r => r.id)).toEqual(['issue:p'])
    expect(rows[0].collapsed).toBe(true)
    expect(rows[0].collapsible).toBe(true)
  })

  it('expanded parents render their children', () => {
    const parent = fakeIssue('p', undefined, true)
    const child = fakeIssue('a', 'p')
    const rows = buildLayout([parent, child], [], 'none', {
      rowHeight: ROW_H,
      collapsedIds: new Set()
    })
    expect(rows.map(r => r.id)).toEqual(['issue:p', 'issue:a'])
    expect(rows[0].collapsed).toBe(false)
  })
})

describe('buildLayout — breadcrumb mode (Tier-4 Item 12)', () => {
  it('renders parent as breadcrumb when only child matches filter', () => {
    const parent = fakeIssue('P', undefined, true)
    const child = fakeIssue('C', 'P')
    const rows = buildLayout([parent, child], [], 'none', {
      rowHeight: ROW_H,
      matchedIds: new Set(['C']),
      includeBreadcrumbs: true
    })
    expect(rows.map(r => r.id)).toEqual(['issue:P', 'issue:C'])
    expect(rows.find(r => r.id === 'issue:P')?.isBreadcrumb).toBe(true)
    expect(rows.find(r => r.id === 'issue:C')?.isBreadcrumb).toBe(false)
  })

  it('hides non-matching root issues that are not breadcrumbs', () => {
    const a = fakeIssue('A')
    const b = fakeIssue('B')
    const rows = buildLayout([a, b], [], 'none', {
      rowHeight: ROW_H,
      matchedIds: new Set(['A']),
      includeBreadcrumbs: true
    })
    expect(rows.map(r => r.id)).toEqual(['issue:A'])
    expect(rows[0].isBreadcrumb).toBe(false)
  })

  it('forces parents visible even when collapsed if their child matches', () => {
    const p = fakeIssue('P', undefined, true)
    const c = fakeIssue('C', 'P')
    const rows = buildLayout([p, c], [], 'none', {
      rowHeight: ROW_H,
      collapsedIds: new Set(['issue:P']),
      matchedIds: new Set(['C']),
      includeBreadcrumbs: true
    })
    expect(rows.map(r => r.id)).toEqual(['issue:P', 'issue:C'])
  })

  it('does not flag breadcrumbs when includeBreadcrumbs is undefined', () => {
    const p = fakeIssue('P', undefined, true)
    const c = fakeIssue('C', 'P')
    const rows = buildLayout([p, c], [], 'none', { rowHeight: ROW_H })
    rows.forEach(r => expect(r.isBreadcrumb ?? false).toBe(false))
  })
})

describe('buildLayout — within-level sort (Tier-4 Item 12)', () => {
  it('sorts siblings without flattening hierarchy', () => {
    const p1 = fakeIssue('P1', undefined, true)
    const p2 = fakeIssue('P2')
    const c1 = fakeIssue('C1', 'P1')
    const c2 = fakeIssue('C2', 'P1')
    // Override titles for stable comparison
    ;(p1 as any).title = 'beta'
    ;(p2 as any).title = 'alpha'
    ;(c1 as any).title = 'gamma'
    ;(c2 as any).title = 'delta'
    const cmp = (a: Issue, b: Issue): number => (a.title ?? '').localeCompare(b.title ?? '')
    const rows = buildLayout([p1, p2, c1, c2], [], 'none', {
      rowHeight: ROW_H,
      withinLevelCompare: cmp
    })
    // P2 (alpha) before P1 (beta); under P1: C2 (delta) before C1 (gamma)
    expect(rows.map(r => r.issue?._id)).toEqual(['P2', 'P1', 'C2', 'C1'])
  })

  it('is a no-op when withinLevelCompare is undefined', () => {
    const p1 = fakeIssue('P1')
    const p2 = fakeIssue('P2')
    const rows = buildLayout([p1, p2], [], 'none', { rowHeight: ROW_H })
    expect(rows.map(r => r.issue?._id)).toEqual(['P1', 'P2'])
  })

  it('sorts within milestone groups too', () => {
    const ms = fakeMilestone('m1')
    const a = fakeIssue('a', undefined, false, 'm1')
    const b = fakeIssue('b', undefined, false, 'm1')
    ;(a as any).title = 'zeta'
    ;(b as any).title = 'eta'
    const cmp = (x: Issue, y: Issue): number => (x.title ?? '').localeCompare(y.title ?? '')
    const rows = buildLayout([a, b], [ms], 'none', {
      rowHeight: ROW_H,
      withinLevelCompare: cmp
    })
    expect(rows.map(r => r.id)).toEqual(['milestone:m1', 'issue:b', 'issue:a'])
  })
})

describe('buildLayout — Tier-4 combined breadcrumb + sort + collapse', () => {
  it('preserves breadcrumb + within-level sort under collapsed sibling', () => {
    const p1 = fakeIssue('P1', undefined, true)
    const p2 = fakeIssue('P2', undefined, true)
    const c1 = fakeIssue('C1', 'P1')
    const c2 = fakeIssue('C2', 'P1')
    ;(p1 as any).title = 'beta'
    ;(p2 as any).title = 'alpha'
    ;(c1 as any).title = 'gamma'
    ;(c2 as any).title = 'delta'
    const cmp = (a: Issue, b: Issue): number => (a.title ?? '').localeCompare(b.title ?? '')
    const rows = buildLayout([p1, p2, c1, c2], [], 'none', {
      rowHeight: ROW_H,
      collapsedIds: new Set(['issue:P2']),
      matchedIds: new Set(['C2']),
      includeBreadcrumbs: true,
      withinLevelCompare: cmp
    })
    // P2 has no matched descendants → filtered out. P1 stays as breadcrumb.
    // Under P1: C2 (delta) sorts before C1 (gamma); C1 is non-match and
    // non-breadcrumb so it is dropped entirely.
    expect(rows.map(r => r.issue?._id)).toEqual(['P1', 'C2'])
    expect(rows[0].isBreadcrumb).toBe(true)
    expect(rows[1].isBreadcrumb).toBe(false)
  })
})

describe('filterVisibleRows', () => {
  function row (y: number): LayoutRow {
    return {
      kind: 'issue',
      id: `r-${y}`,
      y,
      height: ROW_H,
      depth: 0,
      visible: true,
      issue: null,
      milestone: null,
      component: null,
      isSummary: false,
      collapsible: false,
      collapsed: false
    }
  }

  it('returns only rows whose Y range intersects the viewport (overscan=0)', () => {
    const all: LayoutRow[] = [row(0), row(100), row(5000)]
    const visible = filterVisibleRows(all, 80, 60, 0)
    expect(visible.map(r => r.y)).toEqual([100])
  })

  it('default overscan brings adjacent rows into the visible set', () => {
    const all: LayoutRow[] = [row(0), row(100), row(5000)]
    const visible = filterVisibleRows(all, 80, 60)
    expect(visible.map(r => r.y).sort((a, b) => a - b)).toEqual([0, 100])
  })

  it('honours an explicit overscan', () => {
    const all: LayoutRow[] = [row(0), row(1000)]
    const visible = filterVisibleRows(all, 950, 50, 200)
    expect(visible.map(r => r.y)).toEqual([1000])
  })
})
