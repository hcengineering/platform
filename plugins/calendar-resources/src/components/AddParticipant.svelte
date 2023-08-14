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
  import contact, { Person } from '@hcengineering/contact'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { themeStore } from '@hcengineering/theme'
  import { registerFocus, resizeObserver } from '@hcengineering/ui'
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'

  export let maxWidth: string | undefined = undefined
  export let value: string | number | undefined = undefined
  export let placeholder: IntlString
  export let autoFocus: boolean = false
  export let select: boolean = false
  export let focusable: boolean = false
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()

  let text: HTMLElement
  let input: HTMLInputElement
  let style: string
  let phTraslate: string = ''
  let parentWidth: number | undefined

  $: style = `max-width: ${maxWidth || (parentWidth ? `${parentWidth}px` : 'max-content')};`
  $: translate(placeholder, {}, $themeStore.language).then((res) => {
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
    target.style.width = Math.max(text.clientWidth, 50) + 'px'
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

  const query = createQuery()

  let persons: Person[] = []

  $: query.query(contact.class.Person, {}, (res) => {
    persons = res
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="editbox-container"
  class:w-full={focusable}
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
  </div>
</div>

<style lang="scss">
  .editbox-container {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;

    .focusable {
      margin: 0 -0.75rem;
      padding: 0.625rem 0.75rem;
      width: calc(100% + 1.5rem);
      border-radius: 0.25rem;
      transition: border-color 0.15s ease-in-out;

      &:focus-within {
        box-shadow: 0 0 0 1px var(--theme-editbox-focus-border);
      }
    }

    input {
      margin: 0;
      padding: 0;
      min-width: 0;
      color: var(--theme-caption-color);
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
    }
  }
</style>
