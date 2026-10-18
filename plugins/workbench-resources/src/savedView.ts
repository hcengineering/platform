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
import type { PersonId } from '@hcengineering/core'
import type { FilteredView } from '@hcengineering/view'

/**
 * A saved view can be overwritten with the currently applied filters only by
 * its creator, only while the list it was saved for is open (the filters
 * belong to that list) and only when there is at least one filter to store.
 */
export function canOverwriteFilteredView (
  filteredView: Pick<FilteredView, 'createdBy' | 'location'>,
  socialIds: PersonId[],
  currentPath: string[],
  filtersCount: number
): boolean {
  if (filteredView.createdBy === undefined || !socialIds.includes(filteredView.createdBy)) return false
  if (filtersCount === 0) return false
  return filteredView.location.path.join() === currentPath.join()
}
