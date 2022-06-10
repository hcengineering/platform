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
  import type { Asset, IntlString } from '@anticrm/platform'
  import { onMount } from 'svelte'
  import { registerFocus } from '../focus'
  import { tooltip } from '../tooltips'
  import type { AnySvelteComponent, ButtonKind, ButtonShape, ButtonSize, LabelAndProps } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import Spinner from './Spinner.svelte'

  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let kind: ButtonKind = 'secondary'
  export let size: ButtonSize = 'medium'
  export let shape: ButtonShape = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let justify: 'left' | 'center' = 'center'
  export let disabled: boolean = false
  export let loading: boolean = false
  export let width: string | undefined = undefined
  export let resetIconSize: boolean = false
  export let highlight: boolean = false
  export let selected: boolean = false
  export let focus: boolean = false
  export let click: boolean = false
  export let title: string | undefined = undefined
  export let borderStyle: 'solid' | 'dashed' = 'solid'
  export let id: string | undefined = undefined
  export let input: HTMLButtonElement | undefined = undefined

  export let showTooltip: LabelAndProps | undefined = undefined

  $: iconOnly = label === undefined && $$slots.content === undefined

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
  class="button {kind} {size} jf-{justify}"
  class:only-icon={iconOnly}
  class:border-radius-1={shape === undefined}
  class:border-radius-2={shape === 'round'}
  class:border-radius-4={shape === 'circle'}
  class:border-radius-left-1={shape === 'rectangle-right'}
  class:border-radius-right-1={shape === 'rectangle-left'}
  class:border-solid={borderStyle === 'solid'}
  class:border-dashed={borderStyle === 'dashed'}
  class:highlight
  class:selected
  disabled={disabled || loading}
  style={width ? 'width: ' + width : ''}
  {title}
  type={kind === 'primary' ? 'submit' : 'button'}
  on:click
  on:focus
  on:blur
  on:mousemove
  on:mouseleave
  {id}
>
  {#if icon && !loading}
    <div
      class="btn-icon pointer-events-none"
      class:mr-1={!iconOnly && (kind === 'no-border' || kind === 'link-bordered' || shape === 'circle')}
      class:mr-2={!iconOnly && kind !== 'no-border' && kind !== 'link-bordered' && shape !== 'circle'}
      class:resetIconSize
    >
      <Icon bind:icon size={size === 'inline' ? 'inline' : 'small'} />
    </div>
  {/if}
  {#if loading}
    <Spinner />
  {:else if label}
    <span class="overflow-label disabled">
      <Label {label} params={labelParams} />
    </span>
  {:else if $$slots.content}
    <slot name="content" />
  {/if}
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
    line-height: 0.75rem;
    &.only-icon {
      width: 1.5rem;
    }
  }
  .medium {
    height: 1.75rem;
    &.only-icon {
      width: 1.75rem;
    }
  }
  .large {
    height: 2rem;
    &.only-icon {
      width: 2rem;
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
    color: var(--accent-color);
    background-color: transparent;
    border: 1px solid transparent;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    &.border-solid {
      border-style: solid;
    }

    &.border-dashed {
      border-style: dashed;
    }

    .btn-icon {
      color: var(--content-color);
      transition: color 0.15s;
      pointer-events: none;
    }
    &.highlight {
      box-shadow: inset 0 0 1px 1px var(--primary-bg-color);

      &:hover {
        box-shadow: inset 0 0 1px 1px var(--primary-bg-hover);
      }
    }
    &:hover {
      color: var(--accent-color);
      transition-duration: 0;

      .btn-icon {
        color: var(--caption-color);
      }
    }
    &:focus {
      border-color: var(--primary-edit-border-color) !important;
    }
    &:disabled {
      color: rgb(var(--caption-color) / 40%);
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
      background-color: var(--button-bg-color);
      border-color: var(--button-border-color);
      box-shadow: var(--button-shadow);

      &:hover {
        background-color: var(--button-bg-hover);
        border-color: var(--button-border-hover);
      }
      &:disabled {
        background-color: var(--button-disabled-color);
        border-color: transparent;
      }

      &.selected {
        background-color: var(--button-bg-hover);
        border-color: var(--button-border-hover);
        color: var(--caption-color);

        .btn-icon {
          color: var(--accent-color);
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
    &.transparent:hover,
    &.transparent.selected {
      background-color: var(--button-bg-hover);
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
    &.primary {
      padding: 0 1rem;
      color: var(--white-color);
      background-color: var(--primary-bg-color);
      border-color: var(--primary-bg-color);
      box-shadow: var(--primary-shadow);

      .btn-icon {
        color: var(--white-color);
      }
      &:hover {
        background-color: var(--primary-bg-hover);
      }
      &:disabled {
        background-color: #5e6ad255;
        border-color: #5e6ad255;
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
