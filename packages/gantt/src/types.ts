//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

// Domain-neutral engine types. This package deliberately imports nothing from
// the platform packages: the scheduling/zoom/drag/viewport engine operates on
// the structural minimum it needs (an item's `_id`, plain date numbers) so it
// can be reused by any consumer. Tracker-specific types (Issue, Milestone,
// IssueRelation, Ref) live in the tracker adapter and are threaded in through
// the generic parameters below.

/** Zoom presets — controls pxPerDay and header tick density. */
export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter'

/** A single tick on the time-axis header (vertical gridline + label). */
export interface Tick {
  date: number // UTC ms
  label: string // pre-formatted, locale-aware (primary row)
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

/**
 * How Gantt bars are colored. Pure string union — the resolver that maps a
 * mode + item to concrete colors lives in the tracker adapter (`bar-colors`),
 * which re-exports this union from here.
 */
export type BarColorMode = 'status' | 'priority' | 'assignee' | 'component' | 'milestone' | 'none'

/**
 * Structural minimum for anything the engine drags, schedules or lays out.
 * A tracker Issue/Milestone satisfies this because their `_id` (a branded
 * `Ref<…>`) is assignable to `string`.
 */
export interface GanttItem {
  _id: string
}

/**
 * Working-days calendar the engine schedules against: a weekday bitmask plus
 * a list of UTC-midnight holiday timestamps. Neutral, domain-agnostic — the
 * tracker adapter builds a value of this shape from a project's weekday mask
 * and the workspace HR calendar and threads it in.
 */
export interface WorkingCalendar {
  /**
   * Bitmask of active weekdays.
   *
   *   bit 0 = Mon, bit 1 = Tue, …, bit 5 = Sat, bit 6 = Sun.
   *
   *   Mon–Fri   = 0b0011111 = 31
   *   Mon–Sat   = 0b0111111 = 63
   *   All days  = 0b1111111 = 127
   */
  weekdayMask: number

  /** Holidays as UTC-midnight timestamps. Order is irrelevant; duplicates allowed. */
  holidays: number[]
}

/**
 * Neutral scheduling dependency between two items. This is the stable, domain-
 * agnostic contract for a predecessor→successor link; the tracker adapter maps
 * its `IssueRelation`-based structures onto it. The dependency-routing and
 * critical-path logic themselves remain in the adapter — this interface is the
 * shared vocabulary, not the implementation.
 */
export interface GanttDependency {
  _id: string
  /** Predecessor item id. */
  fromId: string
  /** Successor item id. */
  toId: string
  /** Finish-to-Start, Start-to-Start, Finish-to-Finish or Start-to-Finish. */
  kind: 'FS' | 'SS' | 'FF' | 'SF'
  /** Optional lag in working days (may be negative for lead). */
  lagDays?: number
}

/** Which part of a bar is being interacted with. */
export type DragKind = 'body' | 'left' | 'right' | 'unscheduled'

/**
 * Discriminated union of what's being dragged. The engine reducer is
 * doc-agnostic — it only uses originStart / originEnd / cursor deltas and the
 * item's `_id`; the `target` payload is preserved verbatim so the consumer's
 * commit routine can branch on `target.kind` to write the right field and run
 * the right cascade. Consumers instantiate `TTarget`/`TNode` (see `DragState`)
 * with their own discriminated union to recover full typing at the commit
 * boundary; the default keeps the engine usable in a fully neutral form.
 */
export interface DragTarget<D extends GanttItem = GanttItem> {
  kind: string
  doc: D
}

/**
 * Discriminated state of the live drag/resize interaction.
 *
 * Generic parameters:
 * - `TTarget` — the dragged target payload (a `{ kind, doc }` shape). The
 *   tracker adapter supplies its `{ kind: 'issue', doc: Issue } | { kind:
 *   'milestone', doc: Milestone }` union so `commitDrag` can narrow on `kind`.
 * - `TNode` — a bare item node used by the connector (dependency-draw) states.
 */
export type DragState<TTarget extends DragTarget = DragTarget, TNode extends GanttItem = GanttItem> =
  | { kind: 'idle' }
  | { kind: 'hover-bar', issueId: string, edge: 'left' | 'right' | 'body' | 'none' }
  | {
    kind: 'dragging-body'
    target: TTarget
    originStart: number
    originEnd: number
    cursorStartX: number
    previewStart: number
    previewEnd: number
    /** Bulk co-drag state: other selected issues being shifted in sync. */
    coDrag?: {
      members: Array<{ issueId: string, originStart: number, originEnd: number }>
      minDeltaMs: number
      maxDeltaMs: number
      anchorDeltaMs: number
    }
  }
  | {
    kind: 'resizing-left'
    target: TTarget
    originStart: number
    originEnd: number
    cursorStartX: number
    previewStart: number
  }
  | {
    kind: 'resizing-right'
    target: TTarget
    originStart: number
    originEnd: number
    cursorStartX: number
    previewEnd: number
  }
  | {
    kind: 'dragging-unscheduled'
    target: TTarget
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
    /** Source item the user is drawing the dependency from. */
    source: TNode
    /** Pixel x/y of the connector-dot on the source bar (where the curve starts). */
    originPx: { x: number, y: number }
    /** Live cursor x/y in canvas-content coordinates (where the curve ends). */
    cursorPx: { x: number, y: number }
  }
  | {
    kind: 'connector-target-hover'
    source: TNode
    originPx: { x: number, y: number }
    cursorPx: { x: number, y: number }
    /** Candidate target item under the pointer. */
    target: TNode
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
export type DragEvent<TTarget extends DragTarget = DragTarget, TNode extends GanttItem = GanttItem> =
  | { type: 'mouseenter-bar', issueId: string, edge: 'left' | 'right' | 'body' }
  | { type: 'mouseleave-bar' }
  | {
    type: 'mousedown-bar'
    target: TTarget
    /** Start / end dates of the target at mousedown; reducer stores these
       *  as `originStart` / `originEnd` and adds the cursor-delta to compute
       *  previews. Captured here at the dispatch boundary so the doc-agnostic
       *  reducer doesn't need to know which field on `target.doc` to read. */
    originStart: number
    originEnd: number
    edge: 'left' | 'right' | 'body'
    cursorX: number
    /** Bulk co-drag state: other selected issues to shift in sync. */
    coDrag?: {
      members: Array<{ issueId: string, originStart: number, originEnd: number }>
      minDeltaMs: number
      maxDeltaMs: number
    }
  }
  | { type: 'mousedown-unscheduled', target: TTarget, cursorX: number }
  | { type: 'mousemove', cursorX: number, canvasX?: number }
  | { type: 'mouseup' }
  | { type: 'cancel' }
  | {
    type: 'mousedown-connector'
    source: TNode
    originPx: { x: number, y: number }
    cursorPx: { x: number, y: number }
  }
  | {
    type: 'mousemove-connector'
    cursorPx: { x: number, y: number }
    /** Bar under the cursor right now, or null when over empty canvas. */
    hoveredBar: TNode | null
  }
  | { type: 'mouseup-connector' }
