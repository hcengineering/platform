//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3b — Build the flat row stream for a grouped Gantt view.
 *
 * Two-row discriminated union (`GanttGroupRow`):
 *   - `group-header` carries the group key + count + collapsed-state
 *   - `issue` carries the issue + its y position
 *
 * The Sidebar and the Canvas both iterate over the same row stream so y
 * positions stay synchronized between the two panes. The y positions are
 * pre-computed here so a virtualization layer can slice the array by a
 * pixel range without re-doing arithmetic at render time.
 *
 * `withinGroupCompare` is an optional hook so callers can plug in the
 * Phase-3a sidebar-sort comparator: sort happens *within* the lane, not
 * across lanes (Spec §"Sort + Group-By").
 */

import type { Issue } from '@hcengineering/tracker'
import { type GroupByKey, getGroupLabel, resolveGroupKey, sortGroupKeys } from './group-by'
import type { LayoutRow } from './types'

/** Visual height of a swimlane header row in pixels. */
export const GROUP_HEADER_HEIGHT = 28

export type GanttGroupRow =
  | {
      kind: 'group-header'
      /** Stable id for keyed each-blocks (e.g. `group:s-backlog`). */
      id: string
      groupKey: string
      label: string
      count: number
      collapsed: boolean
      y: number
      height: number
    }
  | {
      kind: 'issue'
      /** Stable id (`issue:<_id>`) for keyed each-blocks. */
      id: string
      issue: Issue
      depth: number
      y: number
      height: number
      /** Group this issue belongs to, so the canvas can tint by lane. */
      groupKey: string
    }

export interface BuildGroupedRowsOptions {
  rowHeight: number
  collapsedGroups: Set<string>
  /**
   * Optional sort comparator applied *within* each group before emission.
   * Omitted ⇒ stable insertion order from the input array.
   */
  withinGroupCompare?: (a: Issue, b: Issue) => number
  /**
   * Optional id→display-name map (status/priority/assignee/component/
   * milestone/label resolutions). When provided, group-header labels for
   * non-sentinel keys are taken from this map instead of echoing the raw
   * id. v121 fix for the "header shows Mongo-id" feedback.
   */
  nameLookup?: ReadonlyMap<string, string>
}

/**
 * Group `issues` by `groupBy` and produce the flat row stream.
 *
 * - `groupBy === 'none'`: no headers, issues emitted in input order.
 * - Otherwise: one header per non-empty bucket, followed by its issues
 *   unless the bucket is collapsed. A collapsed bucket still emits its
 *   header (so the user can re-expand) but skips the issues.
 */
export function buildGroupedRows (
  issues: readonly Issue[],
  groupBy: GroupByKey,
  opts: BuildGroupedRowsOptions
): GanttGroupRow[] {
  const { rowHeight, collapsedGroups, withinGroupCompare, nameLookup } = opts
  const rows: GanttGroupRow[] = []
  let y = 0

  if (groupBy === 'none') {
    for (const issue of issues) {
      rows.push({
        kind: 'issue',
        id: `issue:${String(issue._id)}`,
        issue,
        depth: 0,
        y,
        height: rowHeight,
        groupKey: '__none__'
      })
      y += rowHeight
    }
    return rows
  }

  // Bucket issues by group key, preserving insertion order within each bucket.
  const buckets = new Map<string, Issue[]>()
  for (const issue of issues) {
    const key = resolveGroupKey(issue, groupBy)
    const list = buckets.get(key)
    if (list === undefined) {
      buckets.set(key, [issue])
    } else {
      list.push(issue)
    }
  }

  const orderedKeys = sortGroupKeys([...buckets.keys()], groupBy)
  for (const key of orderedKeys) {
    const bucket = buckets.get(key)
    if (bucket === undefined) continue
    const collapsed = collapsedGroups.has(key)
    rows.push({
      kind: 'group-header',
      id: `group:${key}`,
      groupKey: key,
      label: getGroupLabel(key, groupBy, nameLookup),
      count: bucket.length,
      collapsed,
      y,
      height: GROUP_HEADER_HEIGHT
    })
    y += GROUP_HEADER_HEIGHT
    if (collapsed) continue
    const ordered = withinGroupCompare !== undefined ? [...bucket].sort(withinGroupCompare) : bucket
    for (const issue of ordered) {
      rows.push({
        kind: 'issue',
        id: `issue:${String(issue._id)}`,
        issue,
        depth: 0,
        y,
        height: rowHeight,
        groupKey: key
      })
      y += rowHeight
    }
  }

  return rows
}

/**
 * Convert a `GanttGroupRow[]` into the shared `LayoutRow[]` shape that the
 * existing Sidebar/Canvas components iterate over. Group headers materialise
 * as `kind: 'group-header'` rows with `collapsible: true`. Issue rows carry
 * over the original group key so the canvas can tint the lane behind them.
 *
 * Defensive: when the input contains a row referencing a `null` issue (not
 * produced by `buildGroupedRows`, but guards against future callers), the
 * row is skipped to keep the legacy LayoutRow invariants intact.
 */
export function groupRowsToLayoutRows (
  rows: readonly GanttGroupRow[]
): LayoutRow[] {
  const out: LayoutRow[] = []
  for (const r of rows) {
    if (r.kind === 'group-header') {
      out.push({
        kind: 'group-header',
        id: r.id,
        y: r.y,
        height: r.height,
        depth: 0,
        visible: true,
        issue: null,
        milestone: null,
        component: null,
        isSummary: false,
        collapsible: true,
        collapsed: r.collapsed,
        groupKey: r.groupKey,
        groupLabel: r.label,
        groupCount: r.count
      })
      continue
    }
    out.push({
      kind: 'issue',
      id: r.id,
      y: r.y,
      height: r.height,
      depth: r.depth,
      visible: true,
      issue: r.issue,
      milestone: null,
      component: null,
      isSummary: false,
      collapsible: false,
      collapsed: false,
      groupKey: r.groupKey
    })
  }
  return out
}
