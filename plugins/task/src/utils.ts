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

import {
  Attribute,
  Class,
  Data,
  DocumentQuery,
  IdMap,
  Ref,
  SortingOrder,
  Status,
  TxOperations
} from '@hcengineering/core'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'
import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'
import task, { DoneState, DoneStateTemplate, KanbanTemplate, SpaceWithStates, State } from '.'

/**
 * @public
 */
export const genRanks = (count: number): Generator<string, void, unknown> =>
  (function * () {
    const sys = new LexoNumeralSystem36()
    const base = 36
    const max = base ** 6
    const gap = LexoDecimal.parse(Math.trunc(max / (count + 2)).toString(base), sys)
    let cur = LexoDecimal.parse('0', sys)

    for (let i = 0; i < count; i++) {
      cur = cur.add(gap)
      yield new LexoRank(LexoRankBucket.BUCKET_0, cur).toString()
    }
  })()

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
export function getStates (space: SpaceWithStates | undefined, statusStore: IdMap<Status>): Status[] {
  if (space === undefined) {
    return []
  }

  const states = (space.states ?? []).map((x) => statusStore.get(x) as Status).filter((p) => p !== undefined)

  return states
}

/**
 * @public
 */
export async function createState<T extends Status> (
  client: TxOperations,
  _class: Ref<Class<T>>,
  data: Data<T>,
  _id?: Ref<T>
): Promise<Ref<T>> {
  const query: DocumentQuery<Status> = { name: data.name, ofAttribute: data.ofAttribute }
  if (data.category !== undefined) {
    query.category = data.category
  }
  const exists = await client.findOne(_class, query)
  if (exists !== undefined) {
    return exists._id as Ref<T>
  }
  const res = await client.createDoc(_class, task.space.Statuses, data, _id)
  return res
}

/**
 * @public
 */
export async function createStates (
  client: TxOperations,
  ofAttribute: Ref<Attribute<Status>>,
  doneAtrtribute?: Ref<Attribute<DoneState>>,
  templateId?: Ref<KanbanTemplate>
): Promise<[Ref<Status>[], Ref<DoneState>[]]> {
  if (templateId === undefined) {
    const state = await createState(client, task.class.State, {
      ofAttribute,
      name: 'New State',
      color: 9
    })

    const doneStates: Ref<DoneState>[] = []

    doneStates.push(
      await createState(client, task.class.WonState, {
        ofAttribute: doneAtrtribute ?? ofAttribute,
        name: 'Won'
      })
    )
    doneStates.push(
      await createState(client, task.class.LostState, {
        ofAttribute: doneAtrtribute ?? ofAttribute,
        name: 'Lost'
      })
    )

    return [[state], doneStates]
  }

  const template = await client.findOne(task.class.KanbanTemplate, { _id: templateId })

  if (template === undefined) {
    throw Error(`Failed to find target kanban template: ${templateId}`)
  }

  const states: Ref<State>[] = []
  const doneStates: Ref<DoneState>[] = []

  const tmplStates = await client.findAll(
    task.class.StateTemplate,
    { attachedTo: template._id },
    { sort: { rank: SortingOrder.Ascending } }
  )

  for (const state of tmplStates) {
    states.push(
      await createState(client, task.class.State, {
        ofAttribute,
        color: state.color,
        description: state.description,
        name: state.name
      })
    )
  }

  const doneClassMap = new Map<Ref<Class<DoneStateTemplate>>, Ref<Class<DoneState>>>([
    [task.class.WonStateTemplate, task.class.WonState],
    [task.class.LostStateTemplate, task.class.LostState]
  ])
  const tmplDoneStates = await client.findAll(
    task.class.DoneStateTemplate,
    { attachedTo: template._id },
    { sort: { rank: SortingOrder.Ascending } }
  )
  for (const state of tmplDoneStates) {
    const cl = doneClassMap.get(state._class)

    if (cl === undefined) {
      continue
    }

    doneStates.push(
      await createState(client, cl, {
        ofAttribute: doneAtrtribute ?? ofAttribute,
        description: state.description,
        name: state.name
      })
    )
  }

  return [states, doneStates]
}
