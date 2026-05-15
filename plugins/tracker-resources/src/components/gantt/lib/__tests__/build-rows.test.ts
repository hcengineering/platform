//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import {
  GROUP_HEADER_HEIGHT,
  buildGroupedRows,
  groupRowsToLayoutRows,
  type GanttGroupRow
} from '../build-rows'

const ROW_HEIGHT = 32

function makeIssue (id: string, over: Partial<Issue> = {}): Issue {
  return {
    _id: id,
    _class: 'tracker:class:Issue',
    space: 'space1',
    status: 's-default',
    priority: 0,
    assignee: null,
    component: null,
    milestone: null,
    title: id,
    rank: '0',
    identifier: id,
    number: 1,
    estimation: 0,
    reportedTime: 0,
    childInfo: [],
    description: null,
    subIssues: 0,
    parents: [],
    labels: 0,
    ...over
  } as unknown as Issue
}

describe('buildGroupedRows — none (no grouping)', () => {
  it('emits issue rows in input order with depth=0 and sequential y', () => {
    const issues = [makeIssue('a'), makeIssue('b'), makeIssue('c')]
    const rows = buildGroupedRows(issues, 'none', {
      rowHeight: ROW_HEIGHT,
      collapsedGroups: new Set()
    })
    expect(rows).toHaveLength(3)
    expect(rows.every((r): r is Extract<GanttGroupRow, { kind: 'issue' }> => r.kind === 'issue')).toBe(true)
    expect(rows.map(r => r.y)).toEqual([0, ROW_HEIGHT, 2 * ROW_HEIGHT])
    expect((rows[0] as any).depth).toBe(0)
  })

  it('returns empty rows for empty input', () => {
    expect(buildGroupedRows([], 'none', { rowHeight: ROW_HEIGHT, collapsedGroups: new Set() })).toEqual([])
  })
})

describe('buildGroupedRows — group by status', () => {
  const issues = [
    makeIssue('a', { status: 's-backlog' as any }),
    makeIssue('b', { status: 's-progress' as any }),
    makeIssue('c', { status: 's-backlog' as any })
  ]

  it('emits one header per group and issues underneath', () => {
    const rows = buildGroupedRows(issues, 'status', {
      rowHeight: ROW_HEIGHT,
      collapsedGroups: new Set()
    })

    // Expect: header(s-backlog) + a + c + header(s-progress) + b
    expect(rows).toHaveLength(5)

    const h1 = rows[0]
    expect(h1.kind).toBe('group-header')
    expect((h1 as any).groupKey).toBe('s-backlog')
    expect((h1 as any).count).toBe(2)
    expect((h1 as any).collapsed).toBe(false)
    expect(h1.y).toBe(0)

    expect(rows[1].kind).toBe('issue')
    expect(rows[1].y).toBe(GROUP_HEADER_HEIGHT)
    expect(rows[2].kind).toBe('issue')
    expect(rows[2].y).toBe(GROUP_HEADER_HEIGHT + ROW_HEIGHT)

    const h2 = rows[3]
    expect(h2.kind).toBe('group-header')
    expect((h2 as any).groupKey).toBe('s-progress')
    expect((h2 as any).count).toBe(1)
    expect(h2.y).toBe(GROUP_HEADER_HEIGHT + 2 * ROW_HEIGHT)

    expect(rows[4].kind).toBe('issue')
    expect(rows[4].y).toBe(2 * GROUP_HEADER_HEIGHT + 2 * ROW_HEIGHT)
  })

  it('collapses a group so its issues are not emitted but the header remains', () => {
    const rows = buildGroupedRows(issues, 'status', {
      rowHeight: ROW_HEIGHT,
      collapsedGroups: new Set(['s-backlog'])
    })
    // Expect: header(s-backlog collapsed=true) + header(s-progress) + b
    expect(rows).toHaveLength(3)
    expect(rows[0].kind).toBe('group-header')
    expect((rows[0] as any).collapsed).toBe(true)
    expect((rows[0] as any).count).toBe(2) // count is the original group size
    expect(rows[1].kind).toBe('group-header')
    expect(rows[2].kind).toBe('issue')
    expect((rows[2] as any).issue._id).toBe('b')
    expect(rows[1].y).toBe(GROUP_HEADER_HEIGHT) // second header sits right after the first
    expect(rows[2].y).toBe(2 * GROUP_HEADER_HEIGHT)
  })
})

describe('buildGroupedRows — group by priority sorts numerically', () => {
  it('emits lanes in numeric priority order', () => {
    const issues = [
      makeIssue('a', { priority: 3 as any }),
      makeIssue('b', { priority: 1 as any }),
      makeIssue('c', { priority: 2 as any })
    ]
    const rows = buildGroupedRows(issues, 'priority', {
      rowHeight: ROW_HEIGHT,
      collapsedGroups: new Set()
    })
    const headerKeys = rows.filter(r => r.kind === 'group-header').map(r => (r as any).groupKey)
    expect(headerKeys).toEqual(['1', '2', '3'])
  })
})

describe('buildGroupedRows — group by assignee sentinel sorts last', () => {
  it('puts the unassigned bucket at the end', () => {
    const issues = [
      makeIssue('a', { assignee: null }),
      makeIssue('b', { assignee: 'p-1' as any }),
      makeIssue('c', { assignee: 'p-2' as any })
    ]
    const rows = buildGroupedRows(issues, 'assignee', {
      rowHeight: ROW_HEIGHT,
      collapsedGroups: new Set()
    })
    const headerKeys = rows.filter(r => r.kind === 'group-header').map(r => (r as any).groupKey)
    expect(headerKeys).toEqual(['p-1', 'p-2', '__unassigned__'])
  })
})

describe('groupRowsToLayoutRows adapter', () => {
  const issues = [
    makeIssue('a', { status: 's-1' as any }),
    makeIssue('b', { status: 's-1' as any })
  ]
  const grouped = buildGroupedRows(issues, 'status', { rowHeight: ROW_HEIGHT, collapsedGroups: new Set() })

  it('maps group-header rows to LayoutRow with group metadata', () => {
    const layout = groupRowsToLayoutRows(grouped)
    expect(layout[0].kind).toBe('group-header')
    expect(layout[0].issue).toBeNull()
    expect(layout[0].milestone).toBeNull()
    expect(layout[0].collapsible).toBe(true)
    expect(layout[0].groupKey).toBe('s-1')
    expect(layout[0].groupCount).toBe(2)
    expect(layout[0].groupLabel).toBe('s-1')
  })

  it('maps issue rows to LayoutRow carrying groupKey for canvas tint', () => {
    const layout = groupRowsToLayoutRows(grouped)
    expect(layout[1].kind).toBe('issue')
    expect(layout[1].issue?._id).toBe('a')
    expect(layout[1].groupKey).toBe('s-1')
    expect(layout[1].collapsible).toBe(false)
  })

  it('preserves y / height from the source group rows', () => {
    const layout = groupRowsToLayoutRows(grouped)
    expect(layout[0].y).toBe(0)
    expect(layout[0].height).toBe(GROUP_HEADER_HEIGHT)
    expect(layout[1].y).toBe(GROUP_HEADER_HEIGHT)
    expect(layout[1].height).toBe(ROW_HEIGHT)
  })
})

describe('buildGroupedRows — sort hook within a group', () => {
  it('applies the within-group comparator before emission', () => {
    const issues = [
      makeIssue('z', { status: 'x' as any, title: 'Zebra' }),
      makeIssue('a', { status: 'x' as any, title: 'Aardvark' })
    ]
    const rows = buildGroupedRows(issues, 'status', {
      rowHeight: ROW_HEIGHT,
      collapsedGroups: new Set(),
      withinGroupCompare: (a, b) => a.title.localeCompare(b.title)
    })
    const issueRows = rows.filter(r => r.kind === 'issue')
    expect((issueRows[0] as any).issue._id).toBe('a')
    expect((issueRows[1] as any).issue._id).toBe('z')
  })
})
