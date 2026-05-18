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
  label: string            // pre-formatted, locale-aware
  level: 'major' | 'minor' // major ticks render thicker + with text label
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
