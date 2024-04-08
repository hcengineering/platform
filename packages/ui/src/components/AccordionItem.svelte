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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { ComponentType } from 'svelte'
  import type { AnySvelteComponent } from '../types'
  import { getTreeCollapsed, setTreeCollapsed } from '../location'
  import IconChevronRight from './icons/ChevronRight.svelte'
  import Label from './Label.svelte'
  import Icon from './Icon.svelte'

  export let id: string
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let size: 'small' | 'medium' | 'large'
  export let kind: 'default' | 'second' | 'no-border' = 'default'
  export let nested: boolean = false
  export let isOpen: boolean = false
  export let disabled: boolean = false
  export let selected: boolean = false
  export let selectable: boolean = false
  export let bottomSpace: boolean = true
  export let counter: number | boolean = false
  export let duration: number | boolean = false
  export let fixHeader: boolean = false
  export let categoryHeader: boolean = false
  export let background: string | undefined = undefined

  const dispatch = createEventDispatcher()

  let collapsed: boolean = getTreeCollapsed(id)
  if (isOpen) collapsed = false
  $: setTreeCollapsed(id, collapsed)

  function handleClick (): void {
    if (disabled) return
    collapsed = !collapsed
  }
</script>

<div class="hulyAccordionItem-container {kind}" class:nested>
  <button
    class="hulyAccordionItem-header {kind} {size}"
    class:bottomSpace
    class:nested
    class:disabled
    class:isOpen={!collapsed}
    class:selected
    class:selectable
    class:scroller-header={fixHeader}
    class:categoryHeader
    style:background-color={background ?? 'transparent'}
    on:click|stopPropagation={handleClick}
  >
    <div
      class="hulyAccordionItem-header__label-wrapper {size === 'large' ? 'heading-medium-16' : 'font-medium-12'}"
      class:withIcon={size === 'medium' && icon !== undefined}
    >
      {#if size === 'large'}
        <div class="hulyAccordionItem-header__chevron">
          <Icon icon={IconChevronRight} size={'small'} />
        </div>
      {/if}
      {#if size !== 'small' && icon !== undefined}
        <div class="hulyAccordionItem-header__chevron">
          <Icon {icon} size={size === 'medium' ? 'small' : 'medium'} {iconProps} />
        </div>
      {/if}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="hulyAccordionItem-header__label"
        on:click|stopPropagation={() => {
          if (selectable) dispatch('select')
          else handleClick()
        }}
      >
        {#if label}<Label {label} />{/if}
        {#if title}{title}{/if}
        <slot name="title" />
      </div>
      {#if counter !== false || $$slots.counter}
        <span class="hulyAccordionItem-header__separator">•</span>
        <span class="hulyAccordionItem-header__counter">
          {#if typeof counter === 'number'}{counter}{/if}
          <slot name="counter" />
        </span>
      {/if}
      {#if duration !== false || $$slots.duration}
        <span class="hulyAccordionItem-header__separator">•</span>
        <span class="hulyAccordionItem-header__duration">
          {#if typeof duration === 'number'}{duration}{/if}
          <slot name="duration" />
        </span>
      {/if}
    </div>
    <div class="hulyAccordionItem-header__tools">
      <slot name="actions" />
    </div>
  </button>
  <div class="hulyAccordionItem-content">
    <slot />
  </div>
</div>
