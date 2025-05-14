<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { ButtonIcon } from '@hcengineering/ui'

  import Label from './Label.svelte'
  import IconArrowChevronRight from './icons/IconArrowChevronRight.svelte'
  import IconArrowChevronDown from './icons/IconArrowChevronDown.svelte'
  import Divider from './Divider.svelte'
  import { IconComponent, Action } from '../types'
  import Icon from './Icon.svelte'

  export let id: string
  export let title: IntlString
  export let icon: IconComponent | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let withHeaderDivider = false
  export let expanded = true
  export let selected = false
  export let level: number = 0
  export let empty = false
  export let bold = false
  export let actions: Action[] = []

  const dispatch = createEventDispatcher()

  let _expanded = expanded

  function toggleExpanded (event: MouseEvent): void {
    event.stopPropagation()
    event.preventDefault()
    _expanded = !_expanded
    dispatch('toggle', id)
  }
</script>

<div class="section">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="section__header" class:selected on:click>
    {#if level > 0}
      <div style:margin-left={`${1.25 * level}rem`} />
    {/if}

    <div class="section__arrow" on:click={toggleExpanded}>
      {#if !empty}
        {#if _expanded}
          <IconArrowChevronDown />
        {:else}
          <IconArrowChevronRight />
        {/if}
      {/if}
    </div>

    {#if icon}
      <Icon {icon} {...iconProps} />
    {/if}
    <div class="section__title next-label-overflow" class:bold>
      <Label label={title} />
    </div>
    {#if actions.length > 0}
      <div class="section__actions">
        {#each actions as action}
          <ButtonIcon
            disabled={action.disabled}
            icon={action.icon}
            iconSize="small"
            kind="tertiary"
            tooltip={{ label: action.label }}
            on:click={(e) => {
              if (action.disabled !== true) {
                e.stopPropagation()
                e.preventDefault()
                action.action(e)
              }
            }}
          />
        {/each}
      </div>
    {/if}
    {#if withHeaderDivider}
      <Divider />
    {/if}
  </div>

  <div class="section__content">
    {#if _expanded && !empty}
      <slot />
    {/if}
  </div>
</div>

<style lang="scss">
  .section {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .section__header {
    display: flex;
    width: 100%;
    min-height: 2rem;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 0.5rem;
    padding: 0.25rem;

    &.selected {
      background: var(--next-button-menu-ghost-background-color-active);
    }

    &:hover {
      background: var(--next-button-menu-ghost-background-color-hover);
      .section__actions {
        visibility: visible;
      }
    }
  }

  .section__title {
    color: var(--next-text-color-secondary);
    font-size: 0.813rem;
    font-weight: 400;

    &.bold {
      font-weight: 500;
    }
  }

  .section__arrow {
    color: var(--next-label-color-secondary);
    min-width: 1rem;
  }

  .section__content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  .section__actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    visibility: hidden;
  }
</style>
