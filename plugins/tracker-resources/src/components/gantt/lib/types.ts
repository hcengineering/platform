//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Ref } from '@hcengineering/core'
import { type Issue, type Component as TrackerComponent, type Milestone } from '@hcengineering/tracker'

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

/** A row in the flattened layout. May be an issue, milestone, or swimlane header. */
export interface LayoutRow {
  kind: 'issue' | 'milestone' | 'component-swimlane'
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
  /** The issue this row represents — null for milestone/swimlane rows. */
  issue: Issue | null
  /** The milestone this row represents — null for issue/swimlane rows. */
  milestone: MilestoneMarker | null
  /** The component this swimlane represents — null otherwise. */
  component: Ref<TrackerComponent> | null
  /** True iff this row has children (renders as summary "claw" bar). */
  isSummary: boolean
  /** True iff this row has children and the user can collapse/expand it. */
  collapsible: boolean
  /** True iff currently collapsed (children hidden). */
  collapsed: boolean
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

/** Discriminated state of the live drag/resize interaction. */
export type DragState =
  | { kind: 'idle' }
  | { kind: 'hover-bar', issueId: Ref<Issue>, edge: 'left' | 'right' | 'body' | 'none' }
  | {
      kind: 'dragging-body'
      issue: Issue
      originStart: number
      originDue: number
      cursorStartX: number
      previewStart: number
      previewDue: number
    }
  | {
      kind: 'resizing-left'
      issue: Issue
      originStart: number
      originDue: number
      cursorStartX: number
      previewStart: number
    }
  | {
      kind: 'resizing-right'
      issue: Issue
      originStart: number
      originDue: number
      cursorStartX: number
      previewDue: number
    }
  | {
      kind: 'dragging-unscheduled'
      issue: Issue
      /** Anchor date the drag was started from (defaults to today at UTC midnight). */
      originStart: number
      /** originStart + 1 day; used for ghost-outline / commit symmetry with dragging-body. */
      originDue: number
      cursorStartX: number
      previewStart: number
      previewDue: number
      /**
       * True once the cursor has been over the canvas during the drag and a real
       * canvas-X has been observed. Guards against the click-without-drag case
       * where mouseup fires before the user has moved over the canvas — committing
       * such a "drag" would schedule the issue to today silently. `commitDrag`
       * treats `dragging-unscheduled && !hasCanvasTarget` as a no-op.
       */
      hasCanvasTarget: boolean
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
  | { type: 'mouseenter-bar', issueId: Ref<Issue>, edge: 'left' | 'right' | 'body' }
  | { type: 'mouseleave-bar' }
  | { type: 'mousedown-bar', issue: Issue, edge: 'left' | 'right' | 'body', cursorX: number }
  | { type: 'mousedown-unscheduled', issue: Issue, cursorX: number }
  | { type: 'mousemove', cursorX: number, canvasX?: number }
  | { type: 'mouseup' }
  | { type: 'cancel' }
