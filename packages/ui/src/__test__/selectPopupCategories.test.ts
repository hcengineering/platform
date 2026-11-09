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

import type { IntlString } from '@hcengineering/platform'
import { buildSelectPopupRows, loadCollapsedCategories, saveCollapsedCategories } from '../selectPopupCategories'
import type { SelectPopupValueType } from '../types'

const todo = { label: 'cat:ToDo' as IntlString }
const done = { label: 'cat:Done' as IntlString }

const items: SelectPopupValueType[] = [
  { id: 'a', text: 'A', category: todo },
  { id: 'b', text: 'B', category: todo },
  { id: 'c', text: 'C', category: done },
  { id: 'd', text: 'D' }
]

function describeRows (rows: ReturnType<typeof buildSelectPopupRows>): string[] {
  return rows.map((row) =>
    row.kind === 'category'
      ? `[${row.category.label} ${row.count}${row.collapsed ? ' collapsed' : ''}]`
      : String(row.item.id)
  )
}

describe('buildSelectPopupRows', () => {
  it('adds a header before each category group', () => {
    expect(describeRows(buildSelectPopupRows(items, new Set()))).toEqual([
      '[cat:ToDo 2]',
      'a',
      'b',
      '[cat:Done 1]',
      'c',
      'd'
    ])
  })

  it('hides items of collapsed categories but keeps the header with the item count', () => {
    expect(describeRows(buildSelectPopupRows(items, new Set([todo.label])))).toEqual([
      '[cat:ToDo 2 collapsed]',
      '[cat:Done 1]',
      'c',
      'd'
    ])
  })

  it('expands all groups when requested, e.g. while searching', () => {
    expect(describeRows(buildSelectPopupRows(items, new Set([todo.label, done.label]), true))).toEqual([
      '[cat:ToDo 2]',
      'a',
      'b',
      '[cat:Done 1]',
      'c',
      'd'
    ])
  })
})

describe('collapsed categories storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('remembers collapsed categories per key', () => {
    saveCollapsedCategories('status', new Set([todo.label]))
    expect(Array.from(loadCollapsedCategories('status'))).toEqual([todo.label])
    expect(loadCollapsedCategories('other').size).toBe(0)
    expect(loadCollapsedCategories(undefined).size).toBe(0)

    saveCollapsedCategories('status', new Set())
    expect(loadCollapsedCategories('status').size).toBe(0)
  })

  it('ignores malformed stored values', () => {
    localStorage.setItem('selectPopup.collapsedCategories.status', '{broken')
    expect(loadCollapsedCategories('status').size).toBe(0)
  })
})
