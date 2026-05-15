//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Issue } from '@hcengineering/tracker'

/**
 * The set of values a configurable bar-label slot can resolve to.
 * Driven by ViewOptions `ganttBarLabelLeft / Inside / Right`.
 *
 * Default-mapping preserves pre-Phase-1 behaviour:
 *   left=none, inside=title, right=none  → identical to the legacy
 *   "title rendered inside the bar" look.
 */
export type BarLabelSlot =
  | 'none'
  | 'title'
  | 'identifier'
  | 'assignee'
  | 'priority'
  | 'status'
  | 'estimation'
  | 'progress'

/**
 * Pure resolver: returns the string to render in a given bar label slot
 * for a given issue. Returns '' to indicate the slot should be skipped.
 *
 * Intentionally synchronous and non-reactive — the Svelte caller resolves
 * once per `(issue, slot)` change and passes the result to <text>.
 */
export function resolveBarLabel (issue: Issue, slot: BarLabelSlot): string {
  switch (slot) {
    case 'none':
      return ''
    case 'title':
      return issue.title ?? ''
    case 'identifier':
      return issue.identifier ?? ''
    case 'assignee':
      return issue.assignee !== null && issue.assignee !== undefined
        ? String(issue.assignee)
        : ''
    case 'priority':
      return String(issue.priority ?? 0)
    case 'status':
      // Take the last segment of the colon-separated ref id.
      // e.g. 'tracker:status:Backlog' → 'Backlog'.
      // For Ref<IssueStatus> with no colon, returns the raw string.
      if (issue.status === null || issue.status === undefined) return ''
      const s = String(issue.status)
      const idx = s.lastIndexOf(':')
      return idx >= 0 ? s.slice(idx + 1) : s
    case 'estimation':
      if (issue.estimation === undefined || issue.estimation === 0) return ''
      return `${issue.estimation}h`
    case 'progress':
      if (issue.estimation === undefined || issue.estimation === 0) return ''
      const pct = Math.round(((issue.reportedTime ?? 0) / issue.estimation) * 100)
      return `${pct}%`
    default:
      return ''
  }
}
