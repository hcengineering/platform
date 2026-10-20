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

import { type BuildModelKey } from '@hcengineering/view'
import { isDefaultHidden, withoutDefaultHidden } from '../defaultHidden'

describe('defaultHidden', () => {
  const hidden: BuildModelKey = {
    key: 'space',
    props: { openIssues: true },
    displayProps: { key: 'project', compression: true, defaultHidden: true }
  }

  test('detects default hidden entries', () => {
    expect(isDefaultHidden(hidden)).toBe(true)
    expect(isDefaultHidden('space')).toBe(false)
    expect(isDefaultHidden({ key: 'space' })).toBe(false)
    expect(isDefaultHidden({ key: 'space', displayProps: { defaultHidden: false } })).toBe(false)
  })

  test('strips the flag and keeps the rest of the entry', () => {
    const shown = withoutDefaultHidden(hidden)
    expect(shown).toEqual({
      key: 'space',
      props: { openIssues: true },
      displayProps: { key: 'project', compression: true }
    })
    expect(isDefaultHidden(shown)).toBe(false)
    expect(hidden.displayProps?.defaultHidden).toBe(true)
  })

  test('returns other entries unchanged', () => {
    const entry: BuildModelKey = { key: 'assignee', displayProps: { fixed: 'right' } }
    expect(withoutDefaultHidden(entry)).toBe(entry)
    expect(withoutDefaultHidden('modifiedOn')).toBe('modifiedOn')
  })
})
