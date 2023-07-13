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
  import type { Class, Doc, DocumentQuery, Obj, Ref } from '@hcengineering/core'
  import core from '@hcengineering/core'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import type { DoneState, Kanban, SpaceWithStates, State } from '@hcengineering/task'
  import task from '../../plugin'
  import KanbanEditor from '../kanban/KanbanEditor.svelte'
  import { Icon, Label, showPopup, Panel, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import workbench from '@hcengineering/workbench'

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
  $: spaceI.query<SpaceWithStates>(spaceClass, { _id }, (result) => {
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
      query = { status: state._id }
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
          {#if spaceClassInstance}<Label label={spaceClassInstance?.label} />{:else}...{/if}
        </span>
        {#if spaceInstance?.name}<span class="wrapped-subtitle">{spaceInstance?.name}</span>{/if}
      </div>
    </div>
  </svelte:fragment>

  <Scroller>
    <div class="popupPanel-body__main-content py-10 clear-mins">
      {#if kanban !== undefined}
        <KanbanEditor {kanban} on:delete={(e) => deleteState(e.detail)} />
      {/if}
    </div>
  </Scroller>
</Panel>
