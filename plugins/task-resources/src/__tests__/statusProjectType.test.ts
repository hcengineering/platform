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
import type { ProjectStatus, ProjectType, TaskType } from '@hcengineering/task'
import { getStatusProjectType } from '../statusProjectType'

const status = 'status-a' as Ref<Status>
const other = 'status-b' as Ref<Status>

function projectType (id: string, statuses: Array<Partial<ProjectStatus>>): ProjectType {
  return {
    _id: id as Ref<ProjectType>,
    statuses: statuses.map((it) => ({ taskType: 'tt' as Ref<TaskType>, ...it }))
  } as unknown as ProjectType
}

function typesMap (...types: ProjectType[]): IdMap<ProjectType> {
  return new Map(types.map((it) => [it._id, it]))
}

describe('getStatusProjectType', () => {
  const plain = projectType('plain', [{ _id: status }])
  const colored = projectType('colored', [{ _id: status, color: 5 }])
  const unrelated = projectType('unrelated', [{ _id: other, color: 3 }])
  const types = typesMap(plain, colored, unrelated)

  it('uses the selected project type when present', () => {
    expect(getStatusProjectType(status, unrelated._id, types, [plain._id, colored._id])).toBe(unrelated._id)
  })

  it('prefers a joined project type that configures the status color', () => {
    expect(getStatusProjectType(status, undefined, types, [unrelated._id, plain._id, colored._id])).toBe(colored._id)
  })

  it('falls back to the first joined project type containing the status', () => {
    expect(getStatusProjectType(status, undefined, types, [unrelated._id, plain._id])).toBe(plain._id)
  })

  it('returns undefined when no joined project type contains the status', () => {
    expect(getStatusProjectType(status, undefined, types, [unrelated._id, 'missing' as Ref<ProjectType>])).toBe(
      undefined
    )
  })
})
