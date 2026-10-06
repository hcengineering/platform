//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { dragCalendar, modifierSyncMove, reduce } from '../drag-controller'
import { createTimeScale, snapToUtcMidnight } from '../time-scale'
import type { DragState, DragTarget, GanttItem, WorkingCalendar } from '../types'

// Neutral stand-in for a tracker Issue/Milestone: the reducer only reads `_id`,
// so the date/space fields are plain padding consumed by the test assertions.
interface TestItem extends GanttItem {
  _class?: string
  space?: string
  label?: string
  startDate?: number | null
  dueDate?: number | null
  targetDate?: number
  status?: number
  comments?: number
  parents?: unknown[]
}

const ts = createTimeScale('week', Date.UTC(2026, 0, 1))
const issueRef = 'issue-1'

const issue: TestItem = {
  _id: 'issue-1',
  _class: 'tracker:class:Issue',
  space: 'space-1',
  startDate: Date.UTC(2026, 0, 5),
  dueDate: Date.UTC(2026, 0, 12)
  // The reducer only touches startDate/dueDate; the rest is type-padding.
}

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
  const undated: TestItem = {
    _id: 'u',
    parents: [],
    startDate: null,
    dueDate: null
  }
  const undatedTarget: DragTarget = { kind: 'issue', doc: undated }

  it('mousedown-unscheduled from idle transitions to dragging-unscheduled with origin fields', () => {
    const next = reduce({ kind: 'idle' }, { type: 'mousedown-unscheduled', target: undatedTarget, cursorX: 100 }, ts)
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

describe('drag-controller — connector states', () => {
  const source: TestItem = {
    _id: 'S',
    _class: 'tracker:class:Issue',
    space: 'sp',
    startDate: 0,
    dueDate: 86_400_000
  }
  const target: TestItem = {
    _id: 'T',
    _class: 'tracker:class:Issue',
    space: 'sp',
    startDate: 86_400_000,
    dueDate: 86_400_000 * 2
  }

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
    expect('target' in next).toBe(false)
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
    expect('target' in next).toBe(false)
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

describe('drag-controller — milestone target', () => {
  const milestone: TestItem = {
    _id: 'ms-1',
    _class: 'tracker:class:Milestone',
    space: 'space-1',
    label: 'Sprint 1',
    startDate: Date.UTC(2026, 0, 5),
    targetDate: Date.UTC(2026, 0, 12),
    status: 0,
    comments: 0
  }
  const milestoneTarget: DragTarget = { kind: 'milestone', doc: milestone }

  it('mousedown-bar on milestone target transitions to dragging-body with kind preserved', () => {
    const next = reduce(
      { kind: 'idle' },
      {
        type: 'mousedown-bar',
        target: milestoneTarget,
        originStart: milestone.startDate as number,
        originEnd: milestone.targetDate as number,
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
      originEnd: milestone.targetDate as number,
      cursorStartX: 250,
      previewEnd: milestone.targetDate as number
    }
    const next = reduce(resizing, { type: 'mousemove', cursorX: 264 }, ts)
    if (next.kind !== 'resizing-right') throw new Error('expected resizing-right')
    expect(next.target.kind).toBe('milestone')
    expect(next.previewEnd).toBe((milestone.targetDate as number) + 1 * 86_400_000)
  })
})

describe('drag-controller — bulk co-drag', () => {
  // Two members: the leading bar (`issue` above) and a second issue B that
  // sits in the bulk-selection. coDrag carries B's origin so the controller
  // can clamp the shared delta without GanttView needing to do the math.
  const issueB: TestItem = {
    _id: 'issue-2',
    _class: 'tracker:class:Issue',
    space: 'space-1',
    startDate: Date.UTC(2026, 0, 19),
    dueDate: Date.UTC(2026, 0, 23)
  }

  it('mousedown-bar with coDrag transitions to dragging-body carrying the co-drag payload', () => {
    const next = reduce(
      { kind: 'idle' },
      {
        type: 'mousedown-bar',
        target: issueTarget,
        originStart: issue.startDate as number,
        originEnd: issue.dueDate as number,
        edge: 'body',
        cursorX: 200,
        coDrag: {
          members: [
            {
              issueId: issue._id,
              originStart: issue.startDate as number,
              originEnd: issue.dueDate as number
            },
            {
              issueId: issueB._id,
              originStart: issueB.startDate as number,
              originEnd: issueB.dueDate as number
            }
          ],
          minDeltaMs: -2 * 86_400_000,
          maxDeltaMs: Infinity
        }
      },
      ts
    )
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.coDrag).toBeDefined()
    expect(next.coDrag?.members).toHaveLength(2)
    expect(next.coDrag?.anchorDeltaMs).toBe(0)
    expect(next.coDrag?.minDeltaMs).toBe(-2 * 86_400_000)
  })

  it('mousemove clamps the shared delta to coDrag.minDeltaMs (hard-stop entire group)', () => {
    // Week-zoom = 14 px/day. cursorStartX=200, moving to 130 → -5 days.
    // coDrag.minDeltaMs caps at -2 days. Both preview AND anchorDeltaMs reflect the clamp.
    const dragging: DragState = {
      kind: 'dragging-body',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: issue.startDate as number,
      previewEnd: issue.dueDate as number,
      coDrag: {
        anchorDeltaMs: 0,
        members: [
          {
            issueId: issue._id,
            originStart: issue.startDate as number,
            originEnd: issue.dueDate as number
          },
          {
            issueId: issueB._id,
            originStart: issueB.startDate as number,
            originEnd: issueB.dueDate as number
          }
        ],
        minDeltaMs: -2 * 86_400_000,
        maxDeltaMs: Infinity
      }
    }
    // 70 px left of cursorStartX → -5 days raw; clamps to -2.
    const next = reduce(dragging, { type: 'mousemove', cursorX: 130 }, ts)
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.coDrag?.anchorDeltaMs).toBe(-2 * 86_400_000)
    expect(next.previewStart).toBe((issue.startDate as number) - 2 * 86_400_000)
    expect(next.previewEnd).toBe((issue.dueDate as number) - 2 * 86_400_000)
  })

  it('mousemove still respects ordinary delta when within coDrag bounds', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: issue.startDate as number,
      previewEnd: issue.dueDate as number,
      coDrag: {
        anchorDeltaMs: 0,
        members: [
          {
            issueId: issue._id,
            originStart: issue.startDate as number,
            originEnd: issue.dueDate as number
          }
        ],
        minDeltaMs: -5 * 86_400_000,
        maxDeltaMs: Infinity
      }
    }
    // +28 px → +2 days, well within bounds.
    const next = reduce(dragging, { type: 'mousemove', cursorX: 228 }, ts)
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.coDrag?.anchorDeltaMs).toBe(2 * 86_400_000)
    expect(next.previewStart).toBe((issue.startDate as number) + 2 * 86_400_000)
  })

  it('mousemove without coDrag preserves legacy single-bar behaviour (regression)', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      target: issueTarget,
      originStart: issue.startDate as number,
      originEnd: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: issue.startDate as number,
      previewEnd: issue.dueDate as number
    }
    const next = reduce(dragging, { type: 'mousemove', cursorX: 228 }, ts)
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.coDrag).toBeUndefined()
    expect(next.previewStart).toBe((issue.startDate as number) + 2 * 86_400_000)
    void snapToUtcMidnight // keep import alive
  })
})

describe('drag-controller — working-days calendar', () => {
  // Week zoom = 14 px/day; dates in May 2026 (Mon 18 .. Mon 25).
  const D = (day: number): number => Date.UTC(2026, 4, day)
  const cfgMonFri: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [] }

  const bodyState = (start: number, end: number): DragState => ({
    kind: 'dragging-body',
    target: issueTarget,
    originStart: start,
    originEnd: end,
    cursorStartX: 200,
    previewStart: start,
    previewEnd: end
  })
  const leftState = (start: number, end: number): DragState => ({
    kind: 'resizing-left',
    target: issueTarget,
    originStart: start,
    originEnd: end,
    cursorStartX: 200,
    previewStart: start
  })
  const rightState = (start: number, end: number): DragState => ({
    kind: 'resizing-right',
    target: issueTarget,
    originStart: start,
    originEnd: end,
    cursorStartX: 200,
    previewEnd: end
  })
  const unscheduledState: DragState = {
    kind: 'dragging-unscheduled',
    target: issueTarget,
    originStart: D(1),
    originEnd: D(2),
    cursorStartX: 100,
    previewStart: D(1),
    previewEnd: D(2),
    hasCanvasTarget: false
  }
  const ts2 = createTimeScale('week', D(18))

  const preview = (s: DragState): [number | undefined, number | undefined] => {
    if (s.kind === 'dragging-body' || s.kind === 'dragging-unscheduled') return [s.previewStart, s.previewEnd]
    if (s.kind === 'resizing-left') return [s.previewStart, undefined]
    if (s.kind === 'resizing-right') return [undefined, s.previewEnd]
    throw new Error(`unexpected state ${s.kind}`)
  }

  it('body drag onto a Saturday lands on Monday and keeps three working days', () => {
    const next = reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 270 }, ts, cfgMonFri)
    expect(preview(next)).toEqual([D(25), D(27)])
  })

  it('body drag onto a working day keeps the working-day span across the weekend', () => {
    const next = reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 242 }, ts, cfgMonFri)
    expect(preview(next)).toEqual([D(21), D(25)])
  })

  it('body drag left onto a Sunday lands on the previous Friday', () => {
    const next = reduce(bodyState(D(25), D(27)), { type: 'mousemove', cursorX: 186 }, ts, cfgMonFri)
    expect(preview(next)).toEqual([D(22), D(26)])
  })

  it('body drag onto a holiday lands on the next working day', () => {
    const cfgHol: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [D(21)] }
    const next = reduce(bodyState(D(18), D(19)), { type: 'mousemove', cursorX: 242 }, ts, cfgHol)
    expect(preview(next)).toEqual([D(22), D(25)])
  })

  it('a zero-delta move leaves a bar on non-working days untouched', () => {
    const next = reduce(bodyState(D(23), D(24)), { type: 'mousemove', cursorX: 200 }, ts, cfgMonFri)
    expect(preview(next)).toEqual([D(23), D(24)])
  })

  it('a weekend-only bar becomes a one-working-day bar once it is moved', () => {
    const next = reduce(bodyState(D(23), D(24)), { type: 'mousemove', cursorX: 228 }, ts, cfgMonFri)
    expect(preview(next)).toEqual([D(25), D(25)])
  })

  it('the start handle rounds up to the next working day and never crosses originEnd', () => {
    const at = (cursorX: number, start: number, end: number): number | undefined =>
      preview(reduce(leftState(start, end), { type: 'mousemove', cursorX }, ts, cfgMonFri))[0]
    expect(at(186, D(18), D(19))).toBe(D(18)) // pointer on Sun 17
    expect(at(172, D(18), D(19))).toBe(D(18)) // pointer on Sat 16
    expect(at(158, D(18), D(19))).toBe(D(15)) // pointer on Fri 15
    expect(at(270, D(18), D(18))).toBe(D(18)) // Sat 23 → Mon 25, clamped to originEnd
  })

  it('the end handle rounds down to the previous working day and never crosses originStart', () => {
    const at = (cursorX: number, start: number, end: number): number | undefined =>
      preview(reduce(rightState(start, end), { type: 'mousemove', cursorX }, ts, cfgMonFri))[1]
    expect(at(228, D(18), D(21))).toBe(D(22)) // pointer on Sat 23
    expect(at(242, D(18), D(21))).toBe(D(22)) // pointer on Sun 24
    expect(at(256, D(18), D(21))).toBe(D(25)) // pointer on Mon 25
    expect(at(186, D(22), D(22))).toBe(D(22)) // Thu 21, clamped to originStart
  })

  it('an unscheduled issue dropped on a Saturday starts Monday and lasts two working days', () => {
    const next = reduce(unscheduledState, { type: 'mousemove', cursorX: 200, canvasX: 5 * 14 }, ts2, cfgMonFri)
    expect(preview(next)).toEqual([D(25), D(26)])
    if (next.kind !== 'dragging-unscheduled') throw new Error('expected dragging-unscheduled')
    expect(next.hasCanvasTarget).toBe(true)
  })

  it('without a calendar every branch keeps its calendar-day result', () => {
    expect(preview(reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 270 }, ts))).toEqual([D(23), D(25)])
    expect(preview(reduce(leftState(D(18), D(19)), { type: 'mousemove', cursorX: 172 }, ts))[0]).toBe(D(16))
    expect(preview(reduce(rightState(D(18), D(21)), { type: 'mousemove', cursorX: 228 }, ts))[1]).toBe(D(23))
    expect(preview(reduce(unscheduledState, { type: 'mousemove', cursorX: 200, canvasX: 5 * 14 }, ts2))).toEqual([
      D(23),
      D(24)
    ])
  })

  it('a co-drag ignores the calendar and keeps its shared clamped delta', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      target: issueTarget,
      originStart: D(18),
      originEnd: D(20),
      cursorStartX: 200,
      previewStart: D(18),
      previewEnd: D(20),
      coDrag: {
        anchorDeltaMs: 0,
        members: [
          { issueId: issue._id, originStart: D(18), originEnd: D(20) },
          { issueId: 'issue-2', originStart: D(19), originEnd: D(22) }
        ],
        minDeltaMs: -2 * 86_400_000,
        maxDeltaMs: 5 * 86_400_000
      }
    }
    // +6 days raw, clamped to +5 → the leader lands on Saturday 23.
    const next = reduce(dragging, { type: 'mousemove', cursorX: 284 }, ts, cfgMonFri)
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.previewStart).toBe(D(23))
    expect(next.previewEnd).toBe(D(25))
    expect(next.coDrag?.anchorDeltaMs).toBe(5 * 86_400_000)
  })

  it('snaps in the drag direction, so reversing the drag does not jump', () => {
    const right = reduce(bodyState(D(18), D(18)), { type: 'mousemove', cursorX: 214 }, ts, cfgMonFri)
    expect(preview(right)).toEqual([D(19), D(19)])
    const left = reduce(right, { type: 'mousemove', cursorX: 186 }, ts, cfgMonFri)
    expect(preview(left)).toEqual([D(15), D(15)])
  })

  it('a calendar without working weekdays falls back to calendar days', () => {
    const cfgNone: WorkingCalendar = { weekdayMask: 0, holidays: [] }
    expect(preview(reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 270 }, ts, cfgNone))).toEqual([
      D(23),
      D(25)
    ])
    expect(preview(reduce(leftState(D(18), D(19)), { type: 'mousemove', cursorX: 172 }, ts, cfgNone))[0]).toBe(D(16))
    expect(preview(reduce(rightState(D(18), D(21)), { type: 'mousemove', cursorX: 228 }, ts, cfgNone))[1]).toBe(D(23))
    expect(
      preview(reduce(unscheduledState, { type: 'mousemove', cursorX: 200, canvasX: 5 * 14 }, ts2, cfgNone))
    ).toEqual([D(23), D(24)])
  })

  it('a bar longer than MAX_WORKING_SPAN_DAYS or with a non-finite origin moves in calendar days', () => {
    const farEnd = D(20) + 50_000 * 86_400_000
    expect(preview(reduce(bodyState(D(18), farEnd), { type: 'mousemove', cursorX: 270 }, ts, cfgMonFri))).toEqual([
      D(23),
      farEnd + 5 * 86_400_000
    ])
    const [start, end] = preview(reduce(bodyState(D(18), Infinity), { type: 'mousemove', cursorX: 270 }, ts, cfgMonFri))
    expect(start).toBe(D(23))
    expect(end).toBeNaN() // same as without a calendar: snapToUtcMidnight(Infinity)
  })

  describe('a holiday blackout longer than the working-day search window', () => {
    // Mon..Fri calendar where every day from Fri May 22 to Sun Oct 18 (150
    // days) is a holiday: from its middle no working day is within reach.
    const DAY = 86_400_000
    const blackoutStart = D(22)
    const blackoutEnd = D(22) + 150 * DAY // Mon Oct 19, first working day after
    const blackout: WorkingCalendar = {
      weekdayMask: 0b0011111,
      holidays: Array.from({ length: 150 }, (_, i) => blackoutStart + i * DAY)
    }
    const inBlackout = (t: number | undefined): boolean => t !== undefined && t >= blackoutStart && t < blackoutEnd

    it('a body drag deep into the blackout moves in calendar days, as without a calendar', () => {
      // +60 days → Fri Jul 17; the next working day (Oct 19) is 94 days away.
      const move = { type: 'mousemove', cursorX: 200 + 60 * 14 } as const
      const next = reduce(bodyState(D(18), D(20)), move, ts, blackout)
      expect(preview(next)).toEqual([D(18) + 60 * DAY, D(20) + 60 * DAY])
      expect(preview(next)).toEqual(preview(reduce(bodyState(D(18), D(20)), move, ts)))
    })

    it('a body drag left from after the blackout into it moves in calendar days', () => {
      // -10 days → Fri Oct 9; the previous working day (Thu May 21) is 141 days away.
      const next = reduce(bodyState(blackoutEnd, blackoutEnd), { type: 'mousemove', cursorX: 60 }, ts, blackout)
      expect(preview(next)).toEqual([blackoutEnd - 10 * DAY, blackoutEnd - 10 * DAY])
    })

    it('a body drag whose working-day end would cross the blackout moves in calendar days', () => {
      // Mon..Wed bar dragged one day right: Tue 19 is a working day, but a
      // three-working-day end would have to cross the whole blackout.
      const next = reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 214 }, ts, blackout)
      expect(preview(next)).toEqual([D(19), D(21)])
    })

    it('a body drag near the edge of the blackout still snaps past it', () => {
      // +120 days → Wed Sep 16; Mon Oct 19 is 33 days away, a one-day bar snaps there.
      const next = reduce(bodyState(D(18), D(18)), { type: 'mousemove', cursorX: 200 + 120 * 14 }, ts, blackout)
      expect(preview(next)).toEqual([blackoutEnd, blackoutEnd])
    })

    it('resize handles deep in the blackout follow the pointer in calendar days', () => {
      const left = reduce(leftState(D(18), blackoutEnd), { type: 'mousemove', cursorX: 200 + 60 * 14 }, ts, blackout)
      expect(preview(left)[0]).toBe(D(18) + 60 * DAY)
      const right = reduce(rightState(D(18), D(19)), { type: 'mousemove', cursorX: 200 + 80 * 14 }, ts, blackout)
      expect(preview(right)[1]).toBe(D(19) + 80 * DAY)
    })

    it('an unscheduled drop deep in the blackout keeps the calendar-day drop', () => {
      // canvasX 60 days after the scale origin (Mon May 18) → Fri Jul 17.
      const next = reduce(unscheduledState, { type: 'mousemove', cursorX: 200, canvasX: 60 * 14 }, ts2, blackout)
      expect(preview(next)).toEqual([D(18) + 60 * DAY, D(18) + 61 * DAY])
    })

    it('never previews a non-working day as a snapped result', () => {
      for (let days = -5; days <= 160; days++) {
        const [s, e] = preview(
          reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 200 + days * 14 }, ts, blackout)
        )
        const calendarDays = s === D(18) + days * DAY && e === D(20) + days * DAY
        if (!calendarDays) {
          expect(inBlackout(s)).toBe(false)
          expect(inBlackout(e)).toBe(false)
        }
      }
    })
  })

  it('a non-finite cursor position terminates without a working-day loop', () => {
    const next = reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: NaN }, ts, cfgMonFri)
    expect(next.kind).toBe('dragging-body')
    const [start, end] = preview(next)
    expect(start).toBeNaN()
    expect(end).toBeNaN()
  })

  it('a milestone target snaps like an issue in the reducer (the adapter decides)', () => {
    const milestone: TestItem = { _id: 'ms-2', _class: 'tracker:class:Milestone', targetDate: D(20) }
    const next = reduce(
      { ...bodyState(D(18), D(20)), target: { kind: 'milestone', doc: milestone } } as unknown as DragState,
      { type: 'mousemove', cursorX: 270 },
      ts,
      cfgMonFri
    )
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.target.kind).toBe('milestone')
    expect(preview(next)).toEqual([D(25), D(27)])
  })

  describe('calendarDays override (Shift held during the drag)', () => {
    const free = { type: 'mousemove', cursorX: 270, calendarDays: true } as const
    const suspended = (s: DragState): boolean | undefined => ('snapSuspended' in s ? s.snapSuspended : undefined)

    it('a body drag onto a Saturday stays on Saturday and keeps the calendar length', () => {
      const next = reduce(bodyState(D(18), D(20)), free, ts, cfgMonFri)
      expect(preview(next)).toEqual([D(23), D(25)])
      expect(suspended(next)).toBe(true)
    })

    it('resize handles follow the pointer onto non-working days', () => {
      const left = reduce(
        leftState(D(18), D(19)),
        { type: 'mousemove', cursorX: 172, calendarDays: true },
        ts,
        cfgMonFri
      )
      expect(preview(left)[0]).toBe(D(16))
      expect(suspended(left)).toBe(true)
      const right = reduce(
        rightState(D(18), D(21)),
        { type: 'mousemove', cursorX: 228, calendarDays: true },
        ts,
        cfgMonFri
      )
      expect(preview(right)[1]).toBe(D(23))
      expect(suspended(right)).toBe(true)
    })

    it('an unscheduled drop on a Saturday starts on Saturday and lasts two calendar days', () => {
      const next = reduce(
        unscheduledState,
        { type: 'mousemove', cursorX: 200, canvasX: 5 * 14, calendarDays: true },
        ts2,
        cfgMonFri
      )
      expect(preview(next)).toEqual([D(23), D(24)])
      expect(suspended(next)).toBe(true)
    })

    it('toggling the override mid-drag switches the preview at the same pointer position', () => {
      const snapped = reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 270 }, ts, cfgMonFri)
      expect(preview(snapped)).toEqual([D(25), D(27)])
      expect(suspended(snapped)).toBeUndefined()
      const pressed = reduce(snapped, free, ts, cfgMonFri)
      expect(preview(pressed)).toEqual([D(23), D(25)])
      expect(suspended(pressed)).toBe(true)
      const released = reduce(pressed, { type: 'mousemove', cursorX: 270, calendarDays: false }, ts, cfgMonFri)
      expect(preview(released)).toEqual([D(25), D(27)])
      expect(suspended(released)).toBeUndefined()
      expect('snapSuspended' in released).toBe(false)
    })

    it('toggling mid-resize switches between the snapped and the raw handle position', () => {
      const snapped = reduce(rightState(D(18), D(21)), { type: 'mousemove', cursorX: 228 }, ts, cfgMonFri)
      expect(preview(snapped)[1]).toBe(D(22))
      const pressed = reduce(snapped, { type: 'mousemove', cursorX: 228, calendarDays: true }, ts, cfgMonFri)
      expect(preview(pressed)[1]).toBe(D(23))
      const released = reduce(pressed, { type: 'mousemove', cursorX: 228 }, ts, cfgMonFri)
      expect(preview(released)[1]).toBe(D(22))
    })

    it('without a calendar the override changes nothing and is not flagged', () => {
      const plain = reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 270 }, ts)
      const next = reduce(bodyState(D(18), D(20)), free, ts)
      expect(next).toEqual(plain)
      expect('snapSuspended' in next).toBe(false)
      const right = reduce(rightState(D(18), D(21)), { type: 'mousemove', cursorX: 228, calendarDays: true }, ts)
      expect(preview(right)[1]).toBe(D(23))
      expect('snapSuspended' in right).toBe(false)
    })

    it('a co-drag is unaffected and not flagged (it never snaps)', () => {
      const dragging: DragState = {
        kind: 'dragging-body',
        target: issueTarget,
        originStart: D(18),
        originEnd: D(20),
        cursorStartX: 200,
        previewStart: D(18),
        previewEnd: D(20),
        coDrag: {
          anchorDeltaMs: 0,
          members: [{ issueId: issue._id, originStart: D(18), originEnd: D(20) }],
          minDeltaMs: -2 * 86_400_000,
          maxDeltaMs: 5 * 86_400_000
        }
      }
      const next = reduce(dragging, { type: 'mousemove', cursorX: 284, calendarDays: true }, ts, cfgMonFri)
      expect(preview(next)).toEqual([D(23), D(25)])
      expect('snapSuspended' in next).toBe(false)
    })
  })

  describe('dragCalendar', () => {
    it('returns the calendar unless the active drag suspended snapping', () => {
      expect(dragCalendar(bodyState(D(18), D(20)), cfgMonFri)).toBe(cfgMonFri)
      const pressed = reduce(
        bodyState(D(18), D(20)),
        { type: 'mousemove', cursorX: 270, calendarDays: true },
        ts,
        cfgMonFri
      )
      expect(dragCalendar(pressed, cfgMonFri)).toBeUndefined()
      expect(dragCalendar(pressed, undefined)).toBeUndefined()
      expect(dragCalendar({ kind: 'idle' }, cfgMonFri)).toBe(cfgMonFri)
    })
  })

  describe('modifierSyncMove (Shift released outside the window)', () => {
    const last = { cursorX: 270 }

    it('a blur or a release without Shift un-suspends the drag at the last position, so the commit snaps', () => {
      const pressed = reduce(
        bodyState(D(18), D(20)),
        { type: 'mousemove', cursorX: 270, calendarDays: true },
        ts,
        cfgMonFri
      )
      expect(preview(pressed)).toEqual([D(23), D(25)])
      const move = modifierSyncMove(pressed, false, last)
      expect(move).toEqual({ type: 'mousemove', cursorX: 270, canvasX: undefined, calendarDays: false })
      const synced = reduce(pressed, move as NonNullable<typeof move>, ts, cfgMonFri)
      expect(preview(synced)).toEqual([D(25), D(27)])
      expect('snapSuspended' in synced).toBe(false)
      expect(dragCalendar(synced, cfgMonFri)).toBe(cfgMonFri)
    })

    it('a release still holding Shift keeps the suspended preview (nothing to replay)', () => {
      const pressed = reduce(
        bodyState(D(18), D(20)),
        { type: 'mousemove', cursorX: 270, calendarDays: true },
        ts,
        cfgMonFri
      )
      expect(modifierSyncMove(pressed, true, last)).toBeUndefined()
    })

    it('a Shift press on a snapped drag replays the move with the override', () => {
      const snapped = reduce(bodyState(D(18), D(20)), { type: 'mousemove', cursorX: 270 }, ts, cfgMonFri)
      expect(modifierSyncMove(snapped, false, last)).toBeUndefined()
      const move = modifierSyncMove(snapped, true, last)
      expect(move?.calendarDays).toBe(true)
      expect(preview(reduce(snapped, move as NonNullable<typeof move>, ts, cfgMonFri))).toEqual([D(23), D(25)])
    })

    it('keeps canvasX for an unscheduled drop and does nothing without a drag or a prior move', () => {
      const pressed = reduce(
        unscheduledState,
        { type: 'mousemove', cursorX: 200, canvasX: 5 * 14, calendarDays: true },
        ts2,
        cfgMonFri
      )
      expect(modifierSyncMove(pressed, false, { cursorX: 200, canvasX: 5 * 14 })?.canvasX).toBe(5 * 14)
      expect(modifierSyncMove(pressed, false, undefined)).toBeUndefined()
      expect(modifierSyncMove({ kind: 'idle' }, false, last)).toBeUndefined()
    })
  })
})
