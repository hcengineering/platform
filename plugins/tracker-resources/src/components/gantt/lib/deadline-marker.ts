//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Issue } from '@hcengineering/tracker'

/**
 * True iff the issue has a deadline set. Treats both null and undefined
 * as "no deadline" — `0` is a valid (if degenerate) timestamp.
 */
export function hasDeadline (issue: Issue): boolean {
  return issue.deadline !== undefined && issue.deadline !== null
}

/**
 * True iff the issue has both a deadline and a dueDate, and the dueDate
 * is strictly later than the deadline (= the work is going to finish
 * after the soft deadline).
 *
 * `dueDate === deadline` is NOT overdue — last-minute delivery is fine.
 */
export function isOverdue (issue: Issue): boolean {
  const d = issue.deadline
  const due = issue.dueDate
  if (d === undefined || d === null) return false
  if (due === undefined || due === null) return false
  return due > d
}
