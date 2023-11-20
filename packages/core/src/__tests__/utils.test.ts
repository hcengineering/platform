//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { mergeQueries } from '..'

describe('mergeQueries', () => {
  it('merges query with empty query', () => {
    const q1 = { name: 'john', age: { $gt: 42 } }
    const q2 = {}
    const res = { name: 'john', age: { $gt: 42 } }

    expect(mergeQueries(q1, q2)).toEqual(res)
    expect(mergeQueries(q2, q1)).toEqual(res)
  })

  it('merges query with different fields', () => {
    const q1 = { name: 'john' }
    const q2 = { age: { $gt: 42 } }
    const res = { name: 'john', age: { $gt: 42 } }

    expect(mergeQueries(q1, q2)).toEqual(res)
    expect(mergeQueries(q2, q1)).toEqual(res)
  })

  it('merges equal field values', () => {
    expect(mergeQueries({ value: 42 }, { value: 42 })).toEqual({ value: 42 })
  })

  it('does not merge different field values', () => {
    const q1 = { value: 42 }
    const q2 = { value: 'true' }
    const res = { value: { $in: [] } }
    expect(mergeQueries(q1, q2)).toEqual(res)
    expect(mergeQueries(q2, q1)).toEqual(res)
  })

  it('merges predicate with predicate', () => {
    expect(mergeQueries({ age: { $in: [41, 42] } }, { age: { $in: [42, 43] } })).toEqual({ age: { $in: [42] } })
    expect(mergeQueries({ age: { $in: [42, 43] } }, { age: { $in: [41, 42] } })).toEqual({ age: { $in: [42] } })

    expect(mergeQueries({ age: { $nin: [42] } }, { age: { $nin: [42] } })).toEqual({ age: { $nin: [42] } })

    expect(mergeQueries({ age: { $lt: 45 } }, { age: { $lt: 42 } })).toEqual({ age: { $lt: 42 } })
    expect(mergeQueries({ age: { $lt: 42 } }, { age: { $lt: 45 } })).toEqual({ age: { $lt: 42 } })

    expect(mergeQueries({ age: { $gt: 40 } }, { age: { $gt: 42 } })).toEqual({ age: { $gt: 42 } })
    expect(mergeQueries({ age: { $gt: 42 } }, { age: { $gt: 40 } })).toEqual({ age: { $gt: 42 } })

    expect(mergeQueries({ age: { $lte: 45 } }, { age: { $lte: 42 } })).toEqual({ age: { $lte: 42 } })
    expect(mergeQueries({ age: { $lte: 42 } }, { age: { $lte: 45 } })).toEqual({ age: { $lte: 42 } })

    expect(mergeQueries({ age: { $gte: 40 } }, { age: { $gte: 42 } })).toEqual({ age: { $gte: 42 } })
    expect(mergeQueries({ age: { $gte: 42 } }, { age: { $gte: 40 } })).toEqual({ age: { $gte: 42 } })

    expect(mergeQueries({ age: { $ne: 42 } }, { age: { $ne: 42 } })).toEqual({ age: { $ne: 42 } })
  })

  it('merges predicate with value', () => {
    // positive
    expect(mergeQueries({ age: { $in: [41, 42, 43] } }, { age: 42 })).toEqual({ age: 42 })
    expect(mergeQueries({ age: 42 }, { age: { $in: [41, 42, 43] } })).toEqual({ age: 42 })

    expect(mergeQueries({ age: { $nin: [41, 43] } }, { age: 42 })).toEqual({ age: 42 })
    expect(mergeQueries({ age: 42 }, { age: { $nin: [41, 43] } })).toEqual({ age: 42 })

    expect(mergeQueries({ age: { $lt: 45 } }, { age: 42 })).toEqual({ age: 42 })
    expect(mergeQueries({ age: 42 }, { age: { $lt: 45 } })).toEqual({ age: 42 })

    expect(mergeQueries({ age: { $gt: 40 } }, { age: 42 })).toEqual({ age: 42 })
    expect(mergeQueries({ age: 42 }, { age: { $gt: 40 } })).toEqual({ age: 42 })

    expect(mergeQueries({ age: { $lte: 42 } }, { age: 42 })).toEqual({ age: 42 })
    expect(mergeQueries({ age: 42 }, { age: { $lte: 42 } })).toEqual({ age: 42 })

    expect(mergeQueries({ age: { $gte: 42 } }, { age: 42 })).toEqual({ age: 42 })
    expect(mergeQueries({ age: 42 }, { age: { $gte: 42 } })).toEqual({ age: 42 })

    expect(mergeQueries({ age: { $ne: 40 } }, { age: 42 })).toEqual({ age: 42 })
    expect(mergeQueries({ age: 42 }, { age: { $ne: 40 } })).toEqual({ age: 42 })

    // negative
    expect(mergeQueries({ age: { $in: [31, 32, 33] } }, { age: 42 })).toEqual({ age: { $in: [] } })
    expect(mergeQueries({ age: 42 }, { age: { $in: [31, 32, 33] } })).toEqual({ age: { $in: [] } })

    expect(mergeQueries({ age: { $nin: [41, 42, 43] } }, { age: 42 })).toEqual({ age: { $in: [] } })
    expect(mergeQueries({ age: 42 }, { age: { $nin: [41, 42, 43] } })).toEqual({ age: { $in: [] } })

    expect(mergeQueries({ age: { $lt: 42 } }, { age: 42 })).toEqual({ age: { $in: [] } })
    expect(mergeQueries({ age: 42 }, { age: { $lt: 42 } })).toEqual({ age: { $in: [] } })

    expect(mergeQueries({ age: { $gt: 42 } }, { age: 42 })).toEqual({ age: { $in: [] } })
    expect(mergeQueries({ age: 42 }, { age: { $gt: 42 } })).toEqual({ age: { $in: [] } })

    expect(mergeQueries({ age: { $lte: 40 } }, { age: 42 })).toEqual({ age: { $in: [] } })
    expect(mergeQueries({ age: 42 }, { age: { $lte: 40 } })).toEqual({ age: { $in: [] } })

    expect(mergeQueries({ age: { $gte: 43 } }, { age: 42 })).toEqual({ age: { $in: [] } })
    expect(mergeQueries({ age: 42 }, { age: { $gte: 43 } })).toEqual({ age: { $in: [] } })

    expect(mergeQueries({ age: { $ne: 42 } }, { age: 42 })).toEqual({ age: { $in: [] } })
    expect(mergeQueries({ age: 42 }, { age: { $ne: 42 } })).toEqual({ age: { $in: [] } })
  })

  it('$in merge', () => {
    expect(mergeQueries({ value: { $in: [1, 2] } }, { value: { $in: [2, 3] } })).toEqual({ value: { $in: [2] } })
    expect(mergeQueries({ value: { $in: [2, 3] } }, { value: { $in: [1, 2] } })).toEqual({ value: { $in: [2] } })

    expect(mergeQueries({ value: { $in: [1, 2] } }, { value: { $in: [3, 4] } })).toEqual({ value: { $in: [] } })
    expect(mergeQueries({ value: { $in: [3, 4] } }, { value: { $in: [1, 2] } })).toEqual({ value: { $in: [] } })

    expect(mergeQueries({ value: { $in: [] } }, { value: { $in: [] } })).toEqual({ value: { $in: [] } })
    expect(mergeQueries({ value: { $in: [42] } }, { value: { $in: [42] } })).toEqual({ value: { $in: [42] } })
  })

  it('$nin merge', () => {
    expect(mergeQueries({ value: { $nin: [] } }, { value: { $nin: [] } })).toEqual({})
    expect(mergeQueries({ value: { $nin: [42] } }, { value: { $nin: [42] } })).toEqual({ value: { $nin: [42] } })
  })

  it('$in $nin $ne merge', () => {
    // $in and $nin
    expect(mergeQueries({ value: { $in: [1, 2] } }, { value: { $nin: [1] } })).toEqual({ value: { $in: [2] } })
    expect(mergeQueries({ value: { $nin: [1] } }, { value: { $in: [1, 2] } })).toEqual({ value: { $in: [2] } })

    expect(mergeQueries({ value: { $in: ['a', 'b'] } }, { value: { $nin: ['a'] } })).toEqual({ value: { $in: ['b'] } })
    expect(mergeQueries({ value: { $nin: ['a'] } }, { value: { $in: ['a', 'b'] } })).toEqual({ value: { $in: ['b'] } })

    expect(mergeQueries({ value: { $in: [1, 2] } }, { value: { $nin: [1, 2, 3] } })).toEqual({ value: { $in: [] } })
    expect(mergeQueries({ value: { $nin: [1, 2, 3] } }, { value: { $in: [1, 2] } })).toEqual({ value: { $in: [] } })

    expect(mergeQueries({ value: { $in: [1, 2] } }, { value: { $nin: [1, 2] } })).toEqual({ value: { $in: [] } })

    expect(mergeQueries({ value: { $in: [] } }, { value: { $nin: [42] } })).toEqual({ value: { $in: [] } })
    expect(mergeQueries({ value: { $nin: [42] } }, { value: { $in: [] } })).toEqual({ value: { $in: [] } })

    // $in and $ne
    expect(mergeQueries({ value: { $in: [1, 2] } }, { value: { $ne: 1 } })).toEqual({ value: { $in: [2] } })
    expect(mergeQueries({ value: { $ne: 1 } }, { value: { $in: [1, 2] } })).toEqual({ value: { $in: [2] } })

    expect(mergeQueries({ value: { $in: [1] } }, { value: { $ne: 1 } })).toEqual({ value: { $in: [] } })
    expect(mergeQueries({ value: { $ne: 1 } }, { value: { $in: [1] } })).toEqual({ value: { $in: [] } })

    expect(mergeQueries({ value: { $in: [] } }, { value: { $ne: 42 } })).toEqual({ value: { $in: [] } })
    expect(mergeQueries({ value: { $ne: 42 } }, { value: { $in: [] } })).toEqual({ value: { $in: [] } })
  })

  it('$lt and $gt', () => {
    expect(mergeQueries({ age: { $lt: 25 } }, { age: { $gt: 20 } })).toEqual({ age: { $lt: 25, $gt: 20 } })
    expect(mergeQueries({ age: { $gt: 20 } }, { age: { $lt: 25 } })).toEqual({ age: { $lt: 25, $gt: 20 } })

    expect(mergeQueries({ age: { $lt: 20 } }, { age: { $gt: 25 } })).toEqual({ age: { $lt: 20, $gt: 25 } })
    expect(mergeQueries({ age: { $gt: 25 } }, { age: { $lt: 20 } })).toEqual({ age: { $lt: 20, $gt: 25 } })
  })

  it('complex', () => {
    const q1 = {
      space: 1,
      unique: 'item',
      age: { $gt: 10 }
    } as any
    const q2 = {
      space: { $in: [1, 2] },
      age: 30
    } as any
    const res = {
      space: 1,
      unique: 'item',
      age: 30
    } as any
    expect(mergeQueries(q1, q2)).toEqual(res)
    expect(mergeQueries(q2, q1)).toEqual(res)
  })
})
