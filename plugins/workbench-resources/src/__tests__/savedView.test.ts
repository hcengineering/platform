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
import { canOverwriteFilteredView } from '../savedView'

const owner = 'owner-id' as PersonId
const other = 'other-id' as PersonId
const path = ['workbench', 'ws', 'tracker', 'project', 'issues']

const savedView = { createdBy: owner, location: { path } }

describe('canOverwriteFilteredView', () => {
  it('allows the creator to overwrite while the saved list is open', () => {
    expect(canOverwriteFilteredView(savedView, [other, owner], [...path], 2)).toBe(true)
  })

  it('denies other users', () => {
    expect(canOverwriteFilteredView(savedView, [other], path, 2)).toBe(false)
  })

  it('denies when another list is open', () => {
    const otherPath = ['workbench', 'ws', 'tracker', 'project', 'components']
    expect(canOverwriteFilteredView(savedView, [owner], otherPath, 2)).toBe(false)
  })

  it('denies when no filter is applied', () => {
    expect(canOverwriteFilteredView(savedView, [owner], path, 0)).toBe(false)
  })
})
