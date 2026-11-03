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
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { BuildModelKey } from '@hcengineering/view'
import { isRelationColumn, reorderRelationColumns } from '../relation-column-order'

describe('relation column order', () => {
  it('moves columns in both directions without changing the source configuration', () => {
    const config = ['', 'title', 'status']

    expect(reorderRelationColumns(config, 0, 2)).toEqual(['title', 'status', ''])
    expect(reorderRelationColumns(config, 2, 0)).toEqual(['status', '', 'title'])
    expect(config).toEqual(['', 'title', 'status'])
  })

  it('keeps lookup and internal entries in place while reordering displayed columns', () => {
    const hiddenColumn: BuildModelKey = { key: '$lookup.owner.name', props: { compact: true } }
    const config: Array<string | BuildModelKey> = [
      '@before',
      '',
      hiddenColumn,
      'title',
      '@internal',
      'status',
      '@after'
    ]
    const result = reorderRelationColumns(config, 2, 0)

    expect(result).toEqual(['@before', 'status', hiddenColumn, '', '@internal', 'title', '@after'])
    expect(result[2]).toBe(hiddenColumn)
    expect(result.filter(isRelationColumn)).toEqual(['status', '', 'title'])
  })

  it('preserves distinct column configurations even when they have the same key', () => {
    const first: BuildModelKey = { key: '', props: { compact: true }, displayProps: { grow: true } }
    const second: BuildModelKey = { key: '', props: { compact: false } }
    const config: Array<string | BuildModelKey> = [first, 'title', second]
    const result = reorderRelationColumns(config, 2, 0)

    expect(result).toEqual([second, first, 'title'])
    expect(result[0]).toBe(second)
    expect(result[1]).toBe(first)
  })

  it.each([
    [0, 0],
    [-1, 1],
    [0, -1],
    [3, 0],
    [0, 3],
    [0.5, 1],
    [0, Number.NaN]
  ])('ignores invalid or unchanged moves from %s to %s', (from, to) => {
    const config = ['', '@internal', 'title', 'status']
    expect(reorderRelationColumns(config, from, to)).toBe(config)
  })

  it('ignores moves when there are no displayed columns', () => {
    const config = ['@internal', '$lookup.owner.name']
    expect(reorderRelationColumns(config, 0, 1)).toBe(config)
  })
})
