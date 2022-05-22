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
  import { translate } from '@anticrm/platform'
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'
  import { registerFocus } from '../focus'
  import plugin from '../plugin'
  import type { AnySvelteComponent, EditStyle } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let label: IntlString | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let maxWidth: string | undefined = undefined
  export let value: string | number | undefined = undefined
  export let placeholder: IntlString = plugin.string.EditBoxPlaceholder
  export let placeholderParam: any | undefined = undefined
  export let format: 'text' | 'password' | 'number' = 'text'
  export let kind: EditStyle = 'editbox'
  export let focus: boolean = false

  const dispatch = createEventDispatcher()

  let text: HTMLElement
  let input: HTMLInputElement
  let style: string
  let phTraslate: string = ''

  $: style = maxWidth ? `max-width: ${maxWidth};` : ''
  $: translate(placeholder, placeholderParam ?? {}).then((res) => {
    phTraslate = res
  })

  function computeSize (t: HTMLInputElement | EventTarget | null) {
    const target = t as HTMLInputElement
    const value = target.value
    text.innerHTML = (value === '' ? phTraslate : value).replaceAll(' ', '&nbsp;')
    if (format === 'number') {
      target.style.width = maxWidth ?? '5rem'
    } else {
      target.style.width = text.clientWidth + 'px'
    }
    dispatch('input')
  }

  onMount(() => {
    if (focus) {
      input.focus()
      focus = false
    }
    computeSize(input)
  })

  afterUpdate(() => {
    computeSize(input)
  })

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      input?.focus()
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
</script>

<div
  class="editbox-container"
  on:click={() => {
    input.focus()
  }}
>
  <!-- {focusIndex} -->
  <div class="hidden-text {kind}" bind:this={text} />
  {#if label}<div class="label"><Label {label} /></div>{/if}
  <div class="{kind} flex-row-center clear-mins">
    {#if icon}
      <div class="content-trans-color mr-1">
        <Icon {icon} size={'small'} />
      </div>
    {/if}
    {#if format === 'password'}
      <input
        bind:this={input}
        type="passsword"
        bind:value
        placeholder={phTraslate}
        {style}
        on:input={(ev) => ev.target && computeSize(ev.target)}
        on:change
        on:keydown
        on:keypress
      />
    {:else if format === 'number'}
      <input
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
      />
    {:else}
      <input
        bind:this={input}
        type="text"
        bind:value
        placeholder={phTraslate}
        {style}
        on:input={(ev) => ev.target && computeSize(ev.target)}
        on:change
        on:keydown
        on:keypress
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .editbox-container {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;

    .label {
      margin-bottom: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--theme-content-accent-color);
      pointer-events: none;
      user-select: none;
    }

    .large-style {
      font-weight: 500;
      font-size: 1.125rem;
    }
    .small-style {
      font-weight: 400;
      font-size: 0.75rem;
    }
    .search-style {
      font-weight: 400;
      padding: 0.625rem 0.75rem;
    }

    input {
      margin: 0;
      padding: 0;
      min-width: 0;
      color: var(--caption-color);
      border: none;
      border-radius: 2px;

      &::-webkit-contacts-auto-fill-button,
      &::-webkit-credentials-auto-fill-button {
        visibility: hidden;
        display: none !important;
        pointer-events: none;
        height: 0;
        width: 0;
        margin: 0;
      }
      &.number::-webkit-outer-spin-button,
      &.number::-webkit-inner-spin-button {
        -webkit-appearance: none;
      }
    }
  }
</style>
