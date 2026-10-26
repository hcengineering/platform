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

import type { FilteredView } from '@hcengineering/view'
import { getFilteredViewSpaceId, getFilteredViewSpaceIds, getSpaceShortLabel } from '../savedViewSpace'

function fv (path: string[]): Pick<FilteredView, 'location'> {
  return { location: { path } } as unknown as Pick<FilteredView, 'location'>
}

describe('saved view space', () => {
  test('takes the space segment of the location path', () => {
    expect(getFilteredViewSpaceId(fv(['workbench', 'ws', 'tracker', 'project-1', 'issues']))).toBe('project-1')
    expect(getFilteredViewSpaceId(fv(['workbench', 'ws', 'tracker']))).toBeUndefined()
    expect(getFilteredViewSpaceId(fv(['workbench', 'ws', 'tracker', '']))).toBeUndefined()
  })

  test('collects unique sorted ids', () => {
    const views = [
      fv(['workbench', 'ws', 'tracker', 'b', 'issues']),
      fv(['workbench', 'ws', 'tracker', 'a', 'issues']),
      fv(['workbench', 'ws', 'tracker', 'b', 'issues']),
      fv(['workbench', 'ws', 'tracker'])
    ]
    expect(getFilteredViewSpaceIds(views)).toEqual(['a', 'b'])
    expect(getFilteredViewSpaceIds([])).toEqual([])
  })

  test('prefers the identifier over the name', () => {
    expect(getSpaceShortLabel({ name: 'Website', identifier: 'WEB' })).toBe('WEB')
    expect(getSpaceShortLabel({ name: 'general' })).toBe('general')
    expect(getSpaceShortLabel({ name: 'Website', identifier: '' })).toBe('Website')
  })
})
