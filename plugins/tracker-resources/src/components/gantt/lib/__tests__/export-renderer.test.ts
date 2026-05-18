//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Ref } from '@hcengineering/core'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import { buildGanttExportSvg } from '../export-renderer'
import { createTimeScale } from '../time-scale'
import type { LayoutRow } from '../types'

const DAY = 86_400_000
const start = Date.UTC(2026, 0, 5)

function issue (id: string, identifier: string, title: string, offset: number): Issue {
  return {
    _id: id as Ref<Issue>,
    identifier,
    title,
    startDate: start + offset * DAY,
    dueDate: start + (offset + 5) * DAY,
    parents: [],
    priority: 0
  } as unknown as Issue
}

function row (i: Issue, y: number): LayoutRow {
  return {
    kind: 'issue',
    id: `issue:${String(i._id)}`,
    y,
    height: 36,
    depth: 0,
    visible: true,
    issue: i,
    milestone: null,
    component: null,
    isSummary: false,
    collapsible: false,
    collapsed: false
  }
}

describe('buildGanttExportSvg', () => {
  it('renders issue list before a full-width Gantt timeline', () => {
    const a = issue('a', 'TSK-1', 'Design work', 0)
    const b = issue('b', 'TSK-2', 'Construction work', 8)
    const svg = buildGanttExportSvg({
      rows: [row(a, 0), row(b, 36)],
      relations: [],
      summaryRanges: new Map(),
      timeScale: createTimeScale('week', start),
      range: [start, start + 20 * DAY],
      chartWidth: 320
    })

    expect(svg).toContain('width="704"')
    expect(svg).toContain('Issues')
    expect(svg).toContain('TSK-1')
    expect(svg).toContain('Design work')
    expect(svg.indexOf('TSK-1')).toBeLessThan(svg.indexOf('class="chart-bg"'))
  })

  it('renders dependency arrows between exported issue bars', () => {
    const a = issue('a', 'TSK-1', 'Design work', 0)
    const b = issue('b', 'TSK-2', 'Construction work', 8)
    const rel = {
      _id: 'rel-1',
      attachedTo: a._id,
      target: b._id,
      kind: 'finish-to-start',
      lag: 2
    } as unknown as IssueRelation

    const svg = buildGanttExportSvg({
      rows: [row(a, 0), row(b, 36)],
      relations: [rel],
      summaryRanges: new Map(),
      timeScale: createTimeScale('week', start),
      range: [start, start + 20 * DAY],
      chartWidth: 320
    })

    expect(svg).toContain('class="dependency"')
    expect(svg).toContain('+2d')
  })
})
