//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Issue } from '@hcengineering/tracker'
import { type LayoutRow, type MilestoneMarker } from './types'

export type GroupBy = 'none' | 'component' | 'milestone'

const DEFAULT_OVERSCAN_PX = 240

/** Stable id used for keyed iteration AND collapse-state lookup. */
export function rowId (row: LayoutRow): string {
  return row.id
}

export interface BuildLayoutOptions {
  rowHeight: number
  /** Set of row ids that are currently collapsed (children hidden). */
  collapsedIds?: Set<string>
}

/**
 * Build the flattened row layout.
 *
 * Hierarchy from top to bottom:
 *   Milestone-row (if any issues belong to that milestone)
 *     └── Issue-root
 *           └── Issue-child (sub-issue)
 *
 * Issues without a milestone are emitted as roots after the milestone groups.
 * Issues whose parent is filtered out are promoted to roots so they don't
 * silently disappear from the Gantt.
 */
export function buildLayout (
  issues: Issue[],
  milestones: MilestoneMarker[],
  _group: GroupBy,
  rowHeightOrOpts: number | BuildLayoutOptions
): LayoutRow[] {
  const opts: BuildLayoutOptions =
    typeof rowHeightOrOpts === 'number' ? { rowHeight: rowHeightOrOpts } : rowHeightOrOpts
  const rowHeight = opts.rowHeight
  const collapsedIds = opts.collapsedIds ?? new Set<string>()

  // 1) Build issue parent/child map, dropping orphan parent refs.
  const visibleIssueIds = new Set<string>(issues.map(i => i._id as unknown as string))
  const issueChildrenOf = new Map<string, Issue[]>()
  const issueRoots: Issue[] = []
  for (const i of issues) {
    const parentId = i.parents?.[0]?.parentId as unknown as string | undefined
    if (parentId != null && visibleIssueIds.has(parentId)) {
      const list = issueChildrenOf.get(parentId) ?? []
      list.push(i)
      issueChildrenOf.set(parentId, list)
    } else {
      issueRoots.push(i)
    }
  }

  // 2) Group root-issues by milestone.
  const milestoneById = new Map<string, MilestoneMarker>()
  for (const m of milestones) {
    milestoneById.set(m._id as unknown as string, m)
  }
  const issuesByMilestone = new Map<string, Issue[]>()
  const issuesWithoutMilestone: Issue[] = []
  for (const root of issueRoots) {
    const ms = (root as unknown as { milestone?: string | null }).milestone
    if (ms != null && milestoneById.has(ms)) {
      const list = issuesByMilestone.get(ms) ?? []
      list.push(root)
      issuesByMilestone.set(ms, list)
    } else {
      issuesWithoutMilestone.push(root)
    }
  }

  const rows: LayoutRow[] = []
  let y = 0

  function emitIssue (issue: Issue, depth: number): void {
    const issueId = issue._id as unknown as string
    const kids = issueChildrenOf.get(issueId) ?? []
    const id = `issue:${issueId}`
    const collapsible = kids.length > 0
    const collapsed = collapsedIds.has(id)
    rows.push({
      kind: 'issue',
      id,
      y,
      height: rowHeight,
      depth,
      visible: true,
      issue,
      milestone: null,
      component: null,
      isSummary: kids.length > 0,
      collapsible,
      collapsed
    })
    y += rowHeight
    if (!collapsed) {
      for (const c of kids) emitIssue(c, depth + 1)
    }
  }

  // 3a) Milestone groups first.
  for (const [msId, msIssues] of issuesByMilestone) {
    const ms = milestoneById.get(msId)
    if (ms === undefined) continue
    const id = `milestone:${msId}`
    const collapsed = collapsedIds.has(id)
    rows.push({
      kind: 'milestone',
      id,
      y,
      height: rowHeight,
      depth: 0,
      visible: true,
      issue: null,
      milestone: ms,
      component: null,
      isSummary: true,
      collapsible: true,
      collapsed
    })
    y += rowHeight
    if (!collapsed) {
      for (const i of msIssues) emitIssue(i, 1)
    }
  }

  // 3b) Issues without milestone.
  for (const r of issuesWithoutMilestone) emitIssue(r, 0)

  return rows
}

/**
 * Return the subset of rows whose [y, y+height] intersects
 * [viewportTop - overscan, viewportTop + viewportHeight + overscan].
 */
export function filterVisibleRows (
  rows: LayoutRow[],
  viewportTop: number,
  viewportHeight: number,
  overscan: number = DEFAULT_OVERSCAN_PX
): LayoutRow[] {
  const min = viewportTop - overscan
  const max = viewportTop + viewportHeight + overscan
  return rows.filter(r => r.y + r.height >= min && r.y <= max)
}
