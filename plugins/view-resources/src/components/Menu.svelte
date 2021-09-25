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
  import type { IntlString, Asset, Resource } from '@anticrm/platform'
  import { getResource } from '@anticrm/platform'
  import { getClient, createQuery } from '@anticrm/presentation'
  import type { Ref, Class, Doc } from '@anticrm/core' 
  import { createEventDispatcher } from 'svelte'
  import { Icon, Label, IconMoreH, IconFile } from '@anticrm/ui'
  import type { Action, ActionTarget } from '@anticrm/view'
  import { getActions } from '../utils'
  import view from '@anticrm/view'

  export let object: Doc
  
  let actions: Action[] = []

  const client = getClient()

  getActions(client, object._class).then(result => { actions = result })

  const dispatch = createEventDispatcher()

  async function invokeAction(action: Resource<(object: Doc) => Promise<void>>) {
    dispatch('close')
    const impl = await getResource(action)
    await impl(object)
  }

</script>

<div class="flex-col popup">
  {#each actions as action}
    <div class="flex-row-center menu-item" on:click={() => { invokeAction(action.action) }}>
      <div class="icon">
        <Icon icon={action.icon} size={'large'} />
      </div>
      <div class="label"><Label label={action.label} /></div>
    </div>
  {/each}
</div>

<style lang="scss">
  .popup {
    padding: .5rem;
    height: 100%;
    background-color: var(--theme-popup-bg);
    border: var(--theme-popup-border);
    border-radius: 1.25rem;
    box-shadow: var(--theme-popup-shadow);
    backdrop-filter: blur(30px);
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: .375rem 1rem .375rem .5rem;
    border-radius: .5rem;
    cursor: pointer;

    .icon {
      margin-right: .75rem;
      transform-origin: center center;
      transform: scale(.75);
      opacity: .3;
    }
    .label {
      flex-grow: 1;
      color: var(--theme-content-accent-color);
    }
    &:hover { background-color: var(--theme-button-bg-focused); }
  }
</style>
