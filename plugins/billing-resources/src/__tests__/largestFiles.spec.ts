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

import type { Class, Doc, Ref, Space } from '@hcengineering/core'

import { mergeBySizeDesc, topBySize, type LargestFileRow } from '../stores/largestFilesLogic'

function row (id: string, source: LargestFileRow['source'], size: number, lastModified: number = 0): LargestFileRow {
  return {
    id: id as unknown as Ref<Doc>,
    source,
    name: id,
    size,
    type: 'application/octet-stream',
    lastModified,
    owner: undefined,
    space: 'test-space' as unknown as Ref<Space>,
    ref: {
      _id: id as unknown as Ref<Doc>,
      _class: 'test-class' as unknown as Ref<Class<Doc>>,
      space: 'test-space' as unknown as Ref<Space>
    }
  }
}

describe('mergeBySizeDesc', () => {
  it('returns an empty array when both inputs are empty', () => {
    expect(mergeBySizeDesc([], [])).toEqual([])
  })

  it('returns the non-empty side untouched when one input is empty', () => {
    const a = [row('a1', 'attachment', 100)]
    expect(mergeBySizeDesc(a, [])).toEqual(a)
    expect(mergeBySizeDesc([], a)).toEqual(a)
  })

  it('merges two pre-sorted streams keeping size-descending order', () => {
    const a = [row('a1', 'attachment', 500), row('a2', 'attachment', 200), row('a3', 'attachment', 50)]
    const b = [row('b1', 'drive', 400), row('b2', 'drive', 300), row('b3', 'drive', 100)]

    const merged = mergeBySizeDesc(a, b)

    expect(merged.map((r) => r.size)).toEqual([500, 400, 300, 200, 100, 50])
  })

  it('breaks size ties with the more recent lastModified first', () => {
    const a = [row('a1', 'attachment', 100, 1000), row('a2', 'attachment', 100, 500)]
    const b = [row('b1', 'drive', 100, 750)]

    const merged = mergeBySizeDesc(a, b)

    expect(merged.map((r) => r.id)).toEqual(['a1', 'b1', 'a2'])
  })

  it('produces a deterministic order when size and timestamp tie', () => {
    const a = [row('aaa', 'attachment', 100, 0)]
    const b = [row('bbb', 'drive', 100, 0)]

    const merged1 = mergeBySizeDesc(a, b)
    const merged2 = mergeBySizeDesc(b, a)

    expect(merged1.map((r) => r.id)).toEqual(merged2.map((r) => r.id))
  })
})

describe('topBySize', () => {
  it('returns an empty array for a non-positive limit', () => {
    const a = [row('a1', 'attachment', 100)]
    expect(topBySize(a, [], 0)).toEqual([])
    expect(topBySize(a, [], -3)).toEqual([])
  })

  it('returns at most `limit` rows, biggest first', () => {
    const a = [row('a1', 'attachment', 500), row('a2', 'attachment', 200), row('a3', 'attachment', 50)]
    const b = [row('b1', 'drive', 400), row('b2', 'drive', 300), row('b3', 'drive', 100)]

    const top3 = topBySize(a, b, 3)

    expect(top3.map((r) => r.size)).toEqual([500, 400, 300])
  })

  it('handles a limit larger than the combined input', () => {
    const a = [row('a1', 'attachment', 100)]
    const b = [row('b1', 'drive', 50)]

    const top = topBySize(a, b, 10)

    expect(top.map((r) => r.id)).toEqual(['a1', 'b1'])
  })

  it('preserves source labels in the merged output', () => {
    const a = [row('a1', 'attachment', 200)]
    const b = [row('b1', 'drive', 100)]

    const merged = topBySize(a, b, 2)

    expect(merged[0].source).toBe('attachment')
    expect(merged[1].source).toBe('drive')
  })
})
