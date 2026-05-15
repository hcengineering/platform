//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { DragEvent, DragState } from './types'
import { snapToUtcMidnight } from './time-scale'
import type { TimeScale } from './time-scale'

/**
 * Pure reduction over drag state. Given the current state and an input event
 * (mouse or cancel), returns the next state. No IO; no DOM access; the time
 * scale is passed in as a value so the reducer is fully deterministic and
 * trivially testable.
 */
export function reduce (state: DragState, event: DragEvent, timeScale: TimeScale): DragState {
  switch (state.kind) {
    case 'idle':
      return reduceFromIdle(state, event)
    case 'hover-bar':
      return reduceFromHover(state, event, timeScale)
    case 'dragging-body':
    case 'dragging-unscheduled':
    case 'resizing-left':
    case 'resizing-right':
      return reduceFromActive(state, event, timeScale)
  }
}

function reduceFromIdle (state: DragState & { kind: 'idle' }, event: DragEvent): DragState {
  if (event.type === 'mouseenter-bar') {
    return { kind: 'hover-bar', issueId: event.issueId, edge: event.edge }
  }
  if (event.type === 'mousedown-unscheduled') {
    // Default to "today" for both dates; cursor movement during the drag
    // shifts them in lockstep just like dragging-body. originStart/originDue
    // are recorded so commitDrag() and the resize-overlay can share the same
    // code path as dragging-body. hasCanvasTarget starts false — only a real
    // mousemove with canvasX flips it true and unlocks the commit.
    const today = snapToUtcMidnight(Date.now())
    return {
      kind: 'dragging-unscheduled',
      issue: event.issue,
      originStart: today,
      originDue: today + 86_400_000,
      cursorStartX: event.cursorX,
      previewStart: today,
      previewDue: today + 86_400_000,
      hasCanvasTarget: false
    }
  }
  return state
}

function reduceFromHover (
  state: DragState & { kind: 'hover-bar' },
  event: DragEvent,
  timeScale: TimeScale
): DragState {
  if (event.type === 'mouseleave-bar') {
    return { kind: 'idle' }
  }
  if (event.type === 'mousedown-bar') {
    if (event.issue.startDate == null || event.issue.dueDate == null) return state
    const base = {
      issue: event.issue,
      originStart: event.issue.startDate,
      originDue: event.issue.dueDate,
      cursorStartX: event.cursorX
    }
    if (event.edge === 'body') {
      return {
        kind: 'dragging-body',
        ...base,
        previewStart: event.issue.startDate,
        previewDue: event.issue.dueDate
      }
    }
    if (event.edge === 'left') {
      return { kind: 'resizing-left', ...base, previewStart: event.issue.startDate }
    }
    if (event.edge === 'right') {
      return { kind: 'resizing-right', ...base, previewDue: event.issue.dueDate }
    }
  }
  void timeScale
  return state
}

function reduceFromActive (state: DragState, event: DragEvent, timeScale: TimeScale): DragState {
  if (event.type === 'mouseup' || event.type === 'cancel') {
    return { kind: 'idle' }
  }
  if (event.type !== 'mousemove') return state

  if (state.kind === 'dragging-body') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    return {
      ...state,
      previewStart: snapToUtcMidnight(state.originStart + deltaMs),
      previewDue: snapToUtcMidnight(state.originDue + deltaMs)
    }
  }

  if (state.kind === 'resizing-left') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    const candidate = snapToUtcMidnight(state.originStart + deltaMs)
    // Clamp so previewStart never crosses originDue (would invert the bar).
    return { ...state, previewStart: Math.min(candidate, state.originDue) }
  }

  if (state.kind === 'resizing-right') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    const candidate = snapToUtcMidnight(state.originDue + deltaMs)
    return { ...state, previewDue: Math.max(candidate, state.originStart) }
  }

  if (state.kind === 'dragging-unscheduled') {
    // Only update the preview when the cursor is actually over the canvas.
    if (event.canvasX === undefined) return state
    const newStart = snapToUtcMidnight(timeScale.fromX(event.canvasX))
    return {
      ...state,
      previewStart: newStart,
      previewDue: newStart + 86_400_000,
      hasCanvasTarget: true
    }
  }

  return state
}

/** Convenience helper used by later tasks to clamp a date to a UTC midnight. */
export function snapDate (t: number): number {
  return snapToUtcMidnight(t)
}
