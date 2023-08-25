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
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/theme'
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'
  import { registerFocus } from '../focus'
  import plugin from '../plugin'
  import { resizeObserver } from '../resize'
  import { floorFractionDigits } from '../utils'
  import DownOutline from './icons/DownOutline.svelte'
  import UpOutline from './icons/UpOutline.svelte'
  import Button from './Button.svelte'

  export let maxWidth: string | undefined = undefined
  export let value: number = 0
  export let minValue: number | undefined = undefined
  export let placeholder: IntlString = plugin.string.EditBoxPlaceholder
  export let placeholderParam: any | undefined = undefined
  export let maxDigitsAfterPoint: number | undefined = undefined
  export let disabled: boolean = false
  export let autoFocus: boolean = false
  export let select: boolean = false
  export let focusable: boolean = false

  const dispatch = createEventDispatcher()

  let text: HTMLElement
  let input: HTMLInputElement
  let style: string
  let phTraslate: string = ''
  let parentWidth: number | undefined

  $: {
    if (
      maxDigitsAfterPoint !== undefined &&
      value &&
      !value.toString().match(`^\\d+\\.?\\d{0,${maxDigitsAfterPoint}}$`)
    ) {
      value = floorFractionDigits(Number(value), maxDigitsAfterPoint)
    }
  }

  $: {
    if (minValue !== undefined && value < minValue) value = minValue
  }
  $: style = `max-width: ${maxWidth || (parentWidth ? `${parentWidth}px` : 'max-content')};`
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
    target.style.width = maxWidth ?? '5rem'
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
  class="editbox-container"
  on:click={() => {
    input.focus()
  }}
  use:resizeObserver={(element) => {
    parentWidth = element.parentElement?.getBoundingClientRect().width
  }}
>
  <div class="hidden-text" bind:this={text} />
  <div class="flex-row-center clear-mins" class:focusable>
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
    <div class="flex-col-center py-0-5">
      <Button icon={UpOutline} kind={'stepper'} padding={'0'} {disabled} on:click={() => value++} />
      <Button icon={DownOutline} kind={'stepper'} padding={'0'} {disabled} on:click={() => value--} />
    </div>
  </div>
</div>

<style lang="scss">
  .editbox-container {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0rem 0.125rem 0 0.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.375rem;

    input {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
      color: var(--theme-caption-color);

      &::-webkit-contacts-auto-fill-button,
      &::-webkit-credentials-auto-fill-button {
        visibility: hidden;
        display: none !important;
        pointer-events: none;
        height: 0;
        width: 0;
        margin: 0;
      }
      &:disabled {
        color: var(--theme-darker-color);
      }

      &.number::-webkit-outer-spin-button,
      &.number::-webkit-inner-spin-button {
        -webkit-appearance: none;
      }
    }

    input[type='number'] {
      -moz-appearance: textfield;
    }
  }
</style>
