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

import { type SortingOrder } from '@hcengineering/core'
import { type IntlString } from '@hcengineering/platform'
import { type ViewOptions, type ViewOptionsModel } from '@hcengineering/view'
import { getViewletDefaultOptions } from '../viewletDefaultOptions'

// SortingOrder.Ascending / Descending, inlined to keep the test free of runtime deps.
const ascending: SortingOrder = 1
const descending: SortingOrder = -1
const label = 'view:string:Label' as IntlString

const fallback: ViewOptions = {
  groupBy: ['#no_category'],
  orderBy: ['modifiedBy', descending]
}

describe('getViewletDefaultOptions', () => {
  test('uses the first declared grouping and ordering of the viewlet', () => {
    const model: ViewOptionsModel = {
      groupBy: ['status', 'assignee'],
      orderBy: [
        ['rank', ascending],
        ['modifiedOn', descending]
      ],
      other: [],
      groupDepth: 1
    }
    expect(getViewletDefaultOptions(model, fallback)).toEqual({
      groupBy: ['status'],
      orderBy: ['rank', ascending]
    })
  })

  test('applies the default value of every extra option', () => {
    const model: ViewOptionsModel = {
      groupBy: ['status'],
      orderBy: [['rank', ascending]],
      other: [
        { key: 'shouldShowColors', type: 'toggle', defaultValue: true, label },
        { key: 'showEmptyGroups', type: 'toggle', defaultValue: false, label }
      ]
    }
    expect(getViewletDefaultOptions(model, fallback)).toEqual({
      groupBy: ['status'],
      orderBy: ['rank', ascending],
      shouldShowColors: true,
      showEmptyGroups: false
    })
  })

  test('falls back when the viewlet declares no grouping or ordering', () => {
    const model: ViewOptionsModel = { groupBy: [], orderBy: [], other: [] }
    expect(getViewletDefaultOptions(model, fallback)).toEqual(fallback)
  })

  test('returns a fresh object that does not alias the fallback', () => {
    const model: ViewOptionsModel = { groupBy: [], orderBy: [], other: [] }
    const res = getViewletDefaultOptions(model, fallback)
    res.groupBy.push('status')
    expect(fallback.groupBy).toEqual(['#no_category'])
  })
})
