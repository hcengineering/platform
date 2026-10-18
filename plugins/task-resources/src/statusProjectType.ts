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

import type { IdMap, Ref, Status } from '@hcengineering/core'
import type { ProjectType } from '@hcengineering/task'

/**
 * Resolve the project type used to present a status when no space is known (e.g. All Issues).
 * The selected project type wins; otherwise a joined project type that configures a color or icon
 * for the status is preferred, falling back to the first joined project type that contains it.
 *
 * @public
 */
export function getStatusProjectType (
  status: Ref<Status>,
  selectedProjectType: Ref<ProjectType> | undefined,
  projectTypes: IdMap<ProjectType>,
  joinedProjectTypes: Array<Ref<ProjectType>>
): Ref<ProjectType> | undefined {
  if (selectedProjectType !== undefined) return selectedProjectType
  let fallback: Ref<ProjectType> | undefined
  for (const typeId of joinedProjectTypes) {
    const projectStatus = projectTypes.get(typeId)?.statuses?.find((it) => it._id === status)
    if (projectStatus === undefined) continue
    if (projectStatus.color !== undefined || projectStatus.icon !== undefined) return typeId
    fallback = fallback ?? typeId
  }
  return fallback
}
