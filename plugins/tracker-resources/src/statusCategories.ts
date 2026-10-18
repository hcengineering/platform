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

import type { Ref, Status, StatusCategory } from '@hcengineering/core'

/**
 * Status selectors group statuses by category only when there are at least this many statuses.
 */
export const statusGroupingThreshold = 10

/**
 * Key used to remember collapsed status categories in status selectors.
 */
export const statusCategoriesCollapseKey = 'tracker.issueStatus'

/**
 * Returns the statuses ordered by category with the category to show as a group header.
 * Below the threshold the original order is kept and no categories are returned.
 * Statuses keep their relative order inside a category; statuses without a known category go last.
 */
export function groupStatusesByCategory<T extends Status> (
  statuses: T[],
  getCategory: (ref: Ref<StatusCategory>) => StatusCategory | undefined
): Array<{ status: T, category?: StatusCategory }> {
  if (statuses.length < statusGroupingThreshold) {
    return statuses.map((status) => ({ status }))
  }
  const withCategory = statuses.map((status) => ({
    status,
    category: status.category !== undefined ? getCategory(status.category) : undefined
  }))
  return withCategory.sort(
    (a, b) => (a.category?.order ?? Number.MAX_SAFE_INTEGER) - (b.category?.order ?? Number.MAX_SAFE_INTEGER)
  )
}
