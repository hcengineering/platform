//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Ref } from '@hcengineering/core'
import { type Issue, type IssueRelation, type Component as TrackerComponent, type Milestone } from '@hcengineering/tracker'

/** Zoom presets — controls pxPerDay and header tick density. */
export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter'

/** A single tick on the time-axis header (vertical gridline + label). */
export interface Tick {
  date: number             // UTC ms
  label: string            // pre-formatted, locale-aware (primary row)
  level: 'major' | 'minor' // major ticks render thicker + with text label
  /**
   * Optional supra-label rendered on a second header row above `label` when
   * the segment changes from the previous tick. Day view sets it to month
   * name on the 1st of each month; week view sets it to the year on the
   * first week of each year; month view sets it to the year on January;
   * quarter view sets it to the year on Q1.
   */
  secondaryLabel?: string
}

/** A row in the flattened layout. May be an issue, milestone, swimlane header,
 *  or — when Phase-3b Group-By is active — a synthetic group-header row. */
export interface LayoutRow {
  kind: 'issue' | 'milestone' | 'component-swimlane' | 'group-header'
  /** Stable key for keyed each-blocks and the collapsed-set. */
  id: string
  /** Y-coord top-edge of the row in canvas pixels. */
  y: number
  /** Row height in pixels. */
  height: number
  /** Tree depth — 0 for top-level rows. */
  depth: number
  /** Whether this row is currently rendered (vs virtually skipped). */
  visible: boolean
  /** The issue this row represents — null for milestone/swimlane/group rows. */
  issue: Issue | null
  /** The milestone this row represents — null for issue/swimlane/group rows. */
  milestone: MilestoneMarker | null
  /** The component this swimlane represents — null otherwise. */
  component: Ref<TrackerComponent> | null
  /** True iff this row has children (renders as summary "claw" bar). */
  isSummary: boolean
  /** True iff this row has children and the user can collapse/expand it. */
  collapsible: boolean
  /** True iff currently collapsed (children hidden). */
  collapsed: boolean
  /**
   * Phase 3b — Group-by metadata. Only present on `kind === 'group-header'`
   * rows AND on the issue rows that belong to a group (so the canvas can
   * tint the lane). Undefined when group-by is off (legacy view).
   */
  groupKey?: string
  groupLabel?: string
  groupCount?: number
}

/** Cached aggregate dates of a parent issue's children, for summary-bar rendering. */
export interface SummaryRange {
  startDate: number | null
  dueDate: number | null
}

/** Compact view of a Milestone for the canvas overlay. */
export interface MilestoneMarker {
  _id: Ref<Milestone>
  label: string
  startDate: number | null
  targetDate: number
}

/** Which part of a bar is being interacted with. */
export type DragKind = 'body' | 'left' | 'right' | 'unscheduled'

/**
 * Discriminated union of what's being dragged. Issues and Milestones are
 * both date-ranged docs but use different field names (Issue: dueDate /
 * Milestone: targetDate), and Milestone-cascade hits assigned-issues
 * rather than descendant issues. The drag-controller reducer is doc-
 * agnostic — it only uses originStart / originEnd / cursor deltas; the
 * `target` field is preserved verbatim so commitDrag can branch on
 * `target.kind` to write the right field and run the right cascade.
 *
 * Added PR3.3 (2026-05-11). Issue-only payloads from PR3 still work
 * unchanged: callers wrap with `{ kind: 'issue', doc }` at the dispatch
 * boundary.
 */
export type DragTarget =
  | { kind: 'issue', doc: Issue }
  | { kind: 'milestone', doc: Milestone }

/** Discriminated state of the live drag/resize interaction. */
export type DragState =
  | { kind: 'idle' }
  | { kind: 'hover-bar', issueId: Ref<Issue> | Ref<Milestone>, edge: 'left' | 'right' | 'body' | 'none' }
  | {
      kind: 'dragging-body'
      target: DragTarget
      originStart: number
      originEnd: number
      cursorStartX: number
      previewStart: number
      previewEnd: number
    }
  | {
      kind: 'resizing-left'
      target: DragTarget
      originStart: number
      originEnd: number
      cursorStartX: number
      previewStart: number
    }
  | {
      kind: 'resizing-right'
      target: DragTarget
      originStart: number
      originEnd: number
      cursorStartX: number
      previewEnd: number
    }
  | {
      kind: 'dragging-unscheduled'
      target: DragTarget
      /** Anchor date the drag was started from (defaults to today at UTC midnight). */
      originStart: number
      /** originStart + 1 day; used for ghost-outline / commit symmetry with dragging-body. */
      originEnd: number
      cursorStartX: number
      previewStart: number
      previewEnd: number
      /**
       * True once the cursor has been over the canvas during the drag and a real
       * canvas-X has been observed. Guards against the click-without-drag case
       * where mouseup fires before the user has moved over the canvas — committing
       * such a "drag" would schedule the issue to today silently. `commitDrag`
       * treats `dragging-unscheduled && !hasCanvasTarget` as a no-op.
       */
      hasCanvasTarget: boolean
    }
  | {
      kind: 'connector-drawing'
      /** Source issue the user is drawing the dependency from. */
      source: Issue
      /** Pixel x/y of the connector-dot on the source bar (where the curve starts). */
      originPx: { x: number, y: number }
      /** Live cursor x/y in canvas-content coordinates (where the curve ends). */
      cursorPx: { x: number, y: number }
    }
  | {
      kind: 'connector-target-hover'
      source: Issue
      originPx: { x: number, y: number }
      cursorPx: { x: number, y: number }
      /** Candidate target issue under the pointer. */
      target: Issue
    }

/**
 * Input events fed into the drag-controller reducer.
 *
 * Coordinate spaces:
 * - `cursorX` is always window-space `MouseEvent.clientX`. It drives delta
 *   math for `dragging-body` / `resizing-left` / `resizing-right`, which only
 *   care about *how much* the cursor moved since `mousedown`.
 * - `canvasX` (optional on `mousemove`) is the cursor's X position in the
 *   canvas's content coordinate system — i.e., already accounting for the
 *   sidebar's left offset and the horizontal scroll. `timeScale.fromX(canvasX)`
 *   yields the absolute date under the cursor. It is used by
 *   `dragging-unscheduled` to snap the dropped issue to the date the cursor
 *   is actually pointing at, not to a delta from "today".
 *
 * When the cursor is over the sidebar (e.g., at the start of an unscheduled
 * drag), `canvasX` is undefined and the unscheduled preview holds its
 * default ("today") until the cursor enters the canvas.
 */
export type DragEvent =
  | { type: 'mouseenter-bar', issueId: Ref<Issue> | Ref<Milestone>, edge: 'left' | 'right' | 'body' }
  | { type: 'mouseleave-bar' }
  | {
      type: 'mousedown-bar'
      target: DragTarget
      /** Start / end dates of the target at mousedown; reducer stores these
       *  as `originStart` / `originEnd` and adds the cursor-delta to compute
       *  previews. Captured here at the dispatch boundary so the doc-agnostic
       *  reducer doesn't need to know which field on `target.doc` to read. */
      originStart: number
      originEnd: number
      edge: 'left' | 'right' | 'body'
      cursorX: number
    }
  | { type: 'mousedown-unscheduled', target: DragTarget, cursorX: number }
  | { type: 'mousemove', cursorX: number, canvasX?: number }
  | { type: 'mouseup' }
  | { type: 'cancel' }
  | {
      type: 'mousedown-connector'
      source: Issue
      originPx: { x: number, y: number }
      cursorPx: { x: number, y: number }
    }
  | {
      type: 'mousemove-connector'
      cursorPx: { x: number, y: number }
      /** Bar under the cursor right now, or null when over empty canvas. */
      hoveredBar: Issue | null
    }
  | { type: 'mouseup-connector' }

// ---------------------------------------------------------------------------
// PR4b — Cascade simulation types
// ---------------------------------------------------------------------------

/** A single primary issue-edit (the dragged bar, plus parent-drag descendants). */
export interface PrimaryEdit {
  issue: Issue
  newStart: number
  newDue: number
}

/** One issue shifted by the cascade (push-successor or pull-predecessor). */
export interface CascadeShift {
  issue: Issue
  oldStart: number
  oldDue: number
  newStart: number
  newDue: number
  reason: 'push-successor' | 'pull-predecessor'
  triggeredBy: Ref<Issue>
}

/** Discriminated result of simulateCascade. */
export type SimulateResult =
  | { kind: 'no-cascade', primary: PrimaryEdit[] }
  | { kind: 'cascade', primary: PrimaryEdit[], shifts: CascadeShift[], skippedUnscheduled: number }
  | { kind: 'cycle', cycleNodes: Ref<Issue>[] }
  | { kind: 'iteration-overflow' }
  | { kind: 'permission-denied', lockedIssues: Issue[], primary: PrimaryEdit[], shifts: CascadeShift[], skippedUnscheduled: number }

// ---------------------------------------------------------------------------
// PR5 — Critical Path types
// ---------------------------------------------------------------------------

export interface CriticalPathResult {
  /** Issues whose slack is zero — driving the project end date. */
  critical: Set<Ref<Issue>>
  /** Relations that are part of the binding chain (both endpoints critical AND constraint tight). */
  criticalRelations: Set<Ref<IssueRelation>>
  /** Slack per issue in milliseconds. Missing entries = unscheduled. */
  slack: Map<Ref<Issue>, number>
  /** Relations that the user's pinned dates violate. UI marks these red-dashed with "!" tooltip. */
  violatedRelations: Set<Ref<IssueRelation>>
  /** True iff the relation graph contains a cycle — CP is empty, UI shows banner. */
  cycle: boolean
}
