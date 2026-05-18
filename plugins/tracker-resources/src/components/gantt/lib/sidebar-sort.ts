//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3a — Sidebar sort state + comparators.
 *
 * The sort state cycles `null → asc → desc → null` on repeat clicks of the
 * same header, and resets to `asc` on a new column (Spec §Sort-State).
 *
 * `comparatorFor` returns a column-specific comparator. Where a column has
 * no meaningful order (computed values like `slack`, `predecessors`,
 * `progress`, `component`, `milestone`), the comparator returns `0` —
 * `Array.sort` is required by spec to be stable in V8/SpiderMonkey/JSC,
 * so the original row order is preserved for those columns. The UI hides
 * the sort indicator on those headers to avoid offering a no-op affordance.
 */

import type { Issue } from '@hcengineering/tracker'
import type { SidebarColumnKey } from './sidebar-columns'

/** Direction of a sort. */
export type SortDirection = 'asc' | 'desc'

/** Sort state for the sidebar. `column === null` means "rank-order" (no sort). */
export interface GanttSortState {
  column: SidebarColumnKey | null
  direction: SortDirection
}

/** Cycle: same column asc→desc→null (off); different column resets to asc. */
export function cycleSort (state: GanttSortState, column: SidebarColumnKey): GanttSortState {
  if (state.column !== column) {
    return { column, direction: 'asc' }
  }
  if (state.direction === 'asc') {
    return { column, direction: 'desc' }
  }
  // currently desc on this column → turn sort off
  return { column: null, direction: 'asc' }
}

/** Comparator type for Issue arrays. */
export type IssueComparator = (a: Issue, b: Issue) => number

/** Columns where a stable, meaningful ordering exists for v1. */
const STRING_COLS: ReadonlySet<SidebarColumnKey> = new Set<SidebarColumnKey>(['title', 'identifier'])
const NUMBER_COLS: ReadonlySet<SidebarColumnKey> = new Set<SidebarColumnKey>(['estimation', 'priority', 'modifiedOn', 'createdOn'])
const DATE_COLS: ReadonlySet<SidebarColumnKey> = new Set<SidebarColumnKey>(['startDate', 'dueDate', 'deadline'])

function readString (issue: Issue, col: SidebarColumnKey): string {
  if (col === 'title') return issue.title ?? ''
  if (col === 'identifier') return issue.identifier ?? ''
  return ''
}

function readNumber (issue: Issue, col: SidebarColumnKey): number {
  if (col === 'estimation') return issue.estimation ?? 0
  if (col === 'priority') return issue.priority as unknown as number
  if (col === 'modifiedOn') return issue.modifiedOn ?? 0
  if (col === 'createdOn') return issue.createdOn ?? 0
  return 0
}

function readDate (issue: Issue, col: SidebarColumnKey): number | null {
  if (col === 'startDate') return issue.startDate ?? null
  if (col === 'dueDate') return issue.dueDate ?? null
  if (col === 'deadline') {
    // No native `deadline` field on Issue at time of Phase 3a — preserve the
    // hook for a future model addition, until then it sorts as all-null.
    const anyIssue = issue as unknown as { deadline?: number | null }
    return anyIssue.deadline ?? null
  }
  return null
}

/** Build a comparator for `(column, direction)`. */
export function comparatorFor (column: SidebarColumnKey, direction: SortDirection): IssueComparator {
  const sign = direction === 'asc' ? 1 : -1

  if (STRING_COLS.has(column)) {
    return (a, b) => sign * readString(a, column).localeCompare(readString(b, column), undefined, { sensitivity: 'base' })
  }
  if (NUMBER_COLS.has(column)) {
    return (a, b) => sign * (readNumber(a, column) - readNumber(b, column))
  }
  if (DATE_COLS.has(column)) {
    // Nulls always sort last regardless of direction, matching MS Project /
    // Asana convention so unscheduled rows pool at the bottom of the view.
    return (a, b) => {
      const av = readDate(a, column)
      const bv = readDate(b, column)
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return sign * (av - bv)
    }
  }

  // Non-orderable columns in v1: slack, predecessors, progress, component,
  // milestone, assignee, status — stable no-op.
  return () => 0
}
