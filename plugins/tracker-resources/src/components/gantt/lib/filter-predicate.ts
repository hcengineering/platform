//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3b — Client-side Gantt filter predicate.
 *
 * The Gantt view's issue feed is bounded (≤1000 issues per project per
 * spec §Performance) so we filter on the client to keep the surface small
 * and avoid coupling to the global Tracker `filterStore` — which is wired
 * to the URL and to list-view bookkeeping that the Gantt does not share.
 *
 * The shape mirrors the spec's `DocumentQuery<Issue>` projection: a sparse
 * record where each present key is an array of allowed values, joined with
 * AND across keys, OR within a key. Empty arrays are ignored, so the UI
 * can write the same `{ status: [] }` shape it would use for a populated
 * filter without an explicit clear step.
 *
 * Forward-compat: unknown keys are ignored. Adding a new dimension is a
 * pure additive change — no migration needed.
 */

import type { Issue } from '@hcengineering/tracker'

/** Allowed value types for any filter dimension. */
export type GanttFilterValue = string | number | null

/** Sparse filter description; missing key ⇒ no constraint on that dimension. */
export interface GanttFilter {
  status?: GanttFilterValue[]
  priority?: GanttFilterValue[]
  assignee?: GanttFilterValue[]
  component?: GanttFilterValue[]
  milestone?: GanttFilterValue[]
}

const FILTER_KEYS: readonly (keyof GanttFilter)[] = [
  'status',
  'priority',
  'assignee',
  'component',
  'milestone'
]

function readIssueValue (issue: Issue, key: keyof GanttFilter): GanttFilterValue {
  switch (key) {
    case 'status':
      return issue.status != null ? String(issue.status) : null
    case 'priority':
      // Priority is numeric. Keep it as a number for == comparison.
      return typeof issue.priority === 'number' ? issue.priority : Number(issue.priority ?? 0)
    case 'assignee':
      return issue.assignee != null ? String(issue.assignee) : null
    case 'component':
      return issue.component != null ? String(issue.component) : null
    case 'milestone': {
      const ms = (issue as unknown as { milestone?: string | null }).milestone
      return ms != null ? String(ms) : null
    }
  }
}

function matchesKey (issue: Issue, key: keyof GanttFilter, allowed: GanttFilterValue[]): boolean {
  if (allowed.length === 0) return true
  const value = readIssueValue(issue, key)
  for (const a of allowed) {
    if (a === value) return true
    // String/number cross-type lenience: lets the UI pass numeric strings
    // for priority without forcing a parseInt at write time.
    if (typeof a === 'string' && typeof value === 'number' && a === String(value)) return true
    if (typeof a === 'number' && typeof value === 'string' && String(a) === value) return true
  }
  return false
}

/** Apply the filter to an issue array, returning a new array (input untouched). */
export function applyFilter (issues: readonly Issue[], filter: GanttFilter): Issue[] {
  const activeKeys = FILTER_KEYS.filter(k => {
    const v = filter[k]
    return Array.isArray(v) && v.length > 0
  })
  if (activeKeys.length === 0) return [...issues]
  const out: Issue[] = []
  for (const issue of issues) {
    let pass = true
    for (const key of activeKeys) {
      if (!matchesKey(issue, key, filter[key] as GanttFilterValue[])) {
        pass = false
        break
      }
    }
    if (pass) out.push(issue)
  }
  return out
}

/** Number of filter dimensions that have at least one value — for badge UI. */
export function countActiveFilters (filter: GanttFilter): number {
  let n = 0
  for (const k of FILTER_KEYS) {
    const v = filter[k]
    if (Array.isArray(v) && v.length > 0) n++
  }
  return n
}
