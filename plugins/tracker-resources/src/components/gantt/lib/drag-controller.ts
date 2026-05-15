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
  if (event.type === 'mousedown-bar' && event.edge === 'body') {
    if (event.issue.startDate == null || event.issue.dueDate == null) return state
    return {
      kind: 'dragging-body',
      issue: event.issue,
      originStart: event.issue.startDate,
      originDue: event.issue.dueDate,
      cursorStartX: event.cursorX,
      previewStart: event.issue.startDate,
      previewDue: event.issue.dueDate
    }
  }
  void timeScale
  return state
}

function reduceFromActive (state: DragState, event: DragEvent, timeScale: TimeScale): DragState {
  if (event.type === 'mouseup' || event.type === 'cancel') {
    return { kind: 'idle' }
  }
  if (event.type === 'mousemove' && state.kind === 'dragging-body') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    return {
      ...state,
      previewStart: snapToUtcMidnight(state.originStart + deltaMs),
      previewDue: snapToUtcMidnight(state.originDue + deltaMs)
    }
  }
  return state
}

/** Convenience helper used by later tasks to clamp a date to a UTC midnight. */
export function snapDate (t: number): number {
  return snapToUtcMidnight(t)
}
