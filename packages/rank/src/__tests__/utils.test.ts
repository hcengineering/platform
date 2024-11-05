//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { makeRank } from '..'

describe('makeRank', () => {
  it('calculates rank when no prev and next', () => {
    expect(makeRank(undefined, undefined)).toBe('0|hzzzzz:')
  })

  it.each([
    ['0|hzzzzz:', '0|i00007:'],
    ['0|i00007:', '0|i0000f:'],
    ['0|i0000f:', '0|i0000n:'],
    ['0|zzzzzz:', '0|zzzzzz:']
  ])('calculates rank value when prev is %p', (prev, expected) => {
    expect(makeRank(prev, undefined)).toBe(expected)
  })

  it.each([
    ['0|hzzzzz:', '0|hzzzzr:'],
    ['0|hzzzzr:', '0|hzzzzj:'],
    ['0|hzzzzj:', '0|hzzzzb:'],
    ['0|000000:', '0|000000:']
  ])('calculates rank value when next is %p', (next, expected) => {
    expect(makeRank(undefined, next)).toBe(expected)
  })

  it.each([
    ['0|000000:', '0|000001:', '0|000000:i'],
    ['0|hzzzzz:', '0|i0000f:', '0|i00007:'],
    ['0|hzzzzz:', '0|hzzzzz:', '0|i00007:'],
    ['0|i00007:', '0|i00007:', '0|i0000f:'],
    ['0|i00007:', '0|i00008:', '0|i00007:i']
  ])('calculates rank value when prev is %p and next is %p', (prev, next, expected) => {
    expect(makeRank(prev, next)).toBe(expected)
  })

  it.each([
    [10, '0|hzzzxr:'],
    [100, '0|hzzzdr:'],
    [1000, '0|hzzttr:'],
    [10000, '0|hzya9r:']
  ])('produces prev rank of reasonable length for %p generations', (count, expected) => {
    let rank = '0|hzzzzz:'
    for (let i = 0; i < count; i++) {
      rank = makeRank(undefined, rank)
    }
    expect(rank).toBe(expected)
  })

  it.each([
    [5, '0|zfqzzz:'],
    [10, '0|zzd7vh:'],
    [50, '0|zzzzzy:zzzi'],
    [100, '0|zzzzzy:zzzzzzzzzzzv']
  ])('produces middle rank of reasonable length for %p generations', (count, expected) => {
    let rank = '0|hzzzzz:'
    for (let i = 0; i < count; i++) {
      rank = makeRank(rank, '0|zzzzzz')
    }
    expect(rank).toBe(expected)
  })

  it.each([
    [10, '0|i00027:'],
    [100, '0|i000m7:'],
    [1000, '0|i00667:'],
    [10000, '0|i01pq7:'],
    [100000, '0|i0h5a7:'],
    [1000000, '0|i4rgu7:']
  ])('produces next rank of reasonable length for %p generations', (count, expected) => {
    let rank = '0|hzzzzz:'
    for (let i = 0; i < count; i++) {
      rank = makeRank(rank, undefined)
    }
    expect(rank).toBe(expected)
  })
})
