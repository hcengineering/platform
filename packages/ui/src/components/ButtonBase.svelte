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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, ButtonBaseKind, ButtonBaseSize, ButtonBaseType, IconSize, LabelAndProps } from '../types'
  import { tooltip as tp } from '../tooltips'
  import { registerFocus } from '../focus'
  import { ComponentType, onMount } from 'svelte'
  import Spinner from './Spinner.svelte'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let title: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconSize: IconSize | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let kind: ButtonBaseKind
  export let size: ButtonBaseSize
  export let disabled: boolean = false
  export let loading: boolean = false
  export let pressed: boolean = false
  export let hasMenu: boolean = false
  export let autoFocus: boolean = false
  export let type: ButtonBaseType
  export let inheritColor: boolean = false
  export let inheritFont: boolean = false
  export let tooltip: LabelAndProps | undefined = undefined
  export let element: HTMLButtonElement | undefined = undefined
  export let id: string | undefined = undefined

  let actualIconSize: IconSize = 'small'

  $: if (iconSize) {
    actualIconSize = iconSize
  } else if (type === 'type-button' && !hasMenu) {
    actualIconSize = 'medium'
  }

  export function focus () {
    element?.focus()
  }

  onMount(() => {
    if (autoFocus && element) {
      element.focus()
      autoFocus = false
    }
  })

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      if (!disabled) {
        element?.focus()
      }
      return !disabled && element != null
    },
    isFocus: () => document.activeElement === element
  })

  $: if (idx !== -1 && focusManager) {
    focusManager.updateFocus(idx, focusIndex)
  }

  const updateFocus = () => {
    focusManager?.setFocus(idx)
  }
  $: if (element != null) {
    element.addEventListener('focus', updateFocus, { once: true })
  }
</script>

<button
  {id}
  bind:this={element}
  class="font-medium-14 {kind} {size} {type}"
  class:loading
  class:pressed
  class:inheritColor
  class:inheritFont
  class:menu={hasMenu}
  disabled={loading || disabled}
  use:tp={tooltip}
  on:click|stopPropagation
  on:keydown
>
  {#if loading}
    <div class="icon animate"><Spinner size={type === 'type-button' && !hasMenu ? 'medium' : 'small'} /></div>
  {:else if icon}<div class="icon">
      <Icon {icon} {iconProps} size={actualIconSize} />
    </div>{/if}
  {#if label}<span><Label {label} params={labelParams} /></span>{/if}
  {#if title}<span>{title}</span>{/if}
  <slot />
</button>

<style lang="scss">
  button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    gap: var(--spacing-1);

    border: 1px;
    border-style: solid;

    &:not(:disabled, .loading) {
      cursor: pointer;
    }
    &.inheritFont {
      font: inherit;
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--spacing-2_5);
      height: var(--spacing-2_5);

      &.animate {
        animation: rotate 2s linear infinite;
      }
    }

    &:focus {
      outline: 2px solid var(--global-focus-BorderColor);
      outline-offset: 2px;
    }
    &.type-button-icon {
      padding: 0;
    }
    &.large {
      height: var(--global-large-Size);
      border-radius: var(--medium-BorderRadius);

      &.type-button {
        padding: 0 var(--spacing-2);
      }
      &.type-button-icon {
        width: var(--global-large-Size);
      }
    }
    &.medium {
      height: var(--global-medium-Size);
      border-radius: var(--medium-BorderRadius);

      &.type-button {
        padding: 0 var(--spacing-2);
      }
      &.type-button-icon {
        width: var(--global-medium-Size);
      }
    }
    &.small {
      height: var(--global-small-Size);
      gap: var(--spacing-0_5);
      border-radius: var(--small-BorderRadius);

      &.type-button {
        padding: 0 var(--spacing-1);
      }
      &.type-button-icon {
        width: var(--global-small-Size);
      }
    }
    &.extra-small {
      height: var(--global-extra-small-Size);
      border-radius: var(--extra-small-BorderRadius);

      &.type-button {
        padding: 0 var(--spacing-1);
      }
      &.type-button-icon {
        width: var(--global-extra-small-Size);
      }
    }
    &.min {
      height: var(--global-min-Size);
      border: 0;
      border-radius: var(--min-BorderRadius);
    }
    &.type-button-icon .icon,
    &.menu .icon {
      width: var(--spacing-2);
      height: var(--spacing-2);
    }

    &.primary {
      border-color: var(--button-primary-BorderColor);
      background-color: var(--button-primary-BackgroundColor);

      .icon {
        color: var(--button-accent-IconColor);
      }
      span {
        color: var(--button-accent-LabelColor);
      }
      &:hover {
        background-color: var(--button-primary-hover-BackgroundColor);
      }
      &:active,
      &.pressed {
        background-color: var(--button-primary-active-BackgroundColor);
      }
      &.menu:enabled:active,
      &.pressed {
        border-color: var(--button-menu-active-BorderColor);
      }
      &:disabled:not(.loading) {
        background-color: var(--button-disabled-BackgroundColor);
        border-color: transparent;
        cursor: not-allowed;

        .icon {
          color: var(--button-disabled-IconColor);
        }
        span {
          color: var(--button-disabled-LabelColor);
        }
      }
      &.loading {
        background-color: var(--button-primary-active-BackgroundColor);

        span {
          color: var(--button-primary-loading-LabelColor);
        }
      }
    }

    &.secondary {
      border-color: var(--button-secondary-BorderColor);
      background-color: var(--button-secondary-BackgroundColor);

      .icon {
        color: var(--button-subtle-IconColor);
      }
      span {
        color: var(--button-subtle-LabelColor);
      }
      &:hover {
        background-color: var(--button-secondary-hover-BackgroundColor);
      }
      &:active,
      &.pressed {
        background-color: var(--button-secondary-active-BackgroundColor);
      }
      &.menu:enabled:active,
      &.pressed {
        border-color: var(--button-menu-active-BorderColor);
      }
      &:disabled:not(.loading) {
        background-color: var(--button-disabled-BackgroundColor);
        border-color: transparent;
        cursor: not-allowed;

        .icon {
          color: var(--button-disabled-IconColor);
        }
        span {
          color: var(--button-disabled-LabelColor);
        }
      }
      &.loading {
        background-color: var(--button-secondary-active-BackgroundColor);

        span {
          color: var(--button-disabled-LabelColor);
        }
      }
    }

    &.tertiary {
      border-color: transparent;
      background-color: transparent;

      &:not(.inheritColor) .icon {
        color: var(--button-subtle-IconColor);
      }
      &.inheritColor {
        color: inherit;

        .icon {
          color: currentColor;
        }
      }
      span {
        color: var(--button-subtle-LabelColor);
      }
      &:hover:enabled {
        background-color: var(--button-tertiary-hover-BackgroundColor);
      }
      &:active:enabled,
      &.pressed:enabled {
        background-color: var(--button-tertiary-active-BackgroundColor);
      }
      &.menu:active:enabled,
      &.pressed:enabled {
        border-color: var(--button-menu-active-BorderColor);
      }
      &:disabled:not(.loading) {
        border-color: transparent;
        cursor: not-allowed;

        .icon {
          color: var(--button-disabled-IconColor);
        }
        span {
          color: var(--button-disabled-LabelColor);
        }
      }
      &.loading {
        background-color: var(--button-tertiary-active-BackgroundColor);

        span {
          color: var(--button-disabled-LabelColor);
        }
      }
    }

    &.negative {
      border-color: var(--button-negative-BorderColor);
      background-color: var(--button-negative-BackgroundColor);

      .icon {
        color: var(--button-accent-IconColor);
      }
      span {
        color: var(--button-accent-LabelColor);
      }
      &:hover {
        background-color: var(--button-negative-hover-BackgroundColor);
      }
      &:active,
      &.pressed {
        background-color: var(--button-negative-active-BackgroundColor);
      }
      &.menu:enabled:active,
      &.pressed {
        border-color: var(--button-menu-active-BorderColor);
      }
      &:disabled:not(.loading) {
        background-color: var(--button-disabled-BackgroundColor);
        border-color: transparent;
        cursor: not-allowed;

        .icon {
          color: var(--button-disabled-IconColor);
        }
        span {
          color: var(--button-disabled-LabelColor);
        }
      }
      &.loading {
        background-color: var(--button-negative-active-BackgroundColor);

        span {
          color: var(--button-negative-loading-LabelColor);
        }
      }
    }

    & > * {
      pointer-events: none;
    }
  }

  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(359deg);
    }
  }
</style>
