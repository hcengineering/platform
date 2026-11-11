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
import { SortingOrder } from '@hcengineering/core'
import { type OrderOption } from '@hcengineering/view'

import { hasOrderDirection, reverseOrder, selectOrder } from '../orderDirection'

const options: OrderOption[] = [
  ['modifiedOn', SortingOrder.Descending],
  ['title', SortingOrder.Ascending],
  ['rank', SortingOrder.Ascending]
]

describe('orderDirection', () => {
  test('manual ordering has no direction', () => {
    expect(hasOrderDirection('rank')).toBe(false)
    expect(hasOrderDirection(undefined)).toBe(false)
    expect(hasOrderDirection('modifiedOn')).toBe(true)
    expect(hasOrderDirection(['title', SortingOrder.Ascending])).toBe(false)
  })

  test('reverseOrder flips the direction without mutating the input', () => {
    const order: OrderOption = ['title', SortingOrder.Ascending]
    expect(reverseOrder(order)).toEqual(['title', SortingOrder.Descending])
    expect(reverseOrder(['title', SortingOrder.Descending])).toEqual(['title', SortingOrder.Ascending])
    expect(order).toEqual(['title', SortingOrder.Ascending])
  })

  test('selecting another key uses its default direction', () => {
    const result = selectOrder(['title', SortingOrder.Descending], 'modifiedOn', options)
    expect(result).toEqual(['modifiedOn', SortingOrder.Descending])
    expect(result).not.toBe(options[0])
  })

  test('selecting the active key again reverses the direction', () => {
    expect(selectOrder(['title', SortingOrder.Ascending], 'title', options)).toEqual(['title', SortingOrder.Descending])
    expect(selectOrder(['title', SortingOrder.Descending], 'title', options)).toEqual(['title', SortingOrder.Ascending])
  })

  test('selecting manual ordering again keeps it ascending', () => {
    expect(selectOrder(['rank', SortingOrder.Descending], 'rank', options)).toEqual(['rank', SortingOrder.Ascending])
  })

  test('unknown keys and missing current ordering', () => {
    expect(selectOrder(['title', SortingOrder.Ascending], 'unknown', options)).toBeUndefined()
    expect(selectOrder(undefined, 'title', options)).toEqual(['title', SortingOrder.Ascending])
  })
})
