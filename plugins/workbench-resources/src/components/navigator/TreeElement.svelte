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
  import Collapsed from '../icons/Collapsed.svelte'
  import Expanded from '../icons/Expanded.svelte'

  import type { Asset, IntlString } from '@anticrm/platform'
  import type { Action } from '@anticrm/ui'
  import type { Ref, Space } from '@anticrm/core'
  import { Icon, Label, ActionIcon, Menu, showPopup, IconMoreV } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<Space> | undefined = undefined
  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let node = false
  export let collapsed = false
  export let selected = false
  export let actions: () => Promise<Action[]> = async () => []
  export let indent: 'default' | 'ml-2' | 'ml-4' | 'ml-8' = 'default'

  const dispatch = createEventDispatcher()

  let hovered = false
  async function onMenuClick(ev: MouseEvent) {
    showPopup(Menu, { actions: await actions(), ctx: _id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }
</script>

<div
  class="antiNav-element"
  class:selected
  class:hovered
  class:ml-2={indent === 'ml-2'}
  class:ml-4={indent === 'ml-4'}
  class:ml-8={indent === 'ml-8'}
  on:click|stopPropagation={() => {
    if (node && !icon) collapsed = !collapsed
    dispatch('click')
  }}
>
  <span class="an-element__label" class:title={node}>
    <div class="flex-row-center">
      {#if icon}
        <div class="an-element__icon" class:sub={!node}>
          <Icon {icon} size={'small'} />
        </div>
      {/if}
      {#if label}<Label {label} />{:else}{title}{/if}

      {#if !icon}
        <div class="ml-2" class:sub={!node}>
          {#if collapsed}
            <Collapsed size={'small'} />
          {:else}
            <Expanded size={'small'} />
          {/if}
        </div>
      {/if}
    </div>
  </span>
  {#if node === false}
    <div class="an-element__tool" on:click|stopPropagation={onMenuClick}>
      <IconMoreV size={'small'} />
    </div>
  {:else}
    {#await actions() then actionItems}
      {#if actionItems.length === 1}
        <div id={_id} class="an-element__tool">
          <ActionIcon
            label={actionItems[0].label}
            icon={actionItems[0].icon}
            size={'small'}
            action={(ev) => {
              actionItems[0].action(_id, ev)
            }}
          />
        </div>
      {:else if actionItems.length > 1}
        <div class="an-element__tool" on:click|stopPropagation={onMenuClick}>
          <IconMoreV size={'small'} />
        </div>
      {/if}
    {/await}
  {/if}
  {#if notifications > 0 && collapsed}
    <div class="an-element__counter">{notifications}</div>
  {/if}
</div>
{#if node && !icon && !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}
