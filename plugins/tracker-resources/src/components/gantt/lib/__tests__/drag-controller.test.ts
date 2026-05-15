//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, Milestone } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { reduce } from '../drag-controller'
import { createTimeScale, snapToUtcMidnight } from '../time-scale'
import type { DragState, DragTarget } from '../types'

const ts = createTimeScale('week', Date.UTC(2026, 0, 1))
const issueRef = 'issue-1' as Ref<Issue>

const issue: Issue = {
  _id: 'issue-1' as Ref<Issue>,
  _class: 'tracker:class:Issue' as Issue['_class'],
  space: 'space-1' as Issue['space'],
  startDate: Date.UTC(2026, 0, 5),
  dueDate: Date.UTC(2026, 0, 12)
  // The reducer only touches startDate/dueDate; the rest is type-padding.
} as unknown as Issue

const issueTarget: DragTarget = { kind: 'issue', doc: issue }

describe('drag-controller — idle transitions', () => {
  const idle: DragState = { kind: 'idle' }

  it('mouseenter-bar moves idle → hover-bar', () => {
    const next = reduce(idle, { type: 'mouseenter-bar', issueId: issueRef, edge: 'body' }, ts)
    expect(next).toEqual({ kind: 'hover-bar', issueId: issueRef, edge: 'body' })
  })

  it('mouseleave-bar stays idle when already idle', () => {
    const next = reduce(idle, { type: 'mouseleave-bar' }, ts)
    expect(next).toEqual(idle)
  })

  it('mousemove stays idle when no drag is active', () => {
    const next = reduce(idle, { type: 'mousemove', cursorX: 100 }, ts)
    expect(next).toEqual(idle)
  })

  it('mouseup stays idle when no drag is active', () => {
    const next = reduce(idle, { type: 'mouseup' }, ts)
    expect(next).toEqual(idle)
  })
})

describe('drag-controller — body drag', () => {
  it('mousedown-bar on edge=body transitions hover → dragging-body', () => {
    const hover: DragState = { kind: 'hover-bar', issueId: issue._id, edge: 'body' }
    const next = reduce(
      hover,
      {
        type: 'mousedown-bar',
        target: issueTarget,
        originStart: issue.startDate as number,
        originEnd: issue.dueDate as number,
        edge: 'body',
        cursorX: 200
      },
      ts
    )
    expect(next.kind).toBe('dragging-body')
    if (next.kind !== 'dragging-body') return
    expect(next.target.doc._id).toBe(issue._id)
    expect(next.originStart).toBe(issue.startDate)
    expect(next.originEnd).toBe(issue.dueDate)
    expect(next.cursorStartX).toBe(200)
    expect(next.previewStart).toBe(issue.startDate)
    expect(next.previewEnd).toBe(issue.dueDate)
  })

  it('mousemove shifts both preview dates by snapped delta', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: issue.startDate as number,
      previewEnd: issue.dueDate as number
    }
    // Week-zoom = 14 px/day → 28 px = 2 days
    const next = reduce(dragging, { type: 'mousemove', cursorX: 228 }, ts)
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.previewStart).toBe((issue.startDate as number) + 2 * 86_400_000)
    expect(next.previewEnd).toBe((issue.dueDate as number) + 2 * 86_400_000)
  })

  it('mouseup returns dragging-body → idle', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: issue.startDate as number,
      previewEnd: issue.dueDate as number
    }
    const next = reduce(dragging, { type: 'mouseup' }, ts)
    expect(next).toEqual({ kind: 'idle' })
  })

  it('cancel returns dragging-body → idle without applying the move', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: (issue.startDate as number) + 5 * 86_400_000,
      previewEnd: (issue.dueDate as number) + 5 * 86_400_000
    }
    const next = reduce(dragging, { type: 'cancel' }, ts)
    expect(next).toEqual({ kind: 'idle' })
  })
})

describe('drag-controller — resize-left', () => {
  it('mousedown-bar on edge=left transitions hover → resizing-left', () => {
    const hover: DragState = { kind: 'hover-bar', issueId: issue._id, edge: 'left' }
    const next = reduce(
      hover,
      {
        type: 'mousedown-bar',
        target: issueTarget,
        originStart: issue.startDate as number,
        originEnd: issue.dueDate as number,
        edge: 'left',
        cursorX: 50
      },
      ts
    )
    expect(next.kind).toBe('resizing-left')
    if (next.kind !== 'resizing-left') return
    expect(next.previewStart).toBe(issue.startDate)
    expect(next.originEnd).toBe(issue.dueDate)
  })

  it('resize-left mousemove updates previewStart but not originEnd', () => {
    const resizing: DragState = {
      kind: 'resizing-left',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 50,
      previewStart: issue.startDate as number
    }
    // 14 px = 1 day at week zoom
    const next = reduce(resizing, { type: 'mousemove', cursorX: 64 }, ts)
    if (next.kind !== 'resizing-left') throw new Error('expected resizing-left')
    expect(next.previewStart).toBe((issue.startDate as number) + 1 * 86_400_000)
  })

  it('resize-left clamps previewStart to be ≤ originEnd', () => {
    const resizing: DragState = {
      kind: 'resizing-left',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 50,
      previewStart: issue.startDate as number
    }
    // Move 100 days right — past the due date
    const next = reduce(resizing, { type: 'mousemove', cursorX: 50 + 100 * 14 }, ts)
    if (next.kind !== 'resizing-left') throw new Error('expected resizing-left')
    expect(next.previewStart).toBe(issue.dueDate)
  })
})

describe('drag-controller — resize-right', () => {
  it('mousedown-bar on edge=right transitions hover → resizing-right', () => {
    const hover: DragState = { kind: 'hover-bar', issueId: issue._id, edge: 'right' }
    const next = reduce(
      hover,
      {
        type: 'mousedown-bar',
        target: issueTarget,
        originStart: issue.startDate as number,
        originEnd: issue.dueDate as number,
        edge: 'right',
        cursorX: 250
      },
      ts
    )
    expect(next.kind).toBe('resizing-right')
    if (next.kind !== 'resizing-right') return
    expect(next.previewEnd).toBe(issue.dueDate)
    expect(next.originStart).toBe(issue.startDate)
  })

  it('resize-right mousemove updates previewEnd but not originStart', () => {
    const resizing: DragState = {
      kind: 'resizing-right',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 250,
      previewEnd: issue.dueDate as number
    }
    const next = reduce(resizing, { type: 'mousemove', cursorX: 264 }, ts)
    if (next.kind !== 'resizing-right') throw new Error('expected resizing-right')
    expect(next.previewEnd).toBe((issue.dueDate as number) + 1 * 86_400_000)
  })

  it('resize-right clamps previewEnd to be ≥ originStart', () => {
    const resizing: DragState = {
      kind: 'resizing-right',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 250,
      previewEnd: issue.dueDate as number
    }
    // Move 100 days left — past the start
    const next = reduce(resizing, { type: 'mousemove', cursorX: 250 - 100 * 14 }, ts)
    if (next.kind !== 'resizing-right') throw new Error('expected resizing-right')
    expect(next.previewEnd).toBe(issue.startDate)
  })
})

describe('drag-controller — unscheduled drag', () => {
  const undated: Issue = {
    _id: 'u' as Ref<Issue>,
    parents: [],
    startDate: null,
    dueDate: null
  } as unknown as Issue
  const undatedTarget: DragTarget = { kind: 'issue', doc: undated }

  it('mousedown-unscheduled from idle transitions to dragging-unscheduled with origin fields', () => {
    const next = reduce(
      { kind: 'idle' },
      { type: 'mousedown-unscheduled', target: undatedTarget, cursorX: 100 },
      ts
    )
    expect(next.kind).toBe('dragging-unscheduled')
    if (next.kind !== 'dragging-unscheduled') return
    expect(next.previewStart).toBeGreaterThan(0)
    expect(next.previewEnd).toBe(next.previewStart + 86_400_000) // default 1-day span
    // Origin fields are populated so commitDrag/overlay treat unscheduled like
    // a regular drag with an implicit "today" anchor.
    expect(next.originStart).toBe(next.previewStart)
    expect(next.originEnd).toBe(next.previewEnd)
    // Guard against click-without-drag scheduling to today: hasCanvasTarget
    // is false until a real canvas-X is seen on mousemove.
    expect(next.hasCanvasTarget).toBe(false)
  })

  it('mousemove without canvasX keeps hasCanvasTarget false', () => {
    const start: DragState = {
      kind: 'dragging-unscheduled',
      target: undatedTarget,
      originStart: 1_700_000_000_000,
      originEnd: 1_700_000_000_000 + 86_400_000,
      cursorStartX: 100,
      previewStart: 1_700_000_000_000,
      previewEnd: 1_700_000_000_000 + 86_400_000,
      hasCanvasTarget: false
    }
    const next = reduce(start, { type: 'mousemove', cursorX: 200 }, ts)
    if (next.kind !== 'dragging-unscheduled') throw new Error('expected dragging-unscheduled')
    expect(next.hasCanvasTarget).toBe(false)
    expect(next.previewStart).toBe(start.previewStart)
  })

  it('mousemove with canvasX flips hasCanvasTarget true and snaps previewStart', () => {
    const start: DragState = {
      kind: 'dragging-unscheduled',
      target: undatedTarget,
      originStart: 1_700_000_000_000,
      originEnd: 1_700_000_000_000 + 86_400_000,
      cursorStartX: 100,
      previewStart: 1_700_000_000_000,
      previewEnd: 1_700_000_000_000 + 86_400_000,
      hasCanvasTarget: false
    }
    // canvasX = 7 * pxPerDay (week zoom = 14 px/day) → 7 days past origin
    const next = reduce(start, { type: 'mousemove', cursorX: 200, canvasX: 7 * 14 }, ts)
    if (next.kind !== 'dragging-unscheduled') throw new Error('expected dragging-unscheduled')
    expect(next.hasCanvasTarget).toBe(true)
    expect(next.previewStart).toBe(snapToUtcMidnight(ts.fromX(7 * 14)))
    expect(next.previewEnd).toBe(next.previewStart + 86_400_000)
  })
})

describe('drag-controller — direct idle → drag (Playwright + edge-case)', () => {
  it('mousedown-bar from idle transitions directly to dragging-body', () => {
    const next = reduce(
      { kind: 'idle' },
      {
        type: 'mousedown-bar',
        target: issueTarget,
        originStart: issue.startDate as number,
        originEnd: issue.dueDate as number,
        edge: 'body',
        cursorX: 200
      },
      ts
    )
    expect(next.kind).toBe('dragging-body')
    if (next.kind !== 'dragging-body') return
    expect(next.previewStart).toBe(issue.startDate)
    expect(next.previewEnd).toBe(issue.dueDate)
    expect(next.cursorStartX).toBe(200)
  })

  it('mousedown-bar (edge=left) from idle goes directly to resizing-left', () => {
    const next = reduce(
      { kind: 'idle' },
      {
        type: 'mousedown-bar',
        target: issueTarget,
        originStart: issue.startDate as number,
        originEnd: issue.dueDate as number,
        edge: 'left',
        cursorX: 50
      },
      ts
    )
    expect(next.kind).toBe('resizing-left')
  })
})

describe('drag-controller — connector states (PR4a)', () => {
  const source: Issue = {
    _id: 'S' as Ref<Issue>,
    _class: 'tracker:class:Issue' as Issue['_class'],
    space: 'sp' as Issue['space'],
    startDate: 0,
    dueDate: 86_400_000
  } as unknown as Issue
  const target: Issue = {
    _id: 'T' as Ref<Issue>,
    _class: 'tracker:class:Issue' as Issue['_class'],
    space: 'sp' as Issue['space'],
    startDate: 86_400_000,
    dueDate: 86_400_000 * 2
  } as unknown as Issue

  it('idle + mousedown-connector → connector-drawing', () => {
    const next = reduce(
      { kind: 'idle' },
      { type: 'mousedown-connector', source, originPx: { x: 100, y: 50 }, cursorPx: { x: 100, y: 50 } },
      ts
    )
    expect(next.kind).toBe('connector-drawing')
    if (next.kind !== 'connector-drawing') return
    expect(next.source._id).toBe(source._id)
    expect(next.originPx).toEqual({ x: 100, y: 50 })
    expect(next.cursorPx).toEqual({ x: 100, y: 50 })
  })

  it('connector-drawing + mousemove with no target stays connector-drawing, updates cursorPx', () => {
    const drawing: DragState = {
      kind: 'connector-drawing',
      source,
      originPx: { x: 100, y: 50 },
      cursorPx: { x: 100, y: 50 }
    }
    const next = reduce(drawing, { type: 'mousemove-connector', cursorPx: { x: 250, y: 80 }, hoveredBar: null }, ts)
    expect(next.kind).toBe('connector-drawing')
    if (next.kind !== 'connector-drawing') return
    expect(next.cursorPx).toEqual({ x: 250, y: 80 })
  })

  it('connector-drawing + mousemove over a bar → connector-target-hover', () => {
    const drawing: DragState = {
      kind: 'connector-drawing',
      source,
      originPx: { x: 100, y: 50 },
      cursorPx: { x: 100, y: 50 }
    }
    const next = reduce(drawing, { type: 'mousemove-connector', cursorPx: { x: 300, y: 80 }, hoveredBar: target }, ts)
    expect(next.kind).toBe('connector-target-hover')
    if (next.kind !== 'connector-target-hover') return
    expect(next.target._id).toBe(target._id)
    expect(next.cursorPx).toEqual({ x: 300, y: 80 })
  })

  it('connector-target-hover + mousemove off any bar → back to connector-drawing', () => {
    const hover: DragState = {
      kind: 'connector-target-hover',
      source,
      originPx: { x: 100, y: 50 },
      cursorPx: { x: 300, y: 80 },
      target
    }
    const next = reduce(hover, { type: 'mousemove-connector', cursorPx: { x: 400, y: 90 }, hoveredBar: null }, ts)
    expect(next.kind).toBe('connector-drawing')
  })

  it('source bar itself does NOT become a valid target (self-hover stays drawing)', () => {
    const drawing: DragState = {
      kind: 'connector-drawing',
      source,
      originPx: { x: 100, y: 50 },
      cursorPx: { x: 110, y: 55 }
    }
    const next = reduce(drawing, { type: 'mousemove-connector', cursorPx: { x: 120, y: 55 }, hoveredBar: source }, ts)
    expect(next.kind).toBe('connector-drawing')
  })

  it('connector-drawing + mouseup → idle', () => {
    const drawing: DragState = {
      kind: 'connector-drawing',
      source,
      originPx: { x: 100, y: 50 },
      cursorPx: { x: 250, y: 80 }
    }
    expect(reduce(drawing, { type: 'mouseup-connector' }, ts)).toEqual({ kind: 'idle' })
  })

  it('connector-drawing + cancel → idle', () => {
    const drawing: DragState = {
      kind: 'connector-drawing',
      source,
      originPx: { x: 100, y: 50 },
      cursorPx: { x: 250, y: 80 }
    }
    expect(reduce(drawing, { type: 'cancel' }, ts)).toEqual({ kind: 'idle' })
  })
})

describe('drag-controller — milestone target (PR3.3)', () => {
  const milestone: Milestone = {
    _id: 'ms-1' as Ref<Milestone>,
    _class: 'tracker:class:Milestone' as Milestone['_class'],
    space: 'space-1' as Milestone['space'],
    label: 'Sprint 1',
    startDate: Date.UTC(2026, 0, 5),
    targetDate: Date.UTC(2026, 0, 12),
    status: 0,
    comments: 0
  } as unknown as Milestone
  const milestoneTarget: DragTarget = { kind: 'milestone', doc: milestone }

  it('mousedown-bar on milestone target transitions to dragging-body with kind preserved', () => {
    const next = reduce(
      { kind: 'idle' },
      {
        type: 'mousedown-bar',
        target: milestoneTarget,
        originStart: milestone.startDate as number,
        originEnd: milestone.targetDate,
        edge: 'body',
        cursorX: 200
      },
      ts
    )
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.target.kind).toBe('milestone')
    if (next.target.kind !== 'milestone') return
    expect(next.target.doc._id).toBe(milestone._id)
    // Reducer is doc-agnostic — same origin / preview semantics as Issue.
    expect(next.originStart).toBe(milestone.startDate)
    expect(next.originEnd).toBe(milestone.targetDate)
  })

  it('milestone resize-right preserves target.kind through reducer', () => {
    const resizing: DragState = {
      kind: 'resizing-right',
      target: milestoneTarget,
      originStart: milestone.startDate as number,
      originEnd: milestone.targetDate,
      cursorStartX: 250,
      previewEnd: milestone.targetDate
    }
    const next = reduce(resizing, { type: 'mousemove', cursorX: 264 }, ts)
    if (next.kind !== 'resizing-right') throw new Error('expected resizing-right')
    expect(next.target.kind).toBe('milestone')
    expect(next.previewEnd).toBe(milestone.targetDate + 1 * 86_400_000)
  })
})
