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
  // Stub implementations filled in by later tasks.
  void event
  void timeScale
  return state
}

function reduceFromActive (state: DragState, event: DragEvent, timeScale: TimeScale): DragState {
  // Stub implementations filled in by later tasks.
  void event
  void timeScale
  return state
}

/** Convenience helper used by later tasks to clamp a date to a UTC midnight. */
export function snapDate (t: number): number {
  return snapToUtcMidnight(t)
}
