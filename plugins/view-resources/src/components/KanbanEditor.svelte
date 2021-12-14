<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import type { Ref, State, Doc, DoneState } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { Kanban } from '@anticrm/view'

  import core from '@anticrm/core'
  import StatesEditor from './StatesEditor.svelte'

  export let kanban: Kanban

  let states: State[] = []

  let doneStates: DoneState[] = []
  let wonStates: DoneState[] = []
  let lostStates: DoneState[] = []
  $: wonStates = doneStates.filter((x) => x._class === core.class.WonState)
  $: lostStates = doneStates.filter((x) => x._class === core.class.LostState)

  const client = getClient()

  function sort <T extends Doc>(order: Ref<T>[], items: T[]): T[] {
    if (items.length === 0) {
      return []
    }

    const itemMap = new Map(items.map(x => [x._id, x]))
    const x = order
      .map(id => itemMap.get(id))
      .filter((x): x is T => x !== undefined)

    return x
  }

  const statesQ = createQuery()
  $: statesQ.query(core.class.State, { _id: { $in: kanban.states ?? [] } }, result => { states = sort(kanban.states, result) })

  const doneStatesQ = createQuery()
  $: doneStatesQ.query(core.class.DoneState, { _id: { $in: kanban.doneStates }}, (result) => { doneStates = sort(kanban.doneStates, result) })

  async function onMove ({ detail: { stateID, position } }: { detail: { stateID: Ref<State>, position: number } }) {
    client.updateDoc(kanban._class, kanban.space, kanban._id, {
      $move: {
        states: {
          $value: stateID,
          $position: position
        }
      }
    })
  }

  async function onAdd () {
    const state = await client.createDoc(core.class.State, kanban.space, {
      title: 'New State',
      color: '#7C6FCD'
    })
    await client.updateDoc(kanban._class, kanban.space, kanban._id, {
      $push: {
        states: state
      }
    })
  }
</script>

<StatesEditor {states} {wonStates} {lostStates} on:add={onAdd} on:delete on:move={onMove}/>
