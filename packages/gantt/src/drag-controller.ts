//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { DragEvent, DragState, DragTarget, GanttItem, WorkingCalendar } from './types'
import { snapToUtcMidnight } from './time-scale'
import type { TimeScale } from './time-scale'
import {
  MAX_WORKING_SPAN_DAYS,
  dueForSpan,
  findWorkingDay,
  isWorkingDay,
  workingDaySpan,
  workingDaysPerWeek
} from './working-days'

/**
 * Pure reduction over drag state. Given the current state and an input event
 * (mouse or cancel), returns the next state. No IO; no DOM access; the time
 * scale is passed in as a value so the reducer is fully deterministic and
 * trivially testable.
 *
 * The reducer is doc-agnostic: it operates only on origin / preview dates
 * and the captured drag target. `target.kind` (issue vs milestone) is
 * threaded through unchanged so commitDrag (in GanttView.svelte) can route
 * to the right update field.
 *
 * With a `calendar`, previews of single-bar body drags, resizes and drops
 * land on working days (see `reduceFromActive`); a co-drag and any call
 * without a calendar are unchanged.
 */
export function reduce<TTarget extends DragTarget = DragTarget, TNode extends GanttItem = GanttItem> (
  state: DragState<TTarget, TNode>,
  event: DragEvent<TTarget, TNode>,
  timeScale: TimeScale,
  calendar?: WorkingCalendar
): DragState<TTarget, TNode> {
  // The reducer is doc-agnostic: it only copies the `target` / `source` /
  // `hoveredBar` payloads through and reads their `_id`. Running the concrete
  // implementation and re-asserting the generic parameters is therefore sound —
  // whatever specific target/node the caller fed in is exactly what comes back.
  return reduceImpl(
    state as unknown as DragState,
    event as unknown as DragEvent,
    timeScale,
    calendar
  ) as unknown as DragState<TTarget, TNode>
}

function reduceImpl (
  state: DragState,
  event: DragEvent,
  timeScale: TimeScale,
  calendar: WorkingCalendar | undefined
): DragState {
  switch (state.kind) {
    case 'idle':
      return reduceFromIdle(state, event)
    case 'hover-bar':
      return reduceFromHover(state, event, timeScale)
    case 'dragging-body':
    case 'dragging-unscheduled':
    case 'resizing-left':
    case 'resizing-right':
      return reduceFromActive(state, event, timeScale, calendar)
    case 'connector-drawing':
    case 'connector-target-hover':
      return reduceFromConnector(state, event)
  }
}

function reduceFromIdle (state: DragState & { kind: 'idle' }, event: DragEvent): DragState {
  if (event.type === 'mouseenter-bar') {
    return { kind: 'hover-bar', issueId: event.issueId, edge: event.edge }
  }
  // Allow direct idle → drag in one step. Real users always pass through
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
      // when the mousedown carries a co-drag payload we
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

function reduceFromHover (state: DragState & { kind: 'hover-bar' }, event: DragEvent, timeScale: TimeScale): DragState {
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

/**
 * The calendar the active drag snaps to, or `undefined` for calendar-day
 * behaviour. Degenerate cases fall back to calendar days: a calendar without
 * any working weekday (nothing to snap to) and a bar whose origin is not a
 * finite range of at most {@link MAX_WORKING_SPAN_DAYS} days (its working-day
 * span could not be measured within the helpers' bounds).
 */
function snapCalendar (state: DragState, calendar: WorkingCalendar | undefined): WorkingCalendar | undefined {
  if (calendar === undefined || workingDaysPerWeek(calendar) === 0) return undefined
  if (state.kind === 'dragging-body') {
    const spanDays = (state.originEnd - state.originStart) / 86_400_000
    if (!(spanDays >= 0 && spanDays <= MAX_WORKING_SPAN_DAYS)) return undefined
  }
  return calendar
}

function reduceFromActive (
  state: DragState,
  event: DragEvent,
  timeScale: TimeScale,
  requestedCalendar: WorkingCalendar | undefined
): DragState {
  if (event.type === 'mouseup' || event.type === 'cancel') {
    return { kind: 'idle' }
  }
  if (event.type !== 'mousemove') return state
  const calendar = snapCalendar(state, requestedCalendar)

  if (state.kind === 'dragging-body') {
    const deltaPx = event.cursorX - state.cursorStartX
    const rawDeltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    // when a co-drag is active, clamp the raw delta to the
    // shared min/max window — the hard-stop semantic. Snap
    // is computed against the clamped delta so the entire group lands on
    // identical UTC-midnight boundaries.
    // The shared delta stays in calendar days even with a calendar: the
    // hard-stop window is a millisecond window, so per-member working-day
    // snapping could breach it (bulk snapping is a follow-up).
    if (state.coDrag !== undefined) {
      const clampedDeltaMs = Math.max(state.coDrag.minDeltaMs, Math.min(state.coDrag.maxDeltaMs, rawDeltaMs))
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
    const candidate = snapToUtcMidnight(state.originStart + rawDeltaMs)
    // Working-days mode: the start lands on the nearest working day in the
    // drag direction and the bar keeps its length in working days, so it can
    // never start or end on a weekend or holiday. A zero-delta move is left
    // untouched so a click without movement commits nothing, and when no
    // working day is reachable (a holiday blackout longer than the search
    // window) the bar moves in calendar days rather than onto a non-working
    // day presented as snapped.
    if (calendar !== undefined && candidate !== snapToUtcMidnight(state.originStart)) {
      const previewStart = findWorkingDay(candidate, rawDeltaMs < 0 ? -1 : 1, calendar)
      if (previewStart !== undefined) {
        const span = workingDaySpan(state.originStart, state.originEnd, calendar)
        const previewEnd = dueForSpan(previewStart, span, calendar)
        if (isWorkingDay(previewEnd, calendar)) return { ...state, previewStart, previewEnd }
      }
    }
    return {
      ...state,
      previewStart: candidate,
      previewEnd: snapToUtcMidnight(state.originEnd + rawDeltaMs)
    }
  }

  if (state.kind === 'resizing-left') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    const candidate = snapToUtcMidnight(state.originStart + deltaMs)
    // The start handle rounds up to the next working day (ceiling): with the
    // pointer on a non-working day the start lands after it, so the bar is
    // never extended onto a non-working day. No working day in reach: the
    // handle follows the pointer in calendar days.
    const snapped =
      calendar === undefined || candidate === snapToUtcMidnight(state.originStart)
        ? candidate
        : (findWorkingDay(candidate, 1, calendar) ?? candidate)
    // Clamp so previewStart never crosses originEnd (would invert the bar).
    return { ...state, previewStart: Math.min(snapped, state.originEnd) }
  }

  if (state.kind === 'resizing-right') {
    const deltaPx = event.cursorX - state.cursorStartX
    const deltaMs = (deltaPx / timeScale.pxPerDay) * 86_400_000
    const candidate = snapToUtcMidnight(state.originEnd + deltaMs)
    // The end handle rounds down to the previous working day (floor): with the
    // pointer on a non-working day the end stays before it. No working day in
    // reach: the handle follows the pointer in calendar days.
    const snapped =
      calendar === undefined || candidate === snapToUtcMidnight(state.originEnd)
        ? candidate
        : (findWorkingDay(candidate, -1, calendar) ?? candidate)
    return { ...state, previewEnd: Math.max(snapped, state.originStart) }
  }

  if (state.kind === 'dragging-unscheduled') {
    // Only update the preview when the cursor is actually over the canvas.
    if (event.canvasX === undefined) return state
    const dropped = snapToUtcMidnight(timeScale.fromX(event.canvasX))
    // With a calendar the drop starts on the next working day and the default
    // two-day span counts working days; with no working day in reach it keeps
    // the calendar-day drop.
    let newStart = dropped
    let newEnd = dropped + 86_400_000
    if (calendar !== undefined) {
      const workingStart = findWorkingDay(dropped, 1, calendar)
      const workingEnd = workingStart === undefined ? undefined : dueForSpan(workingStart, 2, calendar)
      if (workingStart !== undefined && workingEnd !== undefined && isWorkingDay(workingEnd, calendar)) {
        newStart = workingStart
        newEnd = workingEnd
      }
    }
    return {
      ...state,
      previewStart: newStart,
      previewEnd: newEnd,
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
