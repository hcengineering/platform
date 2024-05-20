<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import type { Doc, Ref } from '@hcengineering/core'
  import { type Asset, type IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import { type Action, type AnySvelteComponent, tooltip } from '@hcengineering/ui'
  import {
    Icon,
    IconChevronDown,
    IconMoreH,
    Label,
    Menu,
    getTreeCollapsed,
    setTreeCollapsed,
    showPopup
  } from '@hcengineering/ui'

  export let _id: Ref<Doc>
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let parent: boolean = false
  export let collapsed: boolean = getTreeCollapsed(_id)
  export let selected: boolean = false
  export let level: number = 0
  export let actions: (originalEvent?: MouseEvent) => Promise<Action[]> = async () => []

  let hovered = false
  async function onMenuClick (ev: MouseEvent): Promise<void> {
    showPopup(Menu, { actions: await actions(ev), ctx: _id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }

  const dispatch = createEventDispatcher()
  $: collapsed = getTreeCollapsed(_id)
  $: setTreeCollapsed(_id, collapsed)
  $: folder = level === 0
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="antiNav-element tree"
  class:selected
  class:hovered
  class:parent
  class:collapsed
  style:padding-left={`${level > 0 ? level * 1.25 + 0.125 : 0.75}rem`}
  on:click={() => {
    if (selected) {
      collapsed = !collapsed
    }
    dispatch('click')
  }}
>
  {#if !folder}
    <div
      class="an-element__tool arrow"
      class:empty={!parent}
      on:click|preventDefault|stopPropagation={() => {
        if (parent) collapsed = !collapsed
      }}
    >
      {#if parent}<IconChevronDown size={'small'} filled />{/if}
    </div>
  {/if}

  {#if icon}
    <div class="an-element__icon" class:folder>
      <Icon {icon} {iconProps} size={'small'} />
    </div>
  {/if}
  <span class="an-element__label" use:tooltip={{ label: label ?? getEmbeddedLabel(title ?? '') }}>
    {#if label}<Label {label} />{:else}{title}{/if}
  </span>
  <div class="an-element__grow" />

  <div class="an-element__tool" class:pressed={hovered} on:click|preventDefault|stopPropagation={onMenuClick}>
    <IconMoreH size={'small'} />
  </div>
</div>

{#if parent && !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}
