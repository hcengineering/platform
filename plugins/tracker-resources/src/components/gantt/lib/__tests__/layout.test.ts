//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import { buildLayout, filterVisibleRows } from '../layout'
import { type LayoutRow } from '../types'

function fakeIssue (id: string, parentId?: string, hasChildren = false): Issue {
  return {
    _id: id as any,
    _class: 'tracker:class:Issue' as any,
    title: `Issue ${id}`,
    space: 'project-1' as any,
    component: null,
    milestone: null,
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

const ROW_H = 28

describe('buildLayout (no grouping)', () => {
  it('flattens a flat list of root issues', () => {
    const issues = [fakeIssue('a'), fakeIssue('b')]
    const rows = buildLayout(issues, 'none', ROW_H)
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
    const rows = buildLayout([a, child], 'none', ROW_H)
    expect(rows.find(r => r.issue?._id === 'a.1')?.depth).toBe(1)
  })

  it('marks parent issues as summary rows', () => {
    const a = fakeIssue('a', undefined, true)
    const child = fakeIssue('a.1', 'a')
    const rows = buildLayout([a, child], 'none', ROW_H)
    const parentRow = rows.find(r => r.issue?._id === 'a')!
    expect(parentRow.isSummary).toBe(true)
    expect(rows.find(r => r.issue?._id === 'a.1')?.isSummary).toBe(false)
  })

  it('row Y coordinates are sequential multiples of rowHeight', () => {
    const issues = [fakeIssue('a'), fakeIssue('b'), fakeIssue('c')]
    const rows = buildLayout(issues, 'none', ROW_H)
    expect(rows.map(r => r.y)).toEqual([0, ROW_H, 2 * ROW_H])
  })
})

describe('filterVisibleRows', () => {
  it('returns only rows whose Y range intersects the viewport (overscan=0)', () => {
    const all: LayoutRow[] = [
      { kind: 'issue', y: 0,    height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false },
      { kind: 'issue', y: 100,  height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false },
      { kind: 'issue', y: 5000, height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false }
    ]
    const visible = filterVisibleRows(all, 80, 60, 0)
    expect(visible.map(r => r.y)).toEqual([100])
  })

  it('default overscan brings adjacent rows into the visible set', () => {
    const all: LayoutRow[] = [
      { kind: 'issue', y: 0,    height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false },
      { kind: 'issue', y: 100,  height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false },
      { kind: 'issue', y: 5000, height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false }
    ]
    const visible = filterVisibleRows(all, 80, 60)
    expect(visible.map(r => r.y).sort((a, b) => a - b)).toEqual([0, 100])
  })

  it('honours an explicit overscan', () => {
    const all: LayoutRow[] = [
      { kind: 'issue', y: 0,    height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false },
      { kind: 'issue', y: 1000, height: ROW_H, depth: 0, visible: true,  issue: null, component: null, isSummary: false }
    ]
    const visible = filterVisibleRows(all, 950, 50, 200)
    expect(visible.map(r => r.y)).toEqual([1000])
  })
})
