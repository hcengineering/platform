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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type { DoneState, Kanban, State } from '@hcengineering/task'
  import task, { calcRank } from '@hcengineering/task'
  import StatesEditor from '../state/StatesEditor.svelte'

  export let kanban: Kanban

  let states: State[] = []

  let doneStates: DoneState[] = []
  let wonStates: DoneState[] = []
  let lostStates: DoneState[] = []
  $: wonStates = doneStates.filter((x) => x._class === task.class.WonState)
  $: lostStates = doneStates.filter((x) => x._class === task.class.LostState)

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const statesQ = createQuery()
  $: statesQ.query(
    task.class.State,
    { space: kanban.space },
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
    task.class.DoneState,
    { space: kanban.space },
    (result) => {
      doneStates = result
    },
    {
      sort: {
        rank: SortingOrder.Ascending
      }
    }
  )

  async function onMove ({ detail: { stateID, position } }: { detail: { stateID: Ref<State>; position: number } }) {
    const [prev, next] = [states[position - 1], states[position + 1]]
    const state = states.find((x) => x._id === stateID)

    if (state === undefined) {
      return
    }

    await client.updateDoc(state._class, state.space, state._id, {
      rank: calcRank(prev, next)
    })
  }

</script>

<StatesEditor
  {states}
  {wonStates}
  {lostStates}
  space={kanban}
  on:delete
  on:move={onMove}
/>
