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

import type { Ref, Space } from '@hcengineering/core'
import type { FilteredView } from '@hcengineering/view'

/**
 * Space (project, channel, ...) segment of the location a filtered view was saved on.
 * May also be a special view id, which simply does not resolve to a space.
 */
export function getFilteredViewSpaceId (fv: Pick<FilteredView, 'location'>): Ref<Space> | undefined {
  const id = fv.location?.path?.[3]
  return id !== undefined && id !== '' ? (id as Ref<Space>) : undefined
}

/**
 * Unique, sorted space ids referenced by the given filtered views, suitable for a single `$in` query.
 */
export function getFilteredViewSpaceIds (views: Array<Pick<FilteredView, 'location'>>): Array<Ref<Space>> {
  const ids = new Set<Ref<Space>>()
  for (const fv of views) {
    const id = getFilteredViewSpaceId(fv)
    if (id !== undefined) ids.add(id)
  }
  return Array.from(ids).sort((a, b) => a.localeCompare(b))
}

/**
 * Short label of a space: its identifier when it has one (e.g. a tracker project), otherwise its name.
 */
export function getSpaceShortLabel (space: Pick<Space, 'name'> & { identifier?: string }): string {
  return space.identifier !== undefined && space.identifier !== '' ? space.identifier : space.name
}
