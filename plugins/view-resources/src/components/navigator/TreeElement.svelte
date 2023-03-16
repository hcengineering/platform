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
  import type { Ref, Space } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { Action } from '@hcengineering/ui'
  import { ActionIcon, Icon, IconMoreV, Label, Menu, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<Space> | undefined = undefined
  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let node = false
  export let parent = false
  export let collapsed = false
  export let selected = false
  export let bordered = false
  export let bold = false
  export let actions: () => Promise<Action[]> = async () => []
  export let indent: 'default' | 'ml-2' | 'ml-4' | 'ml-8' = 'default'

  let hovered = false
  async function onMenuClick (ev: MouseEvent) {
    showPopup(Menu, { actions: await actions(), ctx: _id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="antiNav-element"
  class:selected
  class:bordered
  class:hovered
  class:ml-2={indent === 'ml-2'}
  class:ml-4={indent === 'ml-4'}
  class:ml-8={indent === 'ml-8'}
  class:parent
  class:collapsed
  class:child={!node}
  on:click={() => {
    collapsed = !collapsed
    dispatch('click')
  }}
>
  <span class="an-element__label" class:bold class:title={node}>
    <div class="flex-row-center">
      {#if icon && !parent}
        <div class="an-element__icon">
          <Icon {icon} size={'small'} />
        </div>
      {/if}
      <span class="overflow-label">
        {#if label}<Label {label} />{:else}{title}{/if}
      </span>

      {#if node}
        <div class="an-element__icon-arrow {parent ? 'small' : 'medium'}" class:collapsed>
          <svg fill="var(--content-color)" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0L6,3L0,6Z" />
          </svg>
        </div>
      {/if}
    </div>
  </span>
  {#if node === false}
    <div class="an-element__tool" on:click|preventDefault|stopPropagation={onMenuClick}>
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
        <div class="an-element__tool" on:click|preventDefault|stopPropagation={onMenuClick}>
          <IconMoreV size={'small'} />
        </div>
      {/if}
    {/await}
  {/if}
  {#if notifications > 0 && collapsed}
    <div class="an-element__counter">{notifications}</div>
  {/if}
</div>
{#if node && !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}
