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
 *
 * The reducer is doc-agnostic: it operates only on origin / preview dates
 * and the captured drag target. `target.kind` (issue vs milestone) is
 * threaded through unchanged so commitDrag (in GanttView.svelte) can route
 * to the right update field — PR3.3 (2026-05-11).
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
    case 'connector-drawing':
    case 'connector-target-hover':
      return reduceFromConnector(state, event)
  }
}

function reduceFromIdle (state: DragState & { kind: 'idle' }, event: DragEvent): DragState {
  if (event.type === 'mouseenter-bar') {
    return { kind: 'hover-bar', issueId: event.issueId, edge: event.edge }
  }
  // PR 3: allow direct idle → drag in one step. Real users always pass through
  // hover-bar first (mouseenter fires before mousedown), but synthetic event
  // dispatch (Playwright tests) and edge-cases where the bar is summoned under
  // the cursor (e.g. after a re-render) can skip the hover state. Treat
  // mousedown-bar as the start of a drag regardless.
  if (event.type === 'mousedown-bar') {
    const base = {
      target: event.target,
      originStart: event.originStart,
      originEnd: event.originEnd,
      cursorStartX: event.cursorX
    }
    if (event.edge === 'body') {
      // Tier-2 Item 6: when the mousedown carries a co-drag payload we
      // mount it into the dragging-body state with anchorDeltaMs = 0. The
      // reducer's mousemove branch maintains it from there.
      return {
        kind: 'dragging-body',
        ...base,
        previewStart: event.originStart,
        previewEnd: event.originEnd,
        ...(event.coDrag !== undefined
          ? {
              coDrag: {
                anchorDeltaMs: 0,
                members: event.coDrag.members,
                minDeltaMs: event.coDrag.minDeltaMs,
                maxDeltaMs: event.coDrag.maxDeltaMs
              }
            }
          : {})
      }
    }
    if (event.edge === 'left') {
      return { kind: 'resizing-left', ...base, previewStart: event.originStart }
    }
    if (event.edge === 'right') {
      return { kind: 'resizing-right', ...base, previewEnd: event.originEnd }
    }
  }
  if (event.type === 'mousedown-unscheduled') {
    // Default to "today" for both dates; cursor movement during the drag
    // shifts them in lockstep just like dragging-body. originStart/originEnd
    // are recorded so commitDrag() and the resize-overlay can share the same
    // code path as dragging-body. hasCanvasTarget starts false — only a real
    // mousemove with canvasX flips it true and unlocks the commit.
    const today = snapToUtcMidnight(Date.now())
    return {
      kind: 'dragging-unscheduled',
      target: event.target,
      originStart: today,
      originEnd: today + 86_400_000,
      cursorStartX: event.cursorX,
      previewStart: today,
      previewEnd: today + 86_400_000,
      hasCanvasTarget: false
    }
  }
  if (event.type === 'mousedown-connector') {
    return {
      kind: 'connector-drawing',
      source: event.source,
      originPx: event.originPx,
      cursorPx: event.cursorPx
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
    const base = {
      target: event.target,
      originStart: event.originStart,
      originEnd: event.originEnd,
      cursorStartX: event.cursorX
    }
    if (event.edge === 'body') {
      return {
        kind: 'dragging-body',
        ...base,
        previewStart: event.originStart,
        previewEnd: event.originEnd,
        ...(event.coDrag !== undefined
          ? {
              coDrag: {
                anchorDeltaMs: 0,
                members: event.coDrag.members,
                minDeltaMs: event.coDrag.minDeltaMs,
                maxDeltaMs: event.coDrag.maxDeltaMs
              }
            }
          : {})
      }
    }
    if (event.edge === 'left') {
      return { kind: 'resizing-left', ...base, previewStart: event.originStart }
    }
    if (event.edge === 'right') {
      return { kind: 'resizing-right', ...base, previewEnd: event.originEnd }
    }
  }
  if (event.type === 'mousedown-connector') {
    return {
      kind: 'connector-drawing',
      source: event.source,
      originPx: event.originPx,
      cursorPx: event.cursorPx
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
    const rawDeltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    // Tier-2 Item 6: when a co-drag is active, clamp the raw delta to the
    // shared min/max window — the hard-stop semantic from the spec. Snap
    // is computed against the clamped delta so the entire group lands on
    // identical UTC-midnight boundaries.
    if (state.coDrag !== undefined) {
      const clampedDeltaMs = Math.max(
        state.coDrag.minDeltaMs,
        Math.min(state.coDrag.maxDeltaMs, rawDeltaMs)
      )
      const previewStart = snapToUtcMidnight(state.originStart + clampedDeltaMs)
      const previewEnd = snapToUtcMidnight(state.originEnd + clampedDeltaMs)
      // anchorDeltaMs tracks the snapped delta from the leading bar so that
      // every other member's preview = origin + anchorDeltaMs lands on the
      // same midnight grid.
      const anchorDeltaMs = previewStart - state.originStart
      return {
        ...state,
        previewStart,
        previewEnd,
        coDrag: { ...state.coDrag, anchorDeltaMs }
      }
    }
    return {
      ...state,
      previewStart: snapToUtcMidnight(state.originStart + rawDeltaMs),
      previewEnd: snapToUtcMidnight(state.originEnd + rawDeltaMs)
    }
  }

  if (state.kind === 'resizing-left') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    const candidate = snapToUtcMidnight(state.originStart + deltaMs)
    // Clamp so previewStart never crosses originEnd (would invert the bar).
    return { ...state, previewStart: Math.min(candidate, state.originEnd) }
  }

  if (state.kind === 'resizing-right') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    const candidate = snapToUtcMidnight(state.originEnd + deltaMs)
    return { ...state, previewEnd: Math.max(candidate, state.originStart) }
  }

  if (state.kind === 'dragging-unscheduled') {
    // Only update the preview when the cursor is actually over the canvas.
    if (event.canvasX === undefined) return state
    const newStart = snapToUtcMidnight(timeScale.fromX(event.canvasX))
    return {
      ...state,
      previewStart: newStart,
      previewEnd: newStart + 86_400_000,
      hasCanvasTarget: true
    }
  }

  return state
}

function reduceFromConnector (
  state: DragState & { kind: 'connector-drawing' | 'connector-target-hover' },
  event: DragEvent
): DragState {
  if (event.type === 'mouseup-connector' || event.type === 'cancel') {
    return { kind: 'idle' }
  }
  if (event.type !== 'mousemove-connector') return state

  // Drag self → keep drawing (a relation from a bar to itself is meaningless;
  // we don't even attempt a target-hover state, so wouldCreateCycle never
  // sees that edge).
  if (event.hoveredBar !== null && event.hoveredBar._id === state.source._id) {
    return {
      kind: 'connector-drawing',
      source: state.source,
      originPx: state.originPx,
      cursorPx: event.cursorPx
    }
  }

  if (event.hoveredBar === null) {
    return {
      kind: 'connector-drawing',
      source: state.source,
      originPx: state.originPx,
      cursorPx: event.cursorPx
    }
  }

  return {
    kind: 'connector-target-hover',
    source: state.source,
    originPx: state.originPx,
    cursorPx: event.cursorPx,
    target: event.hoveredBar
  }
}

/** Convenience helper used by later tasks to clamp a date to a UTC midnight. */
export function snapDate (t: number): number {
  return snapToUtcMidnight(t)
}
