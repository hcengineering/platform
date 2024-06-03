<!--
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
  import { type Ref } from '@hcengineering/core'
  import { type Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import { type Action, type AnySvelteComponent, tooltip } from '@hcengineering/ui'
  import {
    Icon,
    IconChevronDown,
    IconMoreH,
    Menu,
    getTreeCollapsed,
    setTreeCollapsed,
    showPopup
  } from '@hcengineering/ui'
  import { DocumentSpace } from '@hcengineering/controlled-documents'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<DocumentSpace>
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let title: string
  export let selected: boolean = false
  export let getMoreActions: ((originalEvent?: MouseEvent) => Promise<Action[]>) | undefined = undefined
  export let collapsed: boolean = getTreeCollapsed(_id)

  const dispatch = createEventDispatcher()

  let hovered = false
  async function onMenuClick (ev: MouseEvent): Promise<void> {
    if (getMoreActions === undefined) {
      return
    }

    hovered = true
    const actions = await getMoreActions(ev)
    showPopup(Menu, { actions, ctx: _id }, ev.target as HTMLElement, () => {
      hovered = false
    })
  }

  $: if (_id !== undefined) collapsed = getTreeCollapsed(_id)
  $: setTreeCollapsed(_id, collapsed)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="antiNav-element tree parent"
  class:selected
  class:hovered
  class:collapsed
  on:click={() => {
    collapsed = !collapsed
    dispatch('click')
  }}
>
  {#if icon}
    <div class="an-element__icon folder">
      <Icon {icon} {iconProps} size={'small'} />
    </div>
  {/if}

  <span class="an-element__label" use:tooltip={{ label: getEmbeddedLabel(title) }}>
    {title}
  </span>

  <div
    class="an-element__tool arrow hidden"
    on:click|preventDefault|stopPropagation={() => {
      collapsed = !collapsed
    }}
  >
    <IconChevronDown size={'small'} />
  </div>

  <div class="an-element__grow" />

  <slot name="extra" />

  <div class="w-6">
    <div class="an-element__tool" class:pressed={hovered} on:click|preventDefault|stopPropagation={onMenuClick}>
      <IconMoreH size={'small'} />
    </div>
  </div>
</div>

{#if !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}
