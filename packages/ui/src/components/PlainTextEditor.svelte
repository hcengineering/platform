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
  import { translateCB } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/theme'
  import { afterUpdate, onMount } from 'svelte'

  import ui from '../plugin'
  import { DelayedCaller } from '../utils'

  export let value: string | undefined = undefined
  export let placeholder: IntlString = ui.string.TypeHere
  export let placeholderParam: any | undefined = undefined
  export let disabled: boolean = false

  let input: HTMLTextAreaElement
  let phTranslate: string = ''

  $: translateCB(placeholder, placeholderParam ?? {}, $themeStore.language, (res) => {
    phTranslate = res
  })

  onMount(() => {
    const throttle = new DelayedCaller(50)
    const observer = new ResizeObserver(() => {
      throttle.call(adjustHeight)
    })
    observer.observe(input)

    return () => {
      observer.disconnect()
    }
  })

  afterUpdate(adjustHeight)

  function adjustHeight (): void {
    if (input == null) {
      return
    }

    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight + 2}px`
  }

  export function focus (): void {
    input.focus()
  }
</script>

<textarea
  class="root"
  bind:value
  bind:this={input}
  {disabled}
  placeholder={phTranslate}
  on:keydown
  on:change
  on:keydown
  on:keypress
  on:blur
/>

<style lang="scss">
  .root {
    width: 100%;
    padding: 0.375rem 0.75rem;
    min-height: 3.25rem;
    font-family: inherit;
    font-size: inherit;
    line-height: 1.25rem;
    color: var(--theme-text-primary-color);
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-refinput-border);
    border-radius: 0.375rem;
    outline: none;
    resize: none;

    &:focus {
      border-color: var(--primary-button-default);
    }

    &::placeholder {
      color: var(--theme-text-placeholder-color);
    }
  }
</style>
