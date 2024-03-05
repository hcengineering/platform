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

import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'
import type { Rank } from './types'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'

/** @public */
export function genRanks (count: number): Rank[] {
  const sys = new LexoNumeralSystem36()
  const base = 36
  const max = base ** 6
  const gap = LexoDecimal.parse(Math.trunc(max / (count + 2)).toString(base), sys)
  let cur = LexoDecimal.parse('0', sys)
  const res: string[] = []
  for (let i = 0; i < count; i++) {
    cur = cur.add(gap)
    res.push(new LexoRank(LexoRankBucket.BUCKET_0, cur).toString())
  }
  return res
}

/** @public */
export function makeRank (prev: Rank | undefined, next: Rank | undefined): Rank {
  const prevLexoRank = prev === undefined ? LexoRank.min() : LexoRank.parse(prev)
  const nextLexoRank = next === undefined ? LexoRank.max() : LexoRank.parse(next)
  return prevLexoRank.equals(nextLexoRank)
    ? prevLexoRank.genNext().toString()
    : prevLexoRank.between(nextLexoRank).toString()
}
