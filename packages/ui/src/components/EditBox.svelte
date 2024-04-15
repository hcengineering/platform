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
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import { registerFocus } from '../focus'
  import plugin from '../plugin'
  import type { EditStyle } from '../types'
  import Label from './Label.svelte'
  import { floorFractionDigits } from '../utils'
  import { themeStore } from '@hcengineering/theme'

  export let id: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let maxWidth: string = '100%'
  export let value: string | number | undefined = undefined
  export let placeholder: IntlString = plugin.string.EditBoxPlaceholder
  export let placeholderParam: any | undefined = undefined
  export let format: 'text' | 'password' | 'number' = 'text'
  export let maxDigitsAfterPoint: number | undefined = undefined
  export let kind: EditStyle = 'editbox'
  export let autoFocus: boolean = false
  export let select: boolean = false
  export let focusable: boolean = false
  export let disabled: boolean = false
  export let fullSize: boolean = false
  export let required: boolean = false
  export let uppercase: boolean = false
  export let propagateClick: boolean = false

  const dispatch = createEventDispatcher()

  let input: HTMLInputElement
  let phTraslate: string = ''

  $: {
    if (
      format === 'number' &&
      maxDigitsAfterPoint &&
      value &&
      !value.toString().match(`^\\d+\\.?\\d{0,${maxDigitsAfterPoint}}$`)
    ) {
      value = floorFractionDigits(Number(value), maxDigitsAfterPoint)
    }
  }
  $: void translate(placeholder, placeholderParam ?? {}, $themeStore.language).then((res) => {
    phTraslate = res
  })

  function handleInput (): void {
    dispatch('input')
    dispatch('value', value)
  }

  onMount(() => {
    if (autoFocus) {
      input.focus()
      autoFocus = false
    }
    if (select) {
      input.select()
      select = false
    }
  })

  export function focusInput (): void {
    input?.focus()
  }
  export function selectInput (): void {
    input?.select()
  }

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      focusInput()
      return input != null
    },
    isFocus: () => document.activeElement === input
  })
  const updateFocus = () => {
    focusManager?.setFocus(idx)
  }
  $: if (input) {
    input.addEventListener('focus', updateFocus)
  }

  export function focus (): void {
    input.focus()
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  {id}
  class="antiEditBox"
  class:flex-grow={fullSize}
  class:w-full={focusable || fullSize}
  class:uppercase
  style:width={maxWidth}
  on:mousedown|stopPropagation={() => {}}
  on:click={(event) => {
    if (!propagateClick) {
      event.stopPropagation()
    }

    input.focus()
  }}
>
  <!-- {focusIndex} -->
  {#if label}
    <div class="mb-1 text-sm font-medium caption-color select-text" class:required>
      <Label {label} />
    </div>
  {/if}
  <div
    class="{kind} flex-row-center clear-mins"
    class:focusable
    class:disabled
    class:w-full={fullSize}
    style:width={maxWidth}
  >
    {#if format === 'password'}
      <input
        {disabled}
        style:width={maxWidth}
        id="userPassword"
        bind:this={input}
        type="Password"
        bind:value
        placeholder={phTraslate}
        on:input={handleInput}
        on:change
        on:keydown
        on:keypress
        on:blur={() => {
          dispatch('blur', value)
        }}
      />
    {:else if format === 'number'}
      <input
        {disabled}
        style:width={maxWidth}
        bind:this={input}
        type="number"
        class="number"
        bind:value
        placeholder={phTraslate}
        on:input={handleInput}
        on:change
        on:keydown
        on:keypress
        on:blur={() => {
          dispatch('blur', value)
        }}
      />
    {:else}
      <input
        {disabled}
        style:width={maxWidth}
        bind:this={input}
        type="text"
        bind:value
        placeholder={phTraslate}
        on:input={handleInput}
        on:change
        on:keydown
        on:keypress
        on:blur={() => {
          dispatch('blur', value)
        }}
      />
    {/if}
  </div>
</div>
