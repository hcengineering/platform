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

import { isNewTabClick } from '../linkClick'

function click (
  init: Partial<Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>> = {}
): Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'> {
  return { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...init }
}

describe('isNewTabClick', () => {
  it('ignores a plain left click', () => {
    expect(isNewTabClick(click())).toBe(false)
  })

  it('accepts Ctrl or Cmd + left click', () => {
    expect(isNewTabClick(click({ ctrlKey: true }))).toBe(true)
    expect(isNewTabClick(click({ metaKey: true }))).toBe(true)
  })

  it('accepts a middle click', () => {
    expect(isNewTabClick(click({ button: 1 }))).toBe(true)
  })

  it('ignores a right click', () => {
    expect(isNewTabClick(click({ button: 2 }))).toBe(false)
    expect(isNewTabClick(click({ button: 2, ctrlKey: true }))).toBe(false)
  })

  it('leaves Shift and Alt combinations to the browser', () => {
    expect(isNewTabClick(click({ ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(isNewTabClick(click({ metaKey: true, altKey: true }))).toBe(false)
    expect(isNewTabClick(click({ button: 1, shiftKey: true }))).toBe(false)
    expect(isNewTabClick(click({ shiftKey: true }))).toBe(false)
  })
})
