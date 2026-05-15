//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { reduce } from '../drag-controller'
import { createTimeScale, snapToUtcMidnight } from '../time-scale'
import type { DragState } from '../types'

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
      { type: 'mousedown-bar', issue, edge: 'body', cursorX: 200 },
      ts
    )
    expect(next.kind).toBe('dragging-body')
    if (next.kind !== 'dragging-body') return
    expect(next.issue._id).toBe(issue._id)
    expect(next.originStart).toBe(issue.startDate)
    expect(next.originDue).toBe(issue.dueDate)
    expect(next.cursorStartX).toBe(200)
    expect(next.previewStart).toBe(issue.startDate)
    expect(next.previewDue).toBe(issue.dueDate)
  })

  it('mousemove shifts both preview dates by snapped delta', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      issue,
      originStart: issue.startDate as number,
      originDue: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: issue.startDate as number,
      previewDue: issue.dueDate as number
    }
    // Week-zoom = 14 px/day → 28 px = 2 days
    const next = reduce(dragging, { type: 'mousemove', cursorX: 228 }, ts)
    if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
    expect(next.previewStart).toBe((issue.startDate as number) + 2 * 86_400_000)
    expect(next.previewDue).toBe((issue.dueDate as number) + 2 * 86_400_000)
  })

  it('mouseup returns dragging-body → idle', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      issue,
      originStart: issue.startDate as number,
      originDue: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: issue.startDate as number,
      previewDue: issue.dueDate as number
    }
    const next = reduce(dragging, { type: 'mouseup' }, ts)
    expect(next).toEqual({ kind: 'idle' })
  })

  it('cancel returns dragging-body → idle without applying the move', () => {
    const dragging: DragState = {
      kind: 'dragging-body',
      issue,
      originStart: issue.startDate as number,
      originDue: issue.dueDate as number,
      cursorStartX: 200,
      previewStart: (issue.startDate as number) + 5 * 86_400_000,
      previewDue: (issue.dueDate as number) + 5 * 86_400_000
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
      { type: 'mousedown-bar', issue, edge: 'left', cursorX: 50 },
      ts
    )
    expect(next.kind).toBe('resizing-left')
    if (next.kind !== 'resizing-left') return
    expect(next.previewStart).toBe(issue.startDate)
    expect(next.originDue).toBe(issue.dueDate)
  })

  it('resize-left mousemove updates previewStart but not originDue', () => {
    const resizing: DragState = {
      kind: 'resizing-left',
      issue,
      originStart: issue.startDate as number,
      originDue: issue.dueDate as number,
      cursorStartX: 50,
      previewStart: issue.startDate as number
    }
    // 14 px = 1 day at week zoom
    const next = reduce(resizing, { type: 'mousemove', cursorX: 64 }, ts)
    if (next.kind !== 'resizing-left') throw new Error('expected resizing-left')
    expect(next.previewStart).toBe((issue.startDate as number) + 1 * 86_400_000)
  })

  it('resize-left clamps previewStart to be ≤ originDue', () => {
    const resizing: DragState = {
      kind: 'resizing-left',
      issue,
      originStart: issue.startDate as number,
      originDue: issue.dueDate as number,
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
      { type: 'mousedown-bar', issue, edge: 'right', cursorX: 250 },
      ts
    )
    expect(next.kind).toBe('resizing-right')
    if (next.kind !== 'resizing-right') return
    expect(next.previewDue).toBe(issue.dueDate)
    expect(next.originStart).toBe(issue.startDate)
  })

  it('resize-right mousemove updates previewDue but not originStart', () => {
    const resizing: DragState = {
      kind: 'resizing-right',
      issue,
      originStart: issue.startDate as number,
      originDue: issue.dueDate as number,
      cursorStartX: 250,
      previewDue: issue.dueDate as number
    }
    const next = reduce(resizing, { type: 'mousemove', cursorX: 264 }, ts)
    if (next.kind !== 'resizing-right') throw new Error('expected resizing-right')
    expect(next.previewDue).toBe((issue.dueDate as number) + 1 * 86_400_000)
  })

  it('resize-right clamps previewDue to be ≥ originStart', () => {
    const resizing: DragState = {
      kind: 'resizing-right',
      issue,
      originStart: issue.startDate as number,
      originDue: issue.dueDate as number,
      cursorStartX: 250,
      previewDue: issue.dueDate as number
    }
    // Move 100 days left — past the start
    const next = reduce(resizing, { type: 'mousemove', cursorX: 250 - 100 * 14 }, ts)
    if (next.kind !== 'resizing-right') throw new Error('expected resizing-right')
    expect(next.previewDue).toBe(issue.startDate)
  })
})
