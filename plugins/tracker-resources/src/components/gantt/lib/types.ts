//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Ref } from '@hcengineering/core'
import {
  type Issue,
  type IssueRelation,
  type Component as TrackerComponent,
  type Milestone
} from '@hcengineering/tracker'
import type { DragState as EngineDragState, DragEvent as EngineDragEvent } from '@hcengineering/gantt'

// Domain-neutral engine primitives now live in `@hcengineering/gantt`. They are
// re-exported here so the many adapter modules that import them from
// `../lib/types` keep resolving unchanged.
export { type ZoomLevel, type Tick, type BarColorMode, type DragKind } from '@hcengineering/gantt'

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
   * Group-by metadata. Only present on `kind === 'group-header'`
   * rows AND on the issue rows that belong to a group (so the canvas can
   * tint the lane). Undefined when group-by is off (legacy view).
   */
  groupKey?: string
  groupLabel?: string
  groupCount?: number
  /**
   * Tree-View — true when the row is rendered solely as a
   * filter-breadcrumb (i.e. the issue itself does not match the active filter
   * but at least one descendant does). The sidebar dims breadcrumb rows and
   * shows a tooltip explaining their presence. Undefined / false on rows that
   * match the filter normally, or when no filter is active.
   */
  isBreadcrumb?: boolean
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

/**
 * Discriminated union of what's being dragged. Issues and Milestones are
 * both date-ranged docs but use different field names (Issue: dueDate /
 * Milestone: targetDate), and Milestone-cascade hits assigned-issues
 * rather than descendant issues. The drag-controller reducer is doc-
 * agnostic — it only uses originStart / originEnd / cursor deltas; the
 * `target` field is preserved verbatim so commitDrag can branch on
 * `target.kind` to write the right field and run the right cascade.
 *
 * Issue-only payloads still work
 * unchanged: callers wrap with `{ kind: 'issue', doc }` at the dispatch
 * boundary.
 *
 * This is the tracker instantiation of the engine's neutral `DragTarget`
 * (`{ kind, doc }`): `Issue`/`Milestone._id` are `Ref<…>` and thus assignable
 * to the engine's `GanttItem { _id: string }`.
 */
export type DragTarget = { kind: 'issue', doc: Issue } | { kind: 'milestone', doc: Milestone }

/**
 * Live drag/resize state — the engine reducer's `DragState`, specialised to the
 * tracker's `DragTarget` union (so `commitDrag` narrows on `target.kind`) and to
 * `Issue` connector nodes.
 */
export type DragState = EngineDragState<DragTarget, Issue>

/**
 * Input events fed into the drag-controller reducer — the engine's `DragEvent`
 * specialised to the tracker's `DragTarget` union and `Issue` connector nodes.
 */
export type DragEvent = EngineDragEvent<DragTarget, Issue>

// ---------------------------------------------------------------------------
// Cascade simulation types
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
  | { kind: 'cycle', cycleNodes: Array<Ref<Issue>> }
  | { kind: 'iteration-overflow' }
  | {
    kind: 'permission-denied'
    lockedIssues: Issue[]
    primary: PrimaryEdit[]
    shifts: CascadeShift[]
    skippedUnscheduled: number
  }

// ---------------------------------------------------------------------------
// Critical path types
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
