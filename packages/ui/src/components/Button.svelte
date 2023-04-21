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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { onMount, ComponentType } from 'svelte'
  import { registerFocus } from '../focus'
  import { tooltip } from '../tooltips'
  import type { AnySvelteComponent, ButtonKind, ButtonShape, ButtonSize, LabelAndProps, IconSize } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import Spinner from './Spinner.svelte'

  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let kind: ButtonKind = 'secondary'
  export let size: ButtonSize = 'medium'
  export let shape: ButtonShape = undefined
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let iconRight: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconRightProps: any | undefined = undefined
  export let justify: 'left' | 'center' = 'center'
  export let disabled: boolean = false
  export let loading: boolean = false
  export let width: string | undefined = undefined
  export let height: string | undefined = undefined
  export let resetIconSize: boolean = false
  export let highlight: boolean = false
  export let selected: boolean = false
  export let notSelected: boolean = false
  export let focus: boolean = false
  export let click: boolean = false
  export let title: string | undefined = undefined
  export let borderStyle: 'solid' | 'dashed' = 'solid'
  export let id: string | undefined = undefined
  export let input: HTMLButtonElement | undefined = undefined
  export let showTooltip: LabelAndProps | undefined = undefined
  export let iconSize: IconSize = size === 'inline' ? 'inline' : 'small'
  export let iconRightSize: IconSize = 'x-small'
  export let short: boolean = false

  // $: iconSize = size === 'inline' ? 'inline' : 'small'
  $: iconOnly =
    label === undefined &&
    ($$slots.content === undefined || $$slots.icon !== undefined || $$slots.iconRight !== undefined)

  onMount(() => {
    if (focus && input) {
      input.focus()
      focus = false
    }
    if (click && input) {
      input.click()
      click = false
    }
  })

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      if (!disabled) {
        input?.focus()
      }
      return !disabled && input != null
    },
    isFocus: () => document.activeElement === input
  })

  $: if (idx !== -1 && focusManager) {
    focusManager.updateFocus(idx, focusIndex)
  }

  const updateFocus = () => {
    focusManager?.setFocus(idx)
  }
  $: if (input != null) {
    input.addEventListener('focus', updateFocus, { once: true })
  }
</script>

<!-- {focusIndex} -->
<button
  use:tooltip={showTooltip}
  bind:this={input}
  class="button {kind} {size} jf-{justify} sh-{shape ?? 'no-shape'} bs-{borderStyle}"
  class:only-icon={iconOnly}
  class:highlight
  class:selected
  class:notSelected
  disabled={disabled || loading}
  class:short
  style:width
  style:height
  {title}
  type={kind === 'primary' ? 'submit' : 'button'}
  on:click|stopPropagation|preventDefault
  on:focus
  on:blur
  on:mousemove
  on:mouseleave
  {id}
>
  {#if icon && !loading}
    <div class="btn-icon pointer-events-none" class:resetIconSize>
      <Icon bind:icon size={iconSize} {iconProps} />
    </div>
  {/if}
  {#if loading}
    <div class="btn-icon pointer-events-none caption-color spinner" class:resetIconSize>
      <Spinner size={iconSize === 'inline' ? 'inline' : 'small'} />
    </div>
  {/if}
  {#if label}
    <span class="overflow-label disabled pointer-events-none" class:ml-2={loading}>
      <Label {label} params={labelParams} />
    </span>
  {/if}
  {#if iconRight}
    <div class="btn-right-icon pointer-events-none" class:resetIconSize>
      <Icon bind:icon={iconRight} size={iconRightSize} iconProps={iconRightProps} />
    </div>
  {/if}
  {#if $$slots.icon}<slot name="icon" />{/if}
  {#if $$slots.content}<slot name="content" />{/if}
  {#if $$slots.iconRight}<slot name="iconRight" />{/if}
</button>

<style lang="scss">
  .inline {
    height: 1.375rem;
    font-size: 0.75rem;
    line-height: 0.75rem;
    &.only-icon {
      width: 1.375rem;
    }
  }
  .small {
    height: 1.5rem;
    font-size: 0.75rem;
    &.only-icon {
      width: 1.5rem;
    }
  }
  .medium {
    height: 2rem;
    &.only-icon {
      width: 2rem;
    }
  }
  .large {
    height: 2.25rem;
    &.only-icon {
      width: 2.25rem;
    }
  }
  .x-large {
    height: 2.75rem;
    &.only-icon {
      width: 2.75rem;
    }
  }

  .button {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.5rem;
    font-weight: 500;
    min-width: 1.375rem;
    white-space: nowrap;
    color: var(--theme-caption-color);
    background-color: transparent;
    border: 1px solid transparent;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    .btn-icon {
      color: var(--theme-content-color);
      transition: color 0.15s;
      pointer-events: none;
    }
    .btn-right-icon {
      margin-left: 0.5rem;
      color: var(--theme-halfcontent-color);
      transition: color 0.15s;
      pointer-events: none;
    }
    &:not(.only-icon) .btn-icon:not(.spinner) {
      margin-right: 0.5rem;
    }
    &:not(.only-icon) .btn-right-icon {
      margin-left: 0.5rem;
    }
    &.no-border:not(.only-icon) .btn-icon,
    &.link-bordered:not(.only-icon) .btn-icon,
    &.list:not(.only-icon) .btn-icon,
    &.sh-circle:not(.only-icon) .btn-icon {
      margin-right: 0.25rem;
    }

    &.short {
      max-width: 7rem;
    }
    &.sh-no-shape {
      border-radius: 0.25rem;
    }
    &.sh-round {
      border-radius: 0.5rem;
    }
    &.sh-circle {
      border-radius: 1rem;
      &.link {
        padding: 0 0.5rem 0 0.25rem;
      }
    }
    &.sh-rectangle-right {
      border-top-left-radius: 0.25rem;
      border-bottom-left-radius: 0.25rem;
    }
    &.sh-rectangle-left {
      border-top-right-radius: 0.25rem;
      border-bottom-right-radius: 0.25rem;
    }
    &.bs-solid {
      border-style: solid;
    }
    &.bs-dashed {
      border-style: dashed;
    }

    &.highlight {
      box-shadow: inset 0 0 1px 1px var(--primary-button-enabled);

      &:hover {
        box-shadow: inset 0 0 1px 1px var(--primary-button-hovered);
      }
    }
    &:hover {
      .btn-icon {
        color: var(--theme-caption-color);
      }
    }
    &:focus {
      box-shadow: 0 0 0 2px var(--primary-button-focused-border);
    }
    &:disabled {
      color: var(--theme-dark-color);
      cursor: not-allowed;

      .btn-icon {
        opacity: 0.5;
      }
    }

    &.jf-left {
      justify-content: flex-start;
    }
    &.jf-center {
      justify-content: center;
    }
    &.only-icon {
      padding: 0;
    }

    &.secondary {
      background-color: var(--theme-button-enabled);
      border-color: var(--theme-button-border);

      &.medium:not(.only-icon) {
        padding: 0 0.75rem;
      }
      &:hover {
        background-color: var(--theme-button-hovered);
      }
      &:active {
        background-color: var(--theme-button-pressed);
      }
      &:focus {
        background-color: var(--theme-button-focused);
      }
      &:disabled {
        background-color: var(--theme-button-disabled);
      }

      &.selected {
        background-color: var(--theme-button-hovered);
        .btn-icon {
          color: var(--theme-caption-color);
        }
      }
    }
    &.no-border {
      font-weight: 400;
      color: var(--accent-color);
      background-color: var(--noborder-bg-color);
      box-shadow: var(--button-shadow);

      &:hover {
        color: var(--caption-color);
        background-color: var(--noborder-bg-hover);

        .btn-icon {
          color: var(--caption-color);
        }
      }
      &:disabled {
        color: var(--content-color);
        background-color: var(--button-disabled-color);
        cursor: default;
        &:hover {
          color: var(--content-color);
          .btn-icon {
            color: var(--content-color);
          }
        }
      }
    }
    &.transparent {
      &:hover {
        background-color: var(--theme-button-hovered);
      }
      &.selected {
        background-color: var(--highlight-select);
      }
      &.selected:hover {
        background-color: var(--highlight-select-hover);
      }
    }
    &.link {
      padding: 0 0.875rem;
      &:hover {
        color: var(--caption-color);
        background-color: var(--body-color);
        border-color: var(--divider-color);
        .btn-icon {
          color: var(--content-color);
        }
      }
      &:disabled {
        color: var(--accent-color);
        background-color: transparent;
        border-color: transparent;
        cursor: auto;

        .btn-icon {
          color: var(--content-color);
        }
      }
    }
    &.link-bordered {
      padding: 0 0.375rem;
      color: var(--accent-color);
      border-color: var(--divider-color);
      &:hover {
        color: var(--accent-color);
        background-color: var(--button-bg-hover);
        border-color: var(--button-border-hover);
        .btn-icon {
          color: var(--accent-color);
        }
      }
    }
    &.list {
      padding: 0 0.625em;
      min-height: 1.75rem;
      color: var(--theme-halfcontent-color);
      background-color: var(--theme-list-button-color);
      border: 1px solid var(--theme-button-border);
      border-radius: 1.5rem;
      // transition-property: border, color, background-color;
      // transition-duration: 0.15s;

      .btn-icon {
        color: var(--theme-dark-color);
      }
      &:hover {
        color: var(--theme-halfcontent-color);
        background-color: var(--theme-list-button-color);
        border-color: var(--theme-button-border);
      }
      &:focus {
        box-shadow: none;
      }
    }
    &.primary {
      padding: 0 0.75rem;
      color: var(--primary-button-color);
      background-color: var(--primary-button-enabled);
      border-color: var(--primary-button-border);

      .btn-icon {
        color: var(--white-color);
      }
      &:hover {
        background-color: var(--primary-button-hovered);
      }
      &:active {
        background-color: var(--primary-button-pressed);
      }
      &:focus {
        background-color: var(--primary-button-focused);
      }
      &:disabled {
        background-color: var(--primary-button-disabled);
      }
    }

    &.notSelected {
      color: var(--content-color);

      &:hover,
      &:hover .btn-icon {
        color: var(--accent-color);
      }
    }

    &.dangerous {
      color: var(--white-color);
      background-color: var(--dangerous-bg-color);
      border-color: var(--dangerous-bg-color);

      &:hover {
        background-color: var(--dangerous-bg-hover);
      }
      &:focus {
        box-shadow: var(--dangerous-shadow);
      }
    }

    .resetIconSize {
      font-size: 16px;
    }
  }
</style>
