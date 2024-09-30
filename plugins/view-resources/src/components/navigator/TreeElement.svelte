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
    IconMoreH,
    Menu,
    showPopup,
    getTreeCollapsed,
    NavItem,
    NavGroup,
    ButtonIcon
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let _id: Ref<Doc> | string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let folderIcon: boolean = false
  export let iconProps: Record<string, any> | undefined = undefined
  export let iconSize: IconSize = 'small'
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let parent: boolean = false
  export let type: 'default' | 'nested' | 'nested-selectable' = 'default'
  export let indent: boolean = false
  export let isFold: boolean = false
  export let empty: boolean = false
  export let visible: boolean = false
  export let level: number = 0
  export let collapsedPrefix: string = ''
  export let collapsed: boolean = getTreeCollapsed(_id, collapsedPrefix)
  export let highlighted: boolean = false
  export let selected: boolean = false
  export let bold: boolean = false
  export let shouldTooltip: boolean = false
  export let showMenu: boolean = false
  export let noDivider: boolean = false
  export let showNotify: boolean = false
  export let forciblyСollapsed: boolean = false
  export let actions: (originalEvent?: MouseEvent) => Promise<Action[]> = async () => []

  let pressed: boolean = false
  let inlineActions: Action[] = []
  let popupMenuActions: Action[] = []

  $: if (actions !== undefined) {
    actions().then((result) => {
      inlineActions = result.filter((action) => action.inline === true)
      popupMenuActions = result.filter((action) => action.inline !== true)
    })
  }

  async function onMenuClick (ev: MouseEvent): Promise<void> {
    // Read actual popup actions on open as visibility might have been changed
    pressed = true
    popupMenuActions = await actions().then((res) => res.filter((action) => action.inline !== true))
    showPopup(Menu, { actions: popupMenuActions, ctx: _id }, ev.target as HTMLElement, () => {
      pressed = false
    })
  }

  async function onInlineClick (ev: MouseEvent, action: Action): Promise<void> {
    action.action([], ev)
  }
</script>

{#if parent}
  <NavGroup
    {_id}
    categoryName={_id ?? 'nav'}
    {icon}
    {folderIcon}
    {iconProps}
    {iconSize}
    {label}
    {title}
    {highlighted}
    {selected}
    isOpen={!collapsed}
    {collapsedPrefix}
    {type}
    {isFold}
    {empty}
    {visible}
    {forciblyСollapsed}
    {shouldTooltip}
    showMenu={showMenu || pressed}
    {noDivider}
    on:click
    on:toggle={(ev) => {
      if (ev.detail !== undefined) collapsed = !ev.detail
    }}
  >
    <svelte:fragment slot="extra"><slot name="extra" /></svelte:fragment>
    <svelte:fragment slot="tools">
      {#if inlineActions.length > 0}
        {#each inlineActions as action}
          <ButtonIcon
            icon={action.icon ?? ActionIcon}
            size={'extra-small'}
            kind={'tertiary'}
            tooltip={{ label: action.label, direction: 'top' }}
            on:click={(ev) => onInlineClick(ev, action)}
          />
        {/each}
      {/if}
      {#if popupMenuActions.length === 1 && popupMenuActions[0].icon}
        <ButtonIcon
          id={_id}
          icon={popupMenuActions[0].icon}
          size={'extra-small'}
          kind={'tertiary'}
          tooltip={{ label: popupMenuActions[0].label, direction: 'top' }}
          on:click={async (ev) => {
            void popupMenuActions[0].action(_id, ev)
          }}
        />
      {:else if popupMenuActions.length > 0}
        <ButtonIcon
          icon={IconMoreH}
          size={'extra-small'}
          kind={'tertiary'}
          tooltip={{ label: view.string.MoreActions, direction: 'top' }}
          {pressed}
          on:click={onMenuClick}
        />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="visible"><slot name="visible" /></svelte:fragment>
    <slot />
  </NavGroup>
{:else}
  <NavItem
    {_id}
    {label}
    {title}
    {icon}
    {folderIcon}
    {iconProps}
    {iconSize}
    {selected}
    {bold}
    {indent}
    isOpen={!collapsed}
    {collapsedPrefix}
    {isFold}
    {empty}
    {visible}
    {forciblyСollapsed}
    {level}
    {shouldTooltip}
    showMenu={showMenu || pressed}
    on:click
  >
    <slot />
    <svelte:fragment slot="extra"><slot name="extra" /></svelte:fragment>
    <svelte:fragment slot="actions">
      {#if $$slots.actions}<slot name="actions" />{/if}
      {#if inlineActions.length > 0}
        {#each inlineActions as action}
          <ButtonIcon
            icon={action.icon ?? ActionIcon}
            size={'extra-small'}
            kind={'tertiary'}
            tooltip={{ label: action.label, direction: 'bottom' }}
            on:click={(ev) => onInlineClick(ev, action)}
          />
        {/each}
      {/if}
      {#if popupMenuActions.length === 1 && popupMenuActions[0].icon}
        <ButtonIcon
          id={_id}
          icon={popupMenuActions[0].icon}
          size={'extra-small'}
          kind={'tertiary'}
          tooltip={{ label: popupMenuActions[0].label, direction: 'top' }}
          on:click={async (ev) => {
            void popupMenuActions[0].action(_id, ev)
          }}
        />
      {:else if popupMenuActions.length > 0}
        <ButtonIcon icon={IconMoreH} size={'extra-small'} kind={'tertiary'} {pressed} on:click={onMenuClick} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="notify">
      {#if $$slots.notify}<slot name="notify" />{/if}
    </svelte:fragment>
    <svelte:fragment slot="dropbox">
      {#if isFold}<slot name="dropbox" />{/if}
    </svelte:fragment>
    <svelte:fragment slot="visible"><slot name="visible" /></svelte:fragment>
  </NavItem>
{/if}
