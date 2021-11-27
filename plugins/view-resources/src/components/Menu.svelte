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
  import type { Doc } from '@anticrm/core'
  import type { Resource } from '@anticrm/platform'
  import { getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Icon, Label } from '@anticrm/ui'
  import type { Action } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { getActions } from '../utils'

  export let object: Doc

  let actions: Action[] = []

  const client = getClient()

  getActions(client, object._class).then((result) => {
    actions = result
  })

  const dispatch = createEventDispatcher()

  async function invokeAction (action: Resource<(object: Doc) => Promise<void>>) {
    dispatch('close')
    const impl = await getResource(action)
    await impl(object)
  }
</script>

<div class="flex-col popup">
  {#each actions as action}
    <div
      class="flex-row-center menu-item"
      on:click={() => {
        invokeAction(action.action)
      }}
    >
      <div class="icon">
        <Icon icon={action.icon} size={'large'} />
      </div>
      <div class="label"><Label label={action.label} /></div>
    </div>
  {/each}
</div>

<style lang="scss">
  .popup {
    padding: 0.5rem;
    height: 100%;
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.75rem;
    box-shadow: 0 0.75rem 1.25rem rgba(0, 0, 0, 0.2);
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: 0.375rem 1rem 0.375rem 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;

    .icon {
      margin-right: 0.75rem;
      transform-origin: center center;
      transform: scale(0.75);
      opacity: 0.3;
    }
    .label {
      flex-grow: 1;
      color: var(--theme-content-accent-color);
    }
    &:hover {
      background-color: var(--theme-button-bg-hovered);
    }
  }
</style>
