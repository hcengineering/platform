<!--
// Copyright © 2020 Anticrm Platform Contributors.
// Copyright © 2023 Hardcore Engineering Inc.
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
  import type { Doc, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { Action, AnySvelteComponent } from '@hcengineering/ui'
  import { ActionIcon, Icon, IconChevronDown, IconMoreH, Label, Menu, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<Doc> | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let node = false
  export let parent = false
  export let collapsed = false
  export let selected = false
  export let bold = false
  export let shortDropbox = false
  export let actions: (originalEvent?: MouseEvent) => Promise<Action[]> = async () => []
  export let indent: 'default' | 'ml-2' | 'ml-4' | 'ml-8' = 'default'

  let hovered = false
  async function onMenuClick (ev: MouseEvent) {
    showPopup(Menu, { actions: await actions(ev), ctx: _id }, ev.target as HTMLElement, () => {
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
  class:hovered
  class:parent
  class:collapsed
  class:child={!node}
  on:click={() => {
    collapsed = !collapsed
    dispatch('click')
  }}
>
  <span class="an-element__label" class:bold class:title={node}>
    {#if icon && !parent}
      <div
        class="an-element__icon"
        class:indent-2={indent === 'ml-2'}
        class:indent-4={indent === 'ml-4'}
        class:indent-8={indent === 'ml-8'}
      >
        <Icon {icon} {iconProps} size={'small'} />
      </div>
    {/if}
    <span class="overflow-label">
      {#if label}<Label {label} />{:else}{title}{/if}
    </span>

    {#if node}
      <div class="an-element__icon-arrow" class:collapsed>
        <IconChevronDown size={'small'} />
      </div>
    {/if}
  </span>
  {#if node === false}
    <div class="an-element__tool" on:click|preventDefault|stopPropagation={onMenuClick}>
      <IconMoreH size={'small'} />
    </div>
  {:else}
    {#await actions() then actionItems}
      {#if actionItems.length === 1 && actionItems[0].icon}
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
          <IconMoreH size={'small'} />
        </div>
      {/if}
    {/await}
  {/if}
  {#if notifications > 0 && collapsed}
    <div class="an-element__counter">{notifications}</div>
  {/if}
</div>
{#if node && !collapsed}
  <div class="antiNav-element__dropbox" class:short={shortDropbox}><slot /></div>
{/if}
