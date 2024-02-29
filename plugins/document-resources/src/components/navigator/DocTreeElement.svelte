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
  import { createEventDispatcher } from 'svelte'
  import { Document } from '@hcengineering/document'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { Action, AnySvelteComponent } from '@hcengineering/ui'
  import {
    ActionIcon,
    Icon,
    IconChevronDown,
    IconMoreH,
    Label,
    Menu,
    navigate,
    showPopup,
    getTreeCollapsed,
    setTreeCollapsed
  } from '@hcengineering/ui'

  import { getDocumentLink } from '../../utils'

  export let doc: Document
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let parent: boolean = false
  export let collapsed: boolean = getTreeCollapsed(doc._id)
  export let selected: boolean = false
  export let level: number = 0
  export let actions: Action[] = []
  export let moreActions: (originalEvent?: MouseEvent) => Promise<Action[]> | undefined = async () => []

  let hovered = false
  async function onMenuClick (ev: MouseEvent): Promise<void> {
    showPopup(Menu, { actions: await moreActions(ev), ctx: doc._id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }

  function selectDocument (): void {
    const loc = getDocumentLink(doc)
    navigate(loc)
  }

  const dispatch = createEventDispatcher()
  $: collapsed = getTreeCollapsed(doc._id)
  $: setTreeCollapsed(doc._id, collapsed)
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
    selectDocument()
    if (selected) {
      collapsed = !collapsed
    }
    dispatch('click')
  }}
>
  <div
    class="an-element__tool arrow"
    class:empty={!parent}
    on:click|preventDefault|stopPropagation={() => {
      if (parent) collapsed = !collapsed
    }}
  >
    {#if parent}<IconChevronDown size={'small'} filled />{/if}
  </div>

  {#if icon}
    <div class="an-element__icon" class:folder={level === 0}>
      <Icon {icon} {iconProps} size={'small'} />
    </div>
  {/if}
  <span class="an-element__label">
    {#if label}<Label {label} />{:else}{title}{/if}
  </span>
  <div class="an-element__grow" />

  {#each actions as action}
    {#if action.icon}
      <div class="an-element__tool">
        <ActionIcon label={action.label} icon={action.icon} size={'small'} action={(evt) => action.action({}, evt)} />
      </div>
    {/if}
  {/each}
  <div class="an-element__tool" class:pressed={hovered} on:click|preventDefault|stopPropagation={onMenuClick}>
    <IconMoreH size={'small'} />
  </div>
</div>

{#if parent && !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}
