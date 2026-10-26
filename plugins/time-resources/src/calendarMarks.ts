//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Ref, Space, Timestamp } from '@hcengineering/core'

/**
 * Something to mark on the planner mini-calendar: a point in time (dueDate absent)
 * or an interval [date, dueDate).
 */
export interface CalendarMarkItem {
  date: Timestamp
  dueDate?: Timestamp | null
  space?: Ref<Space>
}

/**
 * Local midnight of the day containing the given date.
 */
export function getDayStart (date: Date | Timestamp): Timestamp {
  return new Date(date).setHours(0, 0, 0, 0)
}

/**
 * [from, to) range of the month containing the given date, in local time.
 */
export function getMonthRange (date: Date): { from: Timestamp, to: Timestamp } {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime()
  }
}

/**
 * Returns the local day starts (see getDayStart) within [from, to) covered by the items.
 * Items belonging to one of the archived spaces are ignored.
 */
export function getMarkedDays (
  items: CalendarMarkItem[],
  from: Timestamp,
  to: Timestamp,
  archived: Set<Ref<Space>>
): Set<Timestamp> {
  const result = new Set<Timestamp>()
  for (const item of items) {
    if (item.space !== undefined && archived.has(item.space)) continue
    const start = Math.max(item.date, from)
    const end = Math.min(item.dueDate != null && item.dueDate > item.date ? item.dueDate : item.date + 1, to)
    const day = new Date(getDayStart(start))
    while (day.getTime() < end) {
      result.add(day.getTime())
      day.setDate(day.getDate() + 1)
    }
  }
  return result
}
