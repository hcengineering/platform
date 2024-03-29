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
  import type { Action, AnySvelteComponent, IconSize } from '@hcengineering/ui'
  import {
    ActionIcon,
    Icon,
    IconChevronDown,
    IconMoreH,
    Label,
    Menu,
    showPopup,
    getTreeCollapsed,
    setTreeCollapsed
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<Doc> | string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let iconSize: IconSize = 'small'
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let parent: boolean = false
  export let node: boolean = false
  export let indent: boolean = false
  export let folder: boolean = false
  export let level: number = 0
  export let collapsed: boolean = getTreeCollapsed(_id)
  export let selected: boolean = false
  export let bold: boolean = false
  export let showNotify: boolean = false
  export let actions: (originalEvent?: MouseEvent) => Promise<Action[]> = async () => []

  let hovered = false
  let inlineActions: Action[] = []
  let popupMenuActions: Action[] = []

  $: actions().then((result) => {
    inlineActions = result.filter((action) => action.inline === true)
    popupMenuActions = result.filter((action) => action.inline !== true)
  })

  async function onMenuClick (ev: MouseEvent): Promise<void> {
    // Read actual popup actions on open as visibility might have been changed
    popupMenuActions = await actions().then((res) => res.filter((action) => action.inline !== true))
    showPopup(Menu, { actions: popupMenuActions, ctx: _id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }

  async function onInlineClick (ev: MouseEvent, action: Action): Promise<void> {
    action.action([], ev)
  }

  const dispatch = createEventDispatcher()
  $: if (_id) collapsed = getTreeCollapsed(_id)
  $: setTreeCollapsed(_id, collapsed)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="antiNav-element relative"
  class:selected
  class:hovered
  class:parent
  class:collapsed
  style:padding-left={`${level > 0 ? level * 1.25 + 0.125 : indent ? 2.5 : 0.75}rem`}
  on:click={() => {
    collapsed = !collapsed
    dispatch('click')
  }}
>
  {#if showNotify}
    <div class="notify" />
  {/if}
  {#if icon && !node}
    <div class="an-element__icon" class:folder>
      <Icon {icon} {iconProps} size={iconSize} />
    </div>
  {/if}
  <span class="an-element__label" class:title={node} class:bold>
    {#if label}<Label {label} />{:else}{title}{/if}
  </span>

  {#if parent}
    <div class="an-element__tool arrow hidden">
      <IconChevronDown size={'small'} />
    </div>
  {/if}

  <div class="an-element__grow" />

  {#if inlineActions.length > 0}
    {#each inlineActions as action}
      <div class="an-element__tool" on:click|preventDefault|stopPropagation={(ev) => onInlineClick(ev, action)}>
        <Icon icon={action.icon ?? ActionIcon} size={'small'} />
      </div>
    {/each}
  {/if}
  {#if popupMenuActions.length === 1 && popupMenuActions[0].icon}
    <div id={_id} class="an-element__tool">
      <ActionIcon
        label={popupMenuActions[0].label}
        icon={popupMenuActions[0].icon}
        size={'small'}
        action={async (ev) => {
          void popupMenuActions[0].action(_id, ev)
        }}
      />
    </div>
  {:else if popupMenuActions.length > 0}
    <div class="an-element__tool" class:pressed={hovered} on:click|preventDefault|stopPropagation={onMenuClick}>
      <IconMoreH size={'small'} />
    </div>
  {/if}

  {#if notifications > 0 && collapsed}
    <div class="an-element__counter">{notifications}</div>
  {/if}
</div>
{#if parent && !collapsed}
  <div class="antiNav-element__dropbox"><slot /></div>
{/if}

<style lang="scss">
  .notify {
    position: absolute;
    top: 0.5rem;
    left: 1.5rem;
    height: 0.5rem;
    width: 0.5rem;
    background-color: var(--theme-inbox-notify);
    border-radius: 50%;
  }
</style>
