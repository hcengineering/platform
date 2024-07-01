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
  import { afterUpdate } from 'svelte'
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import documentsRes from '../../../plugin'

  export let width: string | undefined = undefined
  export let height: string | undefined = undefined
  export let value: string | undefined = undefined
  export let placeholder: IntlString = documentsRes.string.EditDescription
  export let placeholderParam: any | undefined = undefined
  export let disabled: boolean = false

  let input: HTMLElement
  let phTranslate: string = ''

  $: translate(placeholder, placeholderParam ?? {}).then((res) => {
    phTranslate = res
  })

  afterUpdate(() => {
    if (value !== '') {
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight + 2}px`
    }
  })

  $: if (!disabled && input) {
    input.focus()
  }
</script>

<div class="textarea" style:width style:height>
  <textarea
    maxlength="240"
    rows="1"
    bind:value
    bind:this={input}
    placeholder={phTranslate}
    {disabled}
    on:keydown
    on:change
    on:keydown
    on:keypress
    on:blur
  />
</div>

<style lang="scss">
  .textarea {
    display: flex;
    flex-direction: column;
    margin-top: 0.25rem;

    textarea {
      padding: 0.62rem 1rem;
      font-family: inherit;
      font-size: inherit;
      outline: none;
      resize: none;
      overflow: hidden;
      border: 1px solid var(--theme-docs-description-border-color);
      border-radius: 0.375rem;
      &:disabled {
        padding: 0.25rem 0.5rem 0.38rem 0.5rem;
        border: 1px solid transparent;
        font-family: inherit;
        font-size: inherit;
        background-color: var(--theme-docs-frozen-description-color);
      }
    }
  }
</style>
