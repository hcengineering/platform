<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  // import type { IntlString, Asset, Resource } from '@anticrm/platform'
  import type { Ref, State, Class, Obj } from '@anticrm/core'
  import { createEventDispatcher } from 'svelte'
  import { Label, showPopup } from '@anticrm/ui'
  import { getClient, MessageBox } from '@anticrm/presentation'
  import type { Kanban } from '@anticrm/view'
  import Delete from './icons/Delete.svelte'

  import workbench from '@anticrm/workbench'
  import view from '@anticrm/view'

  export let kanban: Kanban
  export let state: State
  export let spaceClass: Ref<Class<Obj>>

  const dispatch = createEventDispatcher()

  const client = getClient()

  async function deleteState () {
    const spaceClassInstance = client.getHierarchy().getClass(spaceClass)
    const spaceView = client.getHierarchy().as(spaceClassInstance, workbench.mixin.SpaceView)
    const containingClass = spaceView.view.class

    const objectsInThisState = await client.findAll(containingClass, { state: state._id })

    if (objectsInThisState.length > 0) {
      showPopup(MessageBox, {
        label: "Can't delete status",
        message: `There are ${objectsInThisState.length} objects in the given state. Move or delete them first.`
      })
    } else {
      showPopup(
        MessageBox,
        {
          label: 'Delete status',
          message: 'Do you want to delete this status?'
        },
        undefined,
        async (result) => {
          if (result) {
            await client.updateDoc(view.class.Kanban, kanban.space, kanban._id, { $pull: { states: state._id } })
            client.removeDoc(state._class, state.space, state._id)
          }
        }
      )
    }
  }
</script>

<div class="flex-col popup">
  <div
    class="flex-row-center red-color menu-item"
    on:click={() => {
      dispatch('close')
      deleteState()
    }}
  >
    <div class="icon">
      <Delete size={'medium'} />
    </div>
    <div class="flex-grow"><Label label={'Delete'} /></div>
  </div>
</div>

<style lang="scss">
  .popup {
    padding: 0.5rem;
    min-width: 12rem;
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.75rem;
    box-shadow: 0 0.75rem 1.25rem rgba(0, 0, 0, 0.2);
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;

    .icon {
      margin-right: 0.75rem;
      transform-origin: center center;
      transform: scale(0.75);
    }
    &:hover {
      background-color: var(--theme-button-bg-hovered);
    }
  }
</style>
