<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { IntlString, translate } from '@hcengineering/platform'
  import { onMount } from 'svelte'
  import { themeStore } from '@hcengineering/ui'

  export let value: string | undefined = undefined
  export let placeholder: IntlString | undefined
  export let focus = false
  export let fill = false

  let input: HTMLInputElement
  let placeholderTranslation = ''

  async function updatePlaceholderTranslation (ph: IntlString | undefined) {
    if (ph) {
      placeholderTranslation = await translate(ph, {}, $themeStore.language)
    }
  }

  onMount(() => {
    if (focus) {
      input.focus()
      focus = false
    }
  })

  $: updatePlaceholderTranslation(placeholder)
</script>

<div class="root" class:fill>
  <input
    bind:this={input}
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
    &.fill {
      width: 100%;

      input {
        width: 100%;
      }
    }

    input {
      padding: 0.25rem 0.5rem;
      background-color: var(--theme-bg-dark-color);
      border: 1px solid transparent;
      border-radius: 0.25rem;

      &:focus {
        border: 1px solid var(--primary-edit-border-color);
      }
    }
  }
</style>
