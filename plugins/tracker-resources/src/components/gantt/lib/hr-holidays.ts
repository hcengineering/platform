//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Ref } from '@hcengineering/core'
import { type Department, type PublicHoliday, type TzDate } from '@hcengineering/hr'

/**
 * Convert an HR `TzDate` (a plain calendar day) to the UTC-midnight
 * timestamp the Gantt engine expects (see `working-days.ts` in
 * `@hcengineering/gantt`: every holiday entry is compared via
 * `utcMidnight()`).
 *
 * Deliberately NOT `fromTzDate` from `@hcengineering/hr`: that helper keeps
 * the current local wall-clock time and zone, which can round to the wrong
 * UTC day. The `offset` field is ignored — calendar-day semantics, same as
 * hr-resources itself.
 */
export function tzDateToUtcMidnight (date: TzDate): number {
  return Date.UTC(date.year, date.month, date.day)
}

/**
 * Resolve the set of departments whose public holidays apply to a project:
 * the configured department plus ALL its ancestors up to the company root —
 * the same semantics as `getDepartmentHolidays` in hr-resources'
 * ScheduleView (a child department inherits every ancestor's holidays).
 *
 * Fail-safe rules (review #10992):
 *  - no department configured        → root only ("company-wide")
 *  - unknown/deleted department ref  → root only, NEVER union-of-all
 *  - cyclic or broken parent chain   → terminate, root stays included
 *
 * `head` (the root department id, `hr.ids.Head`) is passed in by the caller
 * so this module stays a pure function over plain data — no plugin-id
 * import, trivially unit-testable.
 */
export function resolveHolidayScope (
  target: Ref<Department> | undefined,
  head: Ref<Department>,
  departments: Map<Ref<Department>, Department>
): Set<Ref<Department>> {
  // The root is an ancestor of every department — always in scope.
  const scope = new Set<Ref<Department>>([head])
  if (target === undefined) return scope
  const start = departments.get(target)
  if (start === undefined) return scope // deleted/invalid ref → root only
  scope.add(target)
  const visited = new Set<Ref<Department>>([target])
  let parent = start.parent
  while (parent !== undefined && parent !== head) {
    if (visited.has(parent)) break // cycle protection: broken data must not loop
    visited.add(parent)
    // A parent ref whose doc is missing contributes no holidays — adding it
    // to the scope is harmless and mirrors hr-resources, which treats a
    // missing parent as "chain ends at the root".
    scope.add(parent)
    parent = departments.get(parent)?.parent
  }
  return scope
}

/**
 * Resolve HR public holidays to the engine's holiday list: only holidays of
 * departments inside `scope` count, de-duplicated per UTC day.
 */
export function resolveHrHolidays (holidays: PublicHoliday[], scope: Set<Ref<Department>>): number[] {
  const days = new Set<number>()
  for (const h of holidays) {
    if (scope.has(h.department)) {
      days.add(tzDateToUtcMidnight(h.date))
    }
  }
  return Array.from(days)
}
