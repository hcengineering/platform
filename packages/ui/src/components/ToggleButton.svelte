<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { createEventDispatcher, onMount } from 'svelte'
  import { registerFocus } from '../focus'
  import type { AnySvelteComponent, ButtonSize } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let value: boolean
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let size: ButtonSize = 'medium'
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let selected: boolean = false
  export let focus: boolean = false
  export let id: string | undefined = undefined
  export let input: HTMLButtonElement | undefined = undefined
  export let backgroundColor: string | undefined = undefined

  $: iconOnly = label === undefined && $$slots.content === undefined

  onMount(() => {
    if (focus && input) {
      input.focus()
      focus = false
    }
  })

  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      input?.focus()
      return input != null
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

  const dispatch = createEventDispatcher()

  function getStyle (backgroundColor: string | undefined, width: string | undefined) {
    let style = width ? `width: ${width};` : ''
    if (backgroundColor) {
      style += ` background: ${backgroundColor};`
    }
    return style
  }
</script>

<button
  bind:this={input}
  class="button {size} jf-{justify}"
  class:only-icon={iconOnly}
  class:selected
  class:disabled={!value}
  style={getStyle(backgroundColor, width)}
  on:click={() => {
    value = !value
    dispatch('change', value)
  }}
  {id}
>
  {#if icon}
    <div class="btn-icon mr-2 pointer-events-none">
      <Icon bind:icon size={'small'} />
    </div>
  {/if}
  <span class="overflow-label pointer-events-none">
    {#if label}
      <Label {label} params={labelParams} />
    {:else if $$slots.content}
      <slot name="content" />
    {/if}
  </span>
</button>

<style lang="scss">
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
    min-width: 1.5rem;
    white-space: nowrap;
    color: var(--accent-color);
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 0.125rem;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    .btn-icon {
      transition: color 0.15s;
      pointer-events: none;
    }
    &.disabled {
      color: rgb(var(--caption-color) / 40%);

      .btn-icon {
        opacity: 0.5;
      }
    }
    &:hover {
      color: var(--caption-color);
      transition-duration: 0;

      .btn-icon {
        color: var(--caption-color);
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
  }
</style>
