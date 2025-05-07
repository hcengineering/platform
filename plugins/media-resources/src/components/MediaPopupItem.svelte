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
  import { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, IconCheck, IconChevronRight, Label, tooltip } from '@hcengineering/ui'
  import { ComponentType, createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let expandable: boolean = false
  export let expanded: boolean = false
  export let selected: boolean = false
  export let selectable: boolean = false
  export let disabled: boolean = false

  function handleClick (): void {
    if (disabled) return

    if (expandable) {
      expanded = !expanded
      dispatch('expand', expanded)
      return
    }

    if (selectable) {
      selected = true
      dispatch('select')
    }
  }
</script>

<div class="mediaPopupItem" class:expanded={expandable && expanded}>
  <button class="mediaPopupItem-header" on:click={handleClick}>
    <div class="mediaPopupItem-header__icon">
      {#if icon !== undefined}
        <Icon {icon} {iconProps} size={'small'} />
      {/if}
    </div>

    <div class="mediaPopupItem-header__label">
      <span class="label overflow-label font-medium-14" use:tooltip={{ label }}>
        <Label {label} />
      </span>
      {#if $$slots.subtitle}
        <span class="mediaPopupItem-header__subtitle">
          <slot name="subtitle" />
        </span>
      {/if}
    </div>

    {#if selectable}
      <div class="mediaPopupItem-header__check">
        {#if selected}
          <IconCheck size={'small'} />
        {/if}
      </div>
    {/if}

    {#if expandable && !disabled}
      <div class="mediaPopupItem-header__chevron">
        <Icon icon={IconChevronRight} size={'small'} />
      </div>
    {/if}
  </button>

  {#if expandable && expanded && $$slots.content}
    <div class="mediaPopupItem-content">
      <slot name="content" />
    </div>
  {/if}
</div>

<style lang="scss">
  .mediaPopupItem {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;

    .mediaPopupItem-header {
      margin: 0.25rem;
      padding: 0.25rem 0.5rem;
      min-height: 2.25rem;

      display: flex;
      flex-direction: row;
      justify-content: space-between;
      min-width: 0;

      flex-grow: 1;
      gap: 0.625rem;

      color: var(--theme-caption-color);
      cursor: pointer;
    }

    .mediaPopupItem-content {
      display: flex;
      flex-direction: column;
      background-color: var(--theme-button-hovered);
      border-top: 1px solid var(--theme-divider-color);
    }

    .mediaPopupItem-header__label {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      align-items: flex-start;
      overflow: hidden;
      gap: 0.125rem;

      > * {
        max-width: 100%;
      }
    }

    .mediaPopupItem-header__icon,
    .mediaPopupItem-header__check,
    .mediaPopupItem-header__chevron {
      width: 1rem;
      height: 1rem;
      color: var(--theme-dark-color);
    }

    .mediaPopupItem-header__chevron {
      transition: transform 0.2s ease-in-out;
    }

    &.expanded {
      .mediaPopupItem-header__chevron {
        transform: rotate(90deg);
      }
    }
  }
</style>
