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
  import type { Attribute, Doc, DocumentQuery, IdMap, Ref, Status } from '@hcengineering/core'
  import { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import type { DoneState, LostState, SpaceWithStates, State, WonState } from '@hcengineering/task'
  import { Icon, Label, Panel, Scroller, showPopup } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'
  import StatesEditor from './StatesEditor.svelte'

  export let _id: Ref<SpaceWithStates>
  export let ofAttribute: Ref<Attribute<Status>>
  export let doneOfAttribute: Ref<Attribute<Status>>

  let spaceInstance: SpaceWithStates | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  const spaceI = createQuery()
  $: spaceI.query<SpaceWithStates>(task.class.SpaceWithStates, { _id }, (result) => {
    spaceInstance = result[0]
  })

  $: spaceClass = spaceInstance ? hierarchy.getClass(spaceInstance._class) : undefined

  $: [states, doneStates] = getStates(spaceInstance, $statusStore)

  $: wonStates = doneStates.filter((x) => x._class === task.class.WonState) as WonState[]
  $: lostStates = doneStates.filter((x) => x._class === task.class.LostState) as LostState[]

  function getStates (space: SpaceWithStates | undefined, statusStore: IdMap<Status>): [Status[], DoneState[]] {
    if (space === undefined) {
      return [[], []]
    }

    const states = space.states.map((x) => statusStore.get(x) as Status).filter((p) => p !== undefined)
    const doneStates = space.doneStates
      ? space.doneStates.map((x) => statusStore.get(x) as DoneState).filter((p) => p !== undefined)
      : []

    return [states, doneStates]
  }

  async function deleteState ({ state }: { state: State | DoneState }) {
    if (spaceInstance === undefined) {
      return
    }

    let query: DocumentQuery<Doc>
    if (hierarchy.isDerived(state._class, task.class.DoneState)) {
      query = { doneState: state._id, space: _id }
    } else {
      query = { status: state._id, space: _id }
    }

    const objectsInThisState = await client.findAll(task.class.Task, query)

    if (objectsInThisState.length > 0) {
      showPopup(MessageBox, {
        label: task.string.CantStatusDelete,
        message: task.string.CantStatusDeleteError,
        canSubmit: false
      })
    } else {
      showPopup(
        MessageBox,
        {
          label: task.string.StatusDelete,
          message: task.string.StatusDeleteConfirm
        },
        undefined,
        async (result) => {
          if (result !== undefined) {
            if (hierarchy.isDerived(state._class, task.class.DoneState)) {
              const index = doneStates.findIndex((x) => x._id === state._id)
              if (index === -1) {
                return
              }
              states.splice(index, 1)
              if (spaceInstance) {
                await client.update(spaceInstance, { doneStates: states.map((x) => x._id) })
              }
            } else {
              const index = states.findIndex((x) => x._id === state._id)
              if (index === -1) {
                return
              }
              states.splice(index, 1)
              if (spaceInstance) {
                await client.update(spaceInstance, { states: states.map((x) => x._id) })
              }
            }
          }
        }
      )
    }
  }

  async function onMove (stateID: Ref<State>, position: number) {
    const index = states.findIndex((x) => x._id === stateID)
    if (index === -1) {
      return
    }
    const elem = states.splice(index, 1)
    states = [...states.slice(0, position), elem[0], ...states.slice(position)]
    if (spaceInstance) {
      await client.update(spaceInstance, { states: states.map((x) => x._id) })
    }
  }
</script>

<Panel
  isHeader={false}
  isAside={false}
  isFullSize
  on:fullsize
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      <div class="wrapped-icon">
        <Icon icon={task.icon.ManageTemplates} size={'small'} />
      </div>
      <div class="title-wrapper">
        <span class="wrapped-title">
          <Label label={task.string.ManageStatusesWithin} />
          {#if spaceClass}<Label label={spaceClass?.label} />{:else}...{/if}
        </span>
        {#if spaceInstance?.name}<span class="wrapped-subtitle">{spaceInstance?.name}</span>{/if}
      </div>
    </div>
  </svelte:fragment>

  <Scroller>
    <div class="popupPanel-body__main-content py-10 clear-mins">
      {#if spaceInstance}
        <StatesEditor
          space={_id}
          {ofAttribute}
          {doneOfAttribute}
          {states}
          {wonStates}
          {lostStates}
          on:delete={(e) => deleteState(e.detail)}
          on:move={(e) => onMove(e.detail.stateID, e.detail.position)}
        />
      {/if}
    </div>
  </Scroller>
</Panel>
