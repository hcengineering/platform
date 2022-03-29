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
  import type { Asset, IntlString } from '@anticrm/platform'
  import type { Action } from '@anticrm/ui'
  import { ActionIcon, Icon, IconMoreV, Label, Menu, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import Collapsed from '../icons/Collapsed.svelte'
  import Expanded from '../icons/Expanded.svelte'

  export let _id: string | undefined = undefined
  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let node = false
  export let collapsed = false
  export let selected = false
  export let actions: () => Promise<Action[]> = async () => []

  const dispatch = createEventDispatcher()

  let hovered = false
  async function onMenuClick (ev: MouseEvent) {
    showPopup(Menu, { actions: await actions(), ctx: _id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }
</script>

<div class="antiNav-element" class:selected class:hovered
  on:click|stopPropagation={() => {
    if (node && !icon) collapsed = !collapsed
    dispatch('click')
  }}
>
  <div class="an-element__icon" class:sub={!node}>
    {#if icon}
      <Icon {icon} size={'small'} />
    {:else if collapsed}<Collapsed size={'small'} />{:else}<Expanded size={'small'} />{/if}
  </div>
  <span class="an-element__label" class:title={node}>
    {#if label}<Label {label} />{:else}{title}{/if}
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
