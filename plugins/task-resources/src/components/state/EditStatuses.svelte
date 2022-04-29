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
  import type { Class, Doc, DocumentQuery, Obj, Ref } from '@anticrm/core'
  import core from '@anticrm/core'
  import { createQuery, getClient, MessageBox } from '@anticrm/presentation'
  import type { DoneState, Kanban, SpaceWithStates, State } from '@anticrm/task'
  import task from '../../plugin'
  import KanbanEditor from '../kanban/KanbanEditor.svelte'
  import { Icon, IconClose, Label, showPopup, ActionIcon, ScrollBox } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import workbench from '@anticrm/workbench'

  export let _id: Ref<SpaceWithStates>
  export let spaceClass: Ref<Class<Obj>>

  let kanban: Kanban | undefined
  let spaceClassInstance: Class<SpaceWithStates> | undefined
  let spaceInstance: SpaceWithStates | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  const kanbanQ = createQuery()
  $: kanbanQ.query(task.class.Kanban, { attachedTo: _id }, (result) => {
    kanban = result[0]
  })

  const spaceQ = createQuery()
  $: spaceQ.query<Class<SpaceWithStates>>(core.class.Class, { _id: spaceClass }, (result) => {
    spaceClassInstance = result.shift()
  })

  const spaceI = createQuery()
  $: spaceI.query<SpaceWithStates>(spaceClass, { _id: _id }, (result) => {
    spaceInstance = result.shift()
  })

  async function deleteState ({ state }: { state: State | DoneState }) {
    if (spaceInstance === undefined) {
      return
    }

    const spaceClassInstance = client.getHierarchy().getClass(spaceInstance._class)
    const spaceView = client.getHierarchy().as(spaceClassInstance, workbench.mixin.SpaceView)
    const containingClass = spaceView.view.class

    let query: DocumentQuery<Doc>
    if (hierarchy.isDerived(state._class, task.class.DoneState)) {
      query = { doneState: state._id }
    } else {
      query = { state: state._id }
    }

    const objectsInThisState = await client.findAll(containingClass, query)

    if (objectsInThisState.length > 0) {
      showPopup(MessageBox, {
        label: task.string.CantStatusDelete,
        message: task.string.CantStatusDeleteError
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
          if (result && kanban !== undefined) {
            client.removeDoc(state._class, state.space, state._id)
          }
        }
      )
    }
  }
</script>

<div
  class="antiOverlay"
  on:click={() => {
    dispatch('close')
  }}
/>
<div class="antiDialogs antiComponent">
  <div class="ac-header short mirror divide">
    <div class="ac-header__wrap-description">
      <div class="ac-header__wrap-title">
        <div class="ac-header__icon"><Icon icon={task.icon.ManageStatuses} size={'small'} /></div>
        <span class="ac-header__title">
          <Label label={task.string.ManageStatusesWithin} />
          {#if spaceClassInstance}<Label label={spaceClassInstance?.label} />{:else}...{/if}
        </span>
      </div>
      {#if spaceInstance?.name}<span class="ac-header__description">{spaceInstance?.name}</span>{/if}
    </div>
    <div class="tool">
      <ActionIcon
        icon={IconClose}
        size={'small'}
        action={() => {
          dispatch('close')
        }}
      />
    </div>
  </div>
  <div class="p-10 flex-grow">
    <ScrollBox vertical stretch>
      {#if kanban !== undefined}
        <KanbanEditor {kanban} on:delete={(e) => deleteState(e.detail)} />
      {/if}
    </ScrollBox>
  </div>
</div>
