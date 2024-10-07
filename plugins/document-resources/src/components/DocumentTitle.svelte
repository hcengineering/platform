<!--
//
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
//
-->
<script lang="ts">
  import { IntlString, translateCB } from '@hcengineering/platform'
  import { registerFocus, themeStore } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  export let value: string | undefined = undefined
  export let placeholder: IntlString | undefined
  export let readonly: boolean = false
  export let autoFocus = false
  export let fill = false

  let input: HTMLInputElement
  let placeholderTranslation = ''

  function updatePlaceholderTranslation (ph: IntlString | undefined): void {
    if (ph) {
      translateCB(ph, {}, $themeStore.language, (res) => {
        placeholderTranslation = res
      })
    }
  }

  onMount(() => {
    if (autoFocus) {
      input.focus()
      autoFocus = false
    }
  })

  $: updatePlaceholderTranslation(placeholder)

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

  export function focus (): void {
    input.focus()
  }
</script>

<div class="root" class:fill>
  <input
    bind:this={input}
    disabled={readonly}
    type="text"
    bind:value
    placeholder={placeholderTranslation}
    on:input
    on:change
    on:keydown
    on:keypress
    on:blur
  />
</div>

<style lang="scss">
  .root {
    font-weight: 600;

    &.fill {
      width: 100%;

      input {
        width: 100%;
      }
    }

    input {
      padding: 0;
      border: 0;
    }
  }
</style>
