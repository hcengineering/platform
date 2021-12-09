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

  import core from '@anticrm/core'
  import { getClient, MessageBox } from '@anticrm/presentation';
  import { Label, IconDelete as Delete, showPopup } from '@anticrm/ui'
  import type { KanbanTemplate } from '@anticrm/view'
  import view from '@anticrm/view'

  export let template: KanbanTemplate
  
  const dispatch = createEventDispatcher()
  const client = getClient()

  function onDelete () {
    showPopup(MessageBox, {
        label: 'Delete template',
        message: `Do you want to delete the '${template.title}'?`
      }, undefined, async (result) => {
        if (result) {
          console.log(template.states)
          await Promise.all([
            client.removeDoc(template._class, template.space, template._id),
            ...template.states.map(async (state) => await client.removeDoc(core.class.State, template.space, state))
          ])
        }
      })
  }
</script>

<div class="flex-col popup">
  <div class="flex-row-center red-color menu-item" on:click={() => { dispatch('close'); onDelete() }}>
    <div class="icon">
      <Delete size={'medium'} />
    </div>
    <div class="flex-grow"><Label label={view.string.Delete} /></div>
  </div>
</div>

<style lang="scss">
  .popup {
    padding: .5rem;
    min-width: 12rem;
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0 .75rem 1.25rem rgba(0, 0, 0, .2);
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: .5rem;
    border-radius: .5rem;
    cursor: pointer;

    .icon {
      margin-right: .75rem;
      transform-origin: center center;
      transform: scale(.75);
    }
    &:hover { background-color: var(--theme-button-bg-hovered); }
  }
</style>
