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
  import { type Doc, type Ref } from '@hcengineering/core'
  import { type Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import type { Action, AnySvelteComponent } from '@hcengineering/ui'
  import { Icon, IconChevronDown, IconMoreH, Menu, showPopup, tooltip } from '@hcengineering/ui'

  import { getPrefixedTreeCollapsed, setPrefixedTreeCollapsed } from '../../utils'

  export let docId: Ref<Doc>
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let title: string
  export let parent: boolean = false
  export let selected: boolean = false
  export let folder: boolean = false
  export let level: number = 0
  export let getMoreActions: ((originalEvent?: MouseEvent) => Promise<Action[]>) | undefined = undefined
  export let collapsedPrefix: string = ''
  export let collapsed: boolean = getPrefixedTreeCollapsed(docId, collapsedPrefix)

  let hovered = false
  async function onMenuClick (ev: MouseEvent): Promise<void> {
    if (getMoreActions === undefined) {
      return
    }

    showPopup(Menu, { actions: await getMoreActions(ev), ctx: docId }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }

  $: if (docId !== undefined) collapsed = getPrefixedTreeCollapsed(docId, collapsedPrefix)
  $: setPrefixedTreeCollapsed(docId, collapsedPrefix, collapsed)
  $: hasLeftCollapser = parent && !folder
  $: hasActions = getMoreActions !== undefined
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
  on:click
>
  <div
    class="an-element__tool arrow"
    class:empty={!hasLeftCollapser}
    on:click|preventDefault|stopPropagation={() => {
      if (hasLeftCollapser) collapsed = !collapsed
    }}
  >
    {#if hasLeftCollapser}<IconChevronDown size={'small'} filled />{/if}
  </div>

  {#if icon}
    <div class="an-element__icon" class:folder={level === 0}>
      <Icon {icon} {iconProps} size={'small'} />
    </div>
  {/if}
  <span class="an-element__label" use:tooltip={{ label: getEmbeddedLabel(title) }}>
    {title}
  </span>
  {#if parent && folder}
    <div
      class="an-element__tool arrow hidden"
      on:click|preventDefault|stopPropagation={() => {
        if (parent) collapsed = !collapsed
      }}
    >
      <IconChevronDown size={'small'} />
    </div>
  {/if}
  <div class="an-element__grow" />

  {#if hasActions}
    <div class="an-element__tool" class:pressed={hovered} on:click|preventDefault|stopPropagation={onMenuClick}>
      <IconMoreH size={'small'} />
    </div>
  {/if}
</div>

{#if parent && !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}
