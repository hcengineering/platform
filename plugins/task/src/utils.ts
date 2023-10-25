//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Class, Data, DocumentQuery, IdMap, Ref, Status, TxOperations } from '@hcengineering/core'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'
import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'
import task, { Project, ProjectType } from '.'

/**
 * @public
 */
export function genRanks (count: number): string[] {
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

/**
 * @public
 */
export const calcRank = (prev?: { rank: string }, next?: { rank: string }): string => {
  const a = prev?.rank !== undefined ? LexoRank.parse(prev.rank) : LexoRank.min()
  const b = next?.rank !== undefined ? LexoRank.parse(next.rank) : LexoRank.max()
  if (a.equals(b)) {
    return a.genNext().toString()
  }
  return a.between(b).toString()
}

/**
 * @public
 */
export function getStates (space: Project | undefined, types: IdMap<ProjectType>, statuses: IdMap<Status>): Status[] {
  if (space === undefined) return []
  return (
    (types
      .get(space.type)
      ?.statuses?.map((p) => statuses.get(p._id))
      ?.filter((p) => p !== undefined) as Status[]) ?? []
  )
}

/**
 * @public
 */
export async function createState<T extends Status> (
  client: TxOperations,
  _class: Ref<Class<T>>,
  data: Data<T>
): Promise<Ref<T>> {
  const query: DocumentQuery<Status> = { name: data.name, ofAttribute: data.ofAttribute }
  if (data.category !== undefined) {
    query.category = data.category
  }
  const exists = await client.findOne(_class, query)
  if (exists !== undefined) {
    return exists._id as Ref<T>
  }
  const res = await client.createDoc(_class, task.space.Statuses, data)
  return res
}
