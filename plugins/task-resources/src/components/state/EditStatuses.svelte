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
  import type { Class, Obj, Ref } from '@anticrm/core'
  import core from '@anticrm/core'
  import { createQuery, getClient, MessageBox } from '@anticrm/presentation'
  import type { Kanban, SpaceWithStates, State } from '@anticrm/task'
  import task from '@anticrm/task'
  import KanbanEditor from '../kanban/KanbanEditor.svelte'
  import { Icon, IconClose, Label, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import workbench from '@anticrm/workbench'

  export let _id: Ref<SpaceWithStates>
  export let spaceClass: Ref<Class<Obj>>

  let kanban: Kanban | undefined
  let spaceClassInstance: Class<SpaceWithStates> | undefined
  let spaceInstance: SpaceWithStates | undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const kanbanQ = createQuery()
  $: kanbanQ.query(task.class.Kanban, { attachedTo: _id }, result => { kanban = result[0] })

  const spaceQ = createQuery()
  $: spaceQ.query<Class<SpaceWithStates>>(core.class.Class, { _id: spaceClass }, result => { spaceClassInstance = result.shift() })

  const spaceI = createQuery()
  $: spaceI.query<SpaceWithStates>(spaceClass, { _id: _id }, result => { spaceInstance = result.shift() })

  async function deleteState ({ state }: { state: State }) {
    if (spaceInstance === undefined) {
      return
    }

    const spaceClassInstance = client.getHierarchy().getClass(spaceInstance._class)
    const spaceView = client.getHierarchy().as(spaceClassInstance, workbench.mixin.SpaceView)
    const containingClass = spaceView.view.class

    const objectsInThisState = await client.findAll(containingClass, { state: state._id })

    if (objectsInThisState.length > 0) {
      showPopup(MessageBox, {
        label: 'Can\'t delete status',
        message: `There are ${objectsInThisState.length} objects in the given state. Move or delete them first.`
      })
    } else {
      showPopup(MessageBox, {
        label: 'Delete status',
        message: 'Do you want to delete this status?'
      }, undefined, async (result) => {
        if (result && kanban !== undefined) {
          await client.updateDoc(kanban._class, kanban.space, kanban._id, { $pull: { states: state._id } })
          client.removeDoc(state._class, state.space, state._id)
        }
      })
    }
  }
</script>

<div class="overlay" on:click={() => { dispatch('close') }}/>
<div class="flex-col floatdialog-container">
  <div class="flex-between header">
    <div class="flex-grow flex-col">
      <div class="flex-row-center">
        <div class="mr-2"><Icon icon={task.icon.ManageStatuses} size={'small'} /></div>
        <span class="fs-title overflow-label">
          Manage application statuses within 
          {#if spaceClassInstance}<Label label={spaceClassInstance?.label}/>{:else}...{/if}
        </span>
      </div>
      <div class="small-text content-dark-color overflow-label">{spaceInstance?.name}</div>
    </div>
    <div class="ml-4 content-accent-color cursor-pointer" on:click={() => dispatch('close')}><IconClose size={'small'} /></div>
  </div>
  <div class="flex-grow flex-col content">
    {#if kanban !== undefined}
      <KanbanEditor {kanban} on:delete={(e) => deleteState(e.detail)} />
    {/if}
  </div>
</div>

<style lang="scss">
  .floatdialog-container {
    position: fixed;
    top: 32px;
    bottom: 1.25rem;
    right: 1rem;
    height: calc(100% - 32px - 1.25rem);
    background-color: var(--theme-bg-color);
    border-radius: 1.25rem;

    .header {
      padding: 0 2rem 0 2.5rem;
      height: 4.5rem;
      min-height: 4.5rem;
    }
    .content {
      overflow: auto;
      margin: 1rem 2.5rem 1rem 2.5rem;
    }
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    opacity: .5;
  }
</style>
