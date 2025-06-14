<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Asset } from '@hcengineering/platform'
  import type { AnySvelteComponent, ButtonSize } from '../types'
  import Icon from './Icon.svelte'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let size: ButtonSize = 'large'
  export let ghost: boolean = false
  export let selected: boolean = false
  export let primary: boolean = false
  export let disabled: boolean = false
  export let id: string | undefined = undefined
  export let backgroundColors: string[] | undefined = undefined

  const dispatch = createEventDispatcher()

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'Space') {
      key.preventDefault()
      key.stopPropagation()
      dispatch('selected')
    }
  }

  const getBackgroundColors = (bgColors: string[] | undefined): string | undefined => {
    if (bgColors === undefined || bgColors.length === 0) {
      return undefined
    }
    const proc = bgColors.length > 1 ? 100 / bgColors.length : 100
    return proc === 100
      ? `background: ${bgColors[0]} !important;`
      : `background: conic-gradient(${bgColors
          .map((bgc, i) => {
            const start = i * proc
            const end = i < bgColors.length - 1 ? (i + 1) * proc : 100
            return `${bgc} ${start}%, ${bgc} ${end}%`
          })
          .join(', ')}) !important;`
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  {id}
  class="flex-center icon-button icon-{size}"
  class:selected
  class:ghost
  class:primary
  class:disabled
  class:backgrounds={backgroundColors !== undefined}
  style={getBackgroundColors(backgroundColors)}
  tabindex="0"
  on:keydown={onKeydown}
  on:click|stopPropagation
  on:mousemove
>
  {#if $$slots.content}
    <slot name="content" />
  {:else if icon}
    <div class="flex-center content">
      <Icon {icon} size={'full'} />
    </div>
  {/if}
</div>

<style lang="scss">
  .icon-button {
    position: relative;
    flex-shrink: 0;
    color: var(--theme-content-color);
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-divider-color);
    border-radius: 50%;
    outline: none;
    cursor: pointer;

    &::before {
      position: absolute;
      top: -0.25rem;
      bottom: -0.25rem;
      left: -0.25rem;
      right: -0.25rem;
      border: 1px solid var(--primary-button-default);
      border-radius: 50%;
    }
    &:hover {
      background-color: var(--theme-button-hovered);
    }
    &:active {
      background-color: var(--theme-button-pressed);
    }
    &:focus {
      background-color: var(--theme-button-focused);

      &::before {
        content: '';
      }
    }
    &.disabled {
      background-color: transparent;
    }
    .content {
      pointer-events: none;
    }
    &.selected {
      background-color: var(--menu-bg-select);
    }
    &.ghost {
      background-color: var(--menu-bg-select-trans);

      &:hover {
        background-color: var(--menu-bg-select);
      }
    }
    &.primary {
      color: var(--secondary-button-color);
      background-color: var(--secondary-button-default);
      &:hover {
        background-color: var(--secondary-button-hovered);
      }
      &:active {
        background-color: var(--secondary-button-pressed);
      }
      &:focus {
        background-color: var(--secondary-button-focused);
      }
      &.disabled {
        background-color: var(--primary-button-disabled);
      }
    }
    &.backgrounds {
      color: var(--white-color);
      border: none;
    }
  }
  .icon-inline {
    width: 1em;
    height: 1em;
  }
  .icon-small {
    width: 1.5rem;
    height: 1.5rem;
    .content {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
  .icon-medium {
    width: 1.75rem;
    height: 1.75rem;
    .content {
      width: 0.875rem;
      height: 0.875rem;
    }
  }
  .icon-large {
    width: 2rem;
    height: 2rem;
    .content {
      width: 1rem;
      height: 1rem;
    }
  }
  .icon-x-large {
    width: 2.25rem;
    height: 2.25rem;
    .content {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
</style>
