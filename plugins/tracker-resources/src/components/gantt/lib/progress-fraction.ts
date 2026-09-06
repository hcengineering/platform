//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Issue } from '@hcengineering/tracker'
import type { StatusCategoryLookup } from './bar-overlays'

/**
 * Returns the fraction of sub-issues whose status category is
 * `task:statusCategory:Won` (Done). Numerator and denominator both
 * come from the supplied `subs` snapshot — issue.subIssues is the
 * authoritative count for "does this issue have subs at all" but we
 * never divide by it because it can be eventually-consistent ahead
 * of the actual loaded sub-issue documents.
 *
 * Returns null if there is no data to compute a fraction from.
 */
export function progressFraction (issue: Issue, subs: Issue[], statusCategoryFor: StatusCategoryLookup): number | null {
  if (issue.subIssues === 0) return null
  if (subs.length === 0) return null
  const done = subs.filter((s) => statusCategoryFor(s.status) === 'task:statusCategory:Won').length
  return done / subs.length
}
