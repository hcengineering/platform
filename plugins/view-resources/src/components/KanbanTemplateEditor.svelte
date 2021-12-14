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
  import { createEventDispatcher } from 'svelte'
  import { Ref, State, Space, Doc, generateId } from '@anticrm/core'
  import core from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { DoneStateTemplate, KanbanTemplate, StateTemplate } from '@anticrm/view'
  import view from '@anticrm/view'

  import StatesEditor from './StatesEditor.svelte'

  export let kanban: KanbanTemplate

  let states: StateTemplate[] = []
  let doneStates: DoneStateTemplate[] = []
  let wonStates: DoneStateTemplate[] = []
  let lostStates: DoneStateTemplate[] = []
  $: wonStates = doneStates.filter((x) => x._class === view.class.WonStateTemplate)
  $: lostStates = doneStates.filter((x) => x._class === view.class.LostStateTemplate)

  const dispatch = createEventDispatcher()
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
  $: statesQ.query(view.class.StateTemplate, { attachedTo: kanban._id }, result => { states = sort(kanban.states, result) })

  const doneStatesQ = createQuery()
  $: doneStatesQ.query(view.class.DoneStateTemplate, { attachedTo: kanban._id }, (result) => { doneStates = sort(kanban.doneStates, result) })

  let space: Space | undefined
  const spaceQ = createQuery()
  $: spaceQ.query(core.class.Space, { _id: kanban.space }, (result) => { space = result[0] })

  async function onMove ({ detail: { stateID, position } }: { detail: { stateID: Ref<StateTemplate>, position: number } }) {
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
    const stateID = generateId<StateTemplate>()
    await client.addCollection(
      view.class.StateTemplate,
      kanban.space,
      kanban._id,
      kanban._class,
      'statesC',
      {
        title: 'New State',
        color: '#7C6FCD'
      },
      stateID
    )

    await client.updateDoc(kanban._class, kanban.space, kanban._id, {
      $push: {
        states: stateID
      }
    })
  }

  function onDelete ({ detail: { state } }: { detail: { state: State }}) {
    if (space === undefined) {
      return
    }

    dispatch('delete', { state })
  }
</script>

<StatesEditor {states} {wonStates} {lostStates} on:add={onAdd} on:delete={onDelete} on:move={onMove}/>
