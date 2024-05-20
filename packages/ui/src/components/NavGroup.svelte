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
  import type { Doc, Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { AnyComponent, IconSize, AnySvelteComponent } from '..'
  import {
    showPopup,
    Menu,
    Action,
    Label,
    Component,
    IconDown,
    IconDownOutline,
    Icon,
    getTreeCollapsed,
    setTreeCollapsed
  } from '..'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let iconSize: IconSize = 'small'
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let categoryName: string
  export let tools: AnyComponent | undefined = undefined
  export let isOpen: boolean = true
  export let isFold: boolean = false
  export let empty: boolean = false
  export let visible: boolean = false
  export let selected: boolean = false
  export let nested: boolean = false
  export let noDivider: boolean = false
  export let showMenu: boolean = false
  export let actions: Action[] = []
  export let _id: Ref<Doc> | string | undefined = undefined

  const dispatch = createEventDispatcher()

  $: id = `navGroup-${categoryName}`
  let pressed: boolean = false

  const toggle = (): void => {
    if (empty) return
    isOpen = !isOpen
    dispatch('toggle', isOpen)
  }

  function handleMenuClicked (ev: MouseEvent): void {
    if (actions.length === 0) return
    ev.stopPropagation()
    pressed = true
    showPopup(Menu, { actions }, ev.target as HTMLElement, () => {
      pressed = false
    })
  }
  $: if (empty) isOpen = false
  $: isOpen = !getTreeCollapsed(_id)
  $: setTreeCollapsed(_id, !isOpen)
</script>

<div class="hulyNavGroup-container" class:nested class:noDivider>
  <button
    class="hulyNavGroup-header"
    class:isOpen={isOpen || visible}
    class:selected
    class:showMenu={showMenu || pressed}
    on:click={toggle}
  >
    {#if isFold && !empty}
      <button class="hulyNavGroup-header__chevron" class:collapsed={!isOpen}>
        <IconDown size={'small'} />
      </button>
    {/if}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="hulyNavGroup-header__label font-medium-12" on:click={handleMenuClicked}>
      {#if icon}
        <div class="hulyNavGroup-header__icon">
          <Icon {icon} size={iconSize} {iconProps} />
        </div>
      {/if}
      <span class="overflow-label">
        {#if label}<Label {label} />{/if}
        {#if title}{title}{/if}
      </span>
      {#if actions.length > 0}
        <IconDownOutline size={'tiny'} />
      {/if}
    </div>
    <div class="flex-grow" />
    {#if tools || $$slots.tools}
      <div class="hulyNavGroup-header__tools">
        {#if tools}
          <Component
            is={tools}
            props={{
              kind: 'tools',
              categoryName
            }}
          />
        {/if}
        <slot name="tools" />
      </div>
    {/if}
  </button>
  <div {id} class="hulyNavGroup-content">
    {#if !isOpen && visible}
      <slot name="visible" {isOpen} />
    {:else}
      <slot />
    {/if}
  </div>
</div>
