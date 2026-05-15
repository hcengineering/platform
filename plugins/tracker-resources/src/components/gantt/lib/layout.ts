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
  /**
   *  — Tree-View — set of issue ids that match the active
   * filter. When set, only matching issues and their ancestors are emitted
   * (when {@link includeBreadcrumbs} is true). When undefined, no filtering
   * is applied at the layout level.
   */
  matchedIds?: Set<string>
  /**
   *  — when true together with {@link matchedIds}, non-matching
   * ancestors of matching issues are emitted as breadcrumb rows
   * (`isBreadcrumb: true`) for filter-context. When false / undefined, only
   * matching issues are emitted (hard filter).
   */
  includeBreadcrumbs?: boolean
  /**
   *  — optional comparator applied to siblings within the same
   * hierarchy level (roots, milestone-group members, children of a given
   * parent). The tree structure is preserved; only sibling order changes.
   * When undefined, the input order is preserved (legacy behaviour).
   */
  withinLevelCompare?: (a: Issue, b: Issue) => number
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
  const matchedIds = opts.matchedIds
  const includeBreadcrumbs = opts.includeBreadcrumbs === true && matchedIds !== undefined
  const withinLevelCompare = opts.withinLevelCompare
  const hasFilter = matchedIds !== undefined

  // 1) Build issue parent/child map, dropping orphan parent refs.
  const visibleIssueIds = new Set<string>(issues.map(i => i._id as unknown as string))
  const issueById = new Map<string, Issue>()
  for (const i of issues) {
    issueById.set(i._id as unknown as string, i)
  }
  const issueChildrenOf = new Map<string, Issue[]>()
  const parentOf = new Map<string, string>()
  const issueRoots: Issue[] = []
  for (const i of issues) {
    const parentId = i.parents?.[0]?.parentId as unknown as string | undefined
    if (parentId != null && visibleIssueIds.has(parentId)) {
      const list = issueChildrenOf.get(parentId) ?? []
      list.push(i)
      issueChildrenOf.set(parentId, list)
      parentOf.set(i._id as unknown as string, parentId)
    } else {
      issueRoots.push(i)
    }
  }

  //  — compute the breadcrumb-set: every ancestor of every
  // matching issue. Used to keep filter-context visible (the "why is this
  // issue under that parent?" affordance).
  const breadcrumbIds = new Set<string>()
  if (includeBreadcrumbs && matchedIds !== undefined) {
    for (const matchId of matchedIds) {
      let cur = parentOf.get(matchId)
      while (cur !== undefined && !breadcrumbIds.has(cur)) {
        breadcrumbIds.add(cur)
        cur = parentOf.get(cur)
      }
    }
  }

  /** True iff `issueId` should appear under the active filter (match OR breadcrumb). */
  function isVisibleUnderFilter (issueId: string): boolean {
    if (!hasFilter) return true
    if (matchedIds?.has(issueId) === true) return true
    return breadcrumbIds.has(issueId)
  }

  // Apply within-level-sort to root collection + milestone-group members + each
  // children-bucket. Sort happens before any traversal so y-positions reflect
  // the final order.
  if (withinLevelCompare !== undefined) {
    issueRoots.sort(withinLevelCompare)
    for (const [k, kids] of issueChildrenOf) {
      issueChildrenOf.set(k, [...kids].sort(withinLevelCompare))
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
    if (!isVisibleUnderFilter(issueId)) return
    const kids = issueChildrenOf.get(issueId) ?? []
    const id = `issue:${issueId}`
    const collapsible = kids.length > 0
    const userCollapsed = collapsedIds.has(id)
    // Breadcrumb ancestors are force-expanded so the matching descendant
    // remains visible regardless of the user's persisted collapse state.
    const hasMatchingDescendant = breadcrumbIds.has(issueId)
    const collapsed = userCollapsed && !hasMatchingDescendant
    const isBreadcrumb = hasFilter && matchedIds?.has(issueId) !== true && breadcrumbIds.has(issueId)
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
      collapsed,
      isBreadcrumb
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
    // Skip milestone-group entirely when none of its issues are visible under
    // the current filter (no matches AND no breadcrumb-ancestors inside).
    if (hasFilter) {
      const anyVisible = msIssues.some(i => isVisibleUnderFilter(i._id as unknown as string))
      if (!anyVisible) continue
    }
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
