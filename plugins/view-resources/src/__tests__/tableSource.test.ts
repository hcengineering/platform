//
// Copyright © 2026 TraceX SAS.
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

import type { Class, Doc, Ref, Space } from '@hcengineering/core'
import type { FilteredView } from '@hcengineering/view'
import { escapeCommentJson, getTableFilterSource, publishFilterSource } from '../tableSource'
import { selectedFilterStore } from '../filter'
import { activeViewlet } from '../utils'

jest.mock('svelte/store', () => ({
  writable: (value: unknown) => ({
    value,
    set (next: unknown) {
      this.value = next
    }
  }),
  get: (store: { value: unknown }) => store.value
}))
jest.mock('@hcengineering/ui', () => ({ getCurrentLocation: (): { path: string[] } => ({ path: [] }) }))
jest.mock('../filter', () => ({ selectedFilterStore: jest.requireMock('svelte/store').writable(undefined) }))
jest.mock('../utils', () => ({
  activeViewlet: jest.requireMock('svelte/store').writable({}),
  makeViewletKey: () => 'key'
}))
jest.mock('../viewOptions', () => ({
  viewOptionStore: jest.requireMock('svelte/store').writable(new Map()),
  getViewOptions: (): undefined => undefined
}))

const cardClass = 'test:class:Doc' as Ref<Class<Doc>>
const filters = '[{"key":"state"}]'
const saved = { _id: 'saved', filters, filterClass: cardClass, viewletId: null } as unknown as FilteredView

function publish (id = 'bar'): void {
  publishFilterSource(id, { cardClass, baseQuery: { space: 's' as Ref<Space> }, filters })
}

describe('table filter source', () => {
  afterEach(() => {
    selectedFilterStore.set(undefined)
    activeViewlet.set({})
    publishFilterSource('bar', undefined)
    publishFilterSource('other', undefined)
  })

  it('is published by a mounted filter bar and withdrawn when it goes away', () => {
    publish()
    expect(getTableFilterSource(cardClass)).toEqual({ baseQuery: { space: 's' }, filters })
    publishFilterSource('bar', undefined)
    expect(getTableFilterSource(cardClass)).toBeUndefined()
  })

  it('picks the filter bar that fed the copied view when several views of the class are open', () => {
    publishFilterSource('bar', {
      cardClass,
      baseQuery: { space: 's' as Ref<Space> },
      filters,
      resultQuery: { space: 's' as Ref<Space>, state: 'open' }
    })
    publishFilterSource('other', { cardClass, baseQuery: {}, filters: '[]', resultQuery: { component: 'c' } })
    // Exact query, the same query with keys in another order, and a view that adds its own terms.
    expect(getTableFilterSource(cardClass, { space: 's', state: 'open' } as any)?.filters).toBe(filters)
    expect(getTableFilterSource(cardClass, { state: 'open', space: 's' } as any)?.filters).toBe(filters)
    expect(getTableFilterSource(cardClass, { component: 'c', title: 'x' } as any)?.filters).toBe('[]')
    // Another view's filters are never attached; without a view query the choice is ambiguous.
    expect(getTableFilterSource(cardClass, { space: 'elsewhere' } as any)).toBeUndefined()
    expect(getTableFilterSource(cardClass)).toBeUndefined()
  })

  it('reports the open saved view and whether the filters on screen differ from it', () => {
    publish()
    selectedFilterStore.set(saved)
    activeViewlet.set({ key: null })
    expect(getTableFilterSource(cardClass)).toEqual({
      baseQuery: { space: 's' },
      filters,
      filteredViewId: 'saved',
      savedViewModified: false
    })
    selectedFilterStore.set({ ...saved, filters: '[]' })
    expect(getTableFilterSource(cardClass)).toEqual({
      baseQuery: { space: 's' },
      filters,
      filteredViewId: 'saved',
      savedViewModified: true
    })
    selectedFilterStore.set({ ...saved, filterClass: 'other' } as unknown as FilteredView)
    expect(getTableFilterSource(cardClass)).toEqual({ baseQuery: { space: 's' }, filters })
  })

  it('ignores filter bars of other classes', () => {
    publish()
    expect(getTableFilterSource('other' as Ref<Class<Doc>>)).toBeUndefined()
  })
})

describe('metadata comment escaping', () => {
  it('cannot be closed early by values in the metadata', () => {
    const json = escapeCommentJson(JSON.stringify({ query: { title: 'a --> <b>' } }))
    expect(json).not.toMatch(/[<>]/)
    expect(JSON.parse(json)).toEqual({ query: { title: 'a --> <b>' } })
  })
})
