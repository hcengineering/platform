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
import { groupStatusesByCategory, statusGroupingThreshold } from '../statusCategories'

const categories = new Map<Ref<StatusCategory>, StatusCategory>(
  [
    ['backlog', 0],
    ['started', 2],
    ['unstarted', 1]
  ].map(([id, order]) => [
    id as Ref<StatusCategory>,
    { _id: id as Ref<StatusCategory>, order: order as number, label: `cat:${id}` } as unknown as StatusCategory
  ])
)

function status (name: string, category?: string): Status {
  return { _id: name as Ref<Status>, name, category: category as Ref<StatusCategory> | undefined } as unknown as Status
}

function names (statuses: Status[]): string[] {
  return groupStatusesByCategory(statuses, (ref) => categories.get(ref)).map(
    ({ status, category }) => `${status.name}:${category?._id ?? '-'}`
  )
}

describe('groupStatusesByCategory', () => {
  it('keeps the original order without categories below the threshold', () => {
    const statuses = [status('b', 'started'), status('a', 'backlog')]
    expect(names(statuses)).toEqual(['b:-', 'a:-'])
  })

  it('orders statuses by category order and keeps the order inside a category', () => {
    const statuses = [
      status('s1', 'started'),
      status('u1', 'unstarted'),
      status('x1'),
      status('b1', 'backlog'),
      status('s2', 'started'),
      status('b2', 'backlog'),
      status('u2', 'unstarted'),
      status('s3', 'started'),
      status('b3', 'backlog'),
      status('u3', 'unstarted')
    ]
    expect(statuses.length).toBe(statusGroupingThreshold)
    expect(names(statuses)).toEqual([
      'b1:backlog',
      'b2:backlog',
      'b3:backlog',
      'u1:unstarted',
      'u2:unstarted',
      'u3:unstarted',
      's1:started',
      's2:started',
      's3:started',
      'x1:-'
    ])
  })
})
