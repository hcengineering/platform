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

  import type { Ref, SpaceWithStates, State, Class, Obj, Space } from '@anticrm/core'
  import { Label, showPopup } from '@anticrm/ui'
  import { createQuery, getClient, MessageBox } from '@anticrm/presentation'
  import type { Kanban } from '@anticrm/view'
  import { KanbanEditor } from '@anticrm/view-resources'
  import Close from './icons/Close.svelte'
  import Status from './icons/Status.svelte'
  import workbench from '../plugin'

  import core from '@anticrm/core'
  import view from '@anticrm/view'

  export let _id: Ref<SpaceWithStates>
  export let spaceClass: Ref<Class<Obj>>

  let kanban: Kanban | undefined
  let spaceClassInstance: Class<SpaceWithStates> | undefined
  let spaceInstance: SpaceWithStates | undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const kanbanQ = createQuery()
  $: kanbanQ.query(view.class.Kanban, { attachedTo: _id }, result => { kanban = result[0] })

  const spaceQ = createQuery()
  $: spaceQ.query<Class<SpaceWithStates>>(core.class.Class, { _id: spaceClass }, result => { spaceClassInstance = result.shift() })

  const spaceI = createQuery()
  $: spaceI.query<SpaceWithStates>(spaceClass, { _id: _id }, result => { spaceInstance = result.shift() })

  async function deleteState({ state }: { state: State }) {
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

<div class="flex-col floatdialog-container">
  <div class="flex-between header">
    <div class="flex-grow flex-col">
      <div class="flex-row-center">
        <div class="icon"><Status size={'small'} /></div>
        <span class="overflow-label title">Manage application statuses within <Label label={spaceClassInstance?.label}/></span>
      </div>
      <div class="overflow-label subtitle">{spaceInstance?.name}</div>
    </div>
    <div class="tool" on:click={() => dispatch('close')}><Close size={'small'} /></div>
  </div>
  <div class="flex-grow flex-col content">
    {#if kanban !== undefined}
      <KanbanEditor {kanban} on:delete={(e) => deleteState(e.detail)} />
    {/if}
  </div>
</div>

<style lang="scss">
  .floatdialog-container {
    margin: 2rem 1rem 1.25rem 0;
    height: calc(100% - 3.25rem);
    background: var(--theme-dialog-bg-spec);
    border-radius: 1.25rem;
    box-shadow: var(--theme-dialog-shadow);
    backdrop-filter: blur(15px);

    .header {
      padding: 0 2rem 0 2.5rem;
      height: 4.5rem;
      min-height: 4.5rem;

      .icon {
        margin-right: .5rem;
        opacity: .6;
      }
      .title {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }
      .subtitle {
        font-size: .75rem;
        color: var(--theme-content-dark-color);
      }
      .tool {
        margin-left: 2.5rem;
        cursor: pointer;
      }
    }
    .content {
      overflow: auto;
      margin: 1rem 2.5rem 1rem 2.5rem;
    }
  }
</style>
