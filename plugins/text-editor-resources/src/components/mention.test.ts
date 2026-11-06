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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Class, Doc, Ref } from '@hcengineering/core'
import type { ObjectSearchCategory, SearchItem } from '@hcengineering/presentation'
import { excludeMentionItems } from './mention'

function category (id: string): ObjectSearchCategory {
  return { _id: id } as unknown as ObjectSearchCategory
}

const employees = category('employees')
const organizations = category('organizations')

function item (cat: ObjectSearchCategory, num: number, id: string): SearchItem {
  return {
    num,
    category: cat,
    item: { id: id as Ref<Doc>, doc: { _id: id as Ref<Doc>, _class: 'class' as Ref<Class<Doc>>, createdOn: 0 } }
  }
}

function ids (items: SearchItem[]): Array<[string, number]> {
  return items.map((it) => [it.item.doc._id, it.num])
}

describe('excludeMentionItems', () => {
  it('drops excluded items and renumbers the rest of the category', () => {
    const items = [item(employees, 0, 'inactive'), item(employees, 1, 'a'), item(organizations, 0, 'org')]
    const result = excludeMentionItems(items, new Set(['inactive' as Ref<Doc>]), 5)
    expect(ids(result)).toEqual([
      ['a', 0],
      ['org', 0]
    ])
  })

  it('keeps at most limit items per category after exclusion', () => {
    const items = [
      item(employees, 0, 'a'),
      item(employees, 1, 'inactive'),
      item(employees, 2, 'b'),
      item(employees, 3, 'c'),
      item(organizations, 0, 'o1'),
      item(organizations, 1, 'o2'),
      item(organizations, 2, 'o3')
    ]
    const result = excludeMentionItems(items, new Set(['inactive' as Ref<Doc>]), 2)
    expect(ids(result)).toEqual([
      ['a', 0],
      ['b', 1],
      ['o1', 0],
      ['o2', 1]
    ])
  })

  it('returns items unchanged when nothing is excluded', () => {
    const items = [item(employees, 0, 'a'), item(employees, 1, 'b')]
    expect(ids(excludeMentionItems(items, new Set(), 5))).toEqual([
      ['a', 0],
      ['b', 1]
    ])
  })
})
