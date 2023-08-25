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
  import { translate } from '@hcengineering/platform'
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'
  import { registerFocus } from '../focus'
  import plugin from '../plugin'
  import type { AnySvelteComponent, EditStyle } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import { resizeObserver } from '../resize'
  import { floorFractionDigits } from '../utils'
  import { themeStore } from '@hcengineering/theme'

  export let label: IntlString | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let maxWidth: string | undefined = undefined
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

  const dispatch = createEventDispatcher()

  let text: HTMLElement
  let input: HTMLInputElement
  let style: string
  let phTraslate: string = ''
  let parentWidth: number | undefined

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
  $: style = `max-width: ${
    maxWidth || (parentWidth ? (icon ? `calc(${parentWidth}px - 1.25rem)` : `${parentWidth}px`) : 'max-content')
  };`
  $: translate(placeholder, placeholderParam ?? {}, $themeStore.language).then((res) => {
    phTraslate = res
  })

  function computeSize (t: HTMLInputElement | EventTarget | null) {
    if (t == null) {
      return
    }
    const target = t as HTMLInputElement
    const value = target.value
    text.innerHTML = (value === '' ? phTraslate : value)
      .replaceAll(' ', '&nbsp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
    if (format === 'number') {
      target.style.width = maxWidth ?? '5rem'
    } else if (kind === 'underline') {
      target.style.width = `calc(${text.clientWidth}px + 1.125rem)`
    } else {
      target.style.width = Math.max(text.clientWidth, 50) + 'px'
    }
    dispatch('input')
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
    computeSize(input)
  })

  afterUpdate(() => {
    computeSize(input)
  })

  export function focusInput () {
    input?.focus()
  }
  export function selectInput () {
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
    input.addEventListener('focus', updateFocus, { once: true })
  }

  export function focus (): void {
    input.focus()
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="antiEditBox"
  class:flex-grow={fullSize}
  class:w-full={focusable || fullSize}
  class:uppercase
  on:click={() => {
    input.focus()
  }}
  use:resizeObserver={(element) => {
    parentWidth = element.parentElement?.getBoundingClientRect().width
  }}
>
  <!-- {focusIndex} -->
  <div class="hidden-text {kind}" bind:this={text} />
  {#if label}
    <div class="mb-1 text-sm font-medium caption-color select-text">
      <Label {label} />
      {#if required}<span class="error-color">&ast</span>{/if}
    </div>
  {/if}
  <div class="{kind} flex-row-center clear-mins" class:focusable class:disabled class:w-full={fullSize}>
    {#if icon}
      <div class="dark-color mr-1">
        <Icon {icon} size={'small'} />
      </div>
    {/if}
    {#if format === 'password'}
      <input
        {disabled}
        id="userPassword"
        bind:this={input}
        type="Password"
        bind:value
        placeholder={phTraslate}
        {style}
        on:input={(ev) => ev.target && computeSize(ev.target)}
        on:change
        on:keydown
        on:keypress
        on:blur
      />
    {:else if format === 'number'}
      <input
        {disabled}
        bind:this={input}
        type="number"
        class="number"
        bind:value
        placeholder={phTraslate}
        {style}
        on:input={(ev) => ev.target && computeSize(ev.target)}
        on:change
        on:keydown
        on:keypress
        on:blur
      />
    {:else}
      <input
        {disabled}
        bind:this={input}
        type="text"
        bind:value
        placeholder={phTraslate}
        {style}
        on:input={(ev) => ev.target && computeSize(ev.target)}
        on:change
        on:keydown
        on:keypress
        on:blur
      />
    {/if}
  </div>
</div>
