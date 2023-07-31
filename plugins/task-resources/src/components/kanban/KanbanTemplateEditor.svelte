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
  import { Ref, Space, SortingOrder, Class } from '@hcengineering/core'
  import core from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type {
    State,
    DoneStateTemplate,
    KanbanTemplate,
    StateTemplate,
    DoneState,
    KanbanTemplateSpace
  } from '@hcengineering/task'
  import task, { calcRank } from '@hcengineering/task'

  import StatesEditor from '../state/StatesEditor.svelte'

  export let kanban: KanbanTemplate
  export let folder: KanbanTemplateSpace

  let states: StateTemplate[] = []
  let doneStates: DoneStateTemplate[] = []
  let wonStates: DoneStateTemplate[] = []
  let lostStates: DoneStateTemplate[] = []
  $: wonStates = doneStates.filter((x) => x._class === task.class.WonStateTemplate)
  $: lostStates = doneStates.filter((x) => x._class === task.class.LostStateTemplate)

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const statesQ = createQuery()
  $: statesQ.query(
    task.class.StateTemplate,
    { attachedTo: kanban._id },
    (result) => {
      states = result
    },
    {
      sort: {
        rank: SortingOrder.Ascending
      }
    }
  )

  const doneStatesQ = createQuery()
  $: doneStatesQ.query(
    task.class.DoneStateTemplate,
    { attachedTo: kanban._id },
    (result) => {
      doneStates = result
    },
    {
      sort: {
        rank: SortingOrder.Ascending
      }
    }
  )

  let space: Space | undefined
  const spaceQ = createQuery()
  $: spaceQ.query(core.class.Space, { _id: kanban.space }, (result) => {
    space = result[0]
  })

  async function onMove ({
    detail: { stateID, position }
  }: {
    detail: { stateID: Ref<StateTemplate>; position: number }
  }) {
    const [prev, next] = [states[position - 1], states[position + 1]]
    const state = states.find((x) => x._id === stateID)

    if (state === undefined) {
      return
    }

    await client.updateDoc(state._class, state.space, state._id, {
      rank: calcRank(prev, next)
    })
  }

  async function onAdd (result: { _class: Ref<Class<State | DoneState>>; name: string }) {
    const lastOne = await client.findOne(
      task.class.StateTemplate,
      { attachedTo: kanban._id },
      { sort: { rank: SortingOrder.Descending } }
    )

    if (hierarchy.isDerived(result._class, task.class.DoneState)) {
      const targetClass =
        result._class === task.class.WonState ? task.class.WonStateTemplate : task.class.LostStateTemplate
      await client.createDoc(targetClass, kanban.space, {
        ofAttribute: task.attribute.DoneState,
        name: result.name,
        rank: calcRank(lastOne, undefined),
        attachedTo: kanban._id
      })
    } else {
      await client.createDoc(task.class.StateTemplate, kanban.space, {
        name: result.name,
        ofAttribute: task.attribute.DoneState,
        color: 9,
        rank: calcRank(lastOne, undefined),
        attachedTo: kanban._id
      })
    }
  }

  function onDelete ({ detail: { state } }: { detail: { state: State | DoneState } }) {
    if (space === undefined) {
      return
    }

    dispatch('delete', { state })
  }
</script>

<StatesEditor
  template={kanban}
  space={folder}
  {states}
  {wonStates}
  {lostStates}
  on:add={(e) => {
    onAdd(e.detail)
  }}
  on:delete={onDelete}
  on:move={onMove}
/>
