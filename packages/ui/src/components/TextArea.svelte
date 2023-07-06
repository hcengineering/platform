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
  import plugin from '../plugin'
  import Label from './Label.svelte'
  import { themeStore } from '@hcengineering/theme'

  export let label: IntlString | undefined = undefined
  export let width: string | undefined = undefined
  export let height: string | undefined = undefined
  export let value: string | undefined = undefined
  export let placeholder: IntlString = plugin.string.EditBoxPlaceholder
  export let placeholderParam: any | undefined = undefined
  export let noFocusBorder: boolean = false
  export let disabled: boolean = false

  let input: HTMLTextAreaElement
  let phTraslate: string = ''

  $: translate(placeholder, placeholderParam ?? {}, $themeStore.language).then((res) => {
    phTraslate = res
  })

  export function focus () {
    input.focus()
  }
</script>

<div class="textarea" class:no-focus-border={noFocusBorder} style:width style:height>
  {#if label}<div class="label"><Label {label} /></div>{/if}
  <textarea
    bind:value
    bind:this={input}
    {disabled}
    placeholder={phTraslate}
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
    min-width: 3.125rem;
    min-height: 2.25rem;

    .label {
      margin-bottom: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--accent-color);
      pointer-events: none;
      user-select: none;
    }

    textarea {
      width: auto;
      min-height: 4.5rem;
      margin: -4px;
      padding: 2px;
      font-family: inherit;
      font-size: inherit;
      line-height: 150%;
      color: var(--caption-color);
      background-color: transparent;
      border: 2px solid transparent;
      border-radius: 0.125rem;
      outline: none;
      overflow-y: scroll;
      resize: none;

      &:focus {
        border-color: var(--accented-button-default);
      }
      &::placeholder {
        color: var(--dark-color);
      }
    }
  }

  .no-focus-border {
    textarea {
      font-weight: 500;
      font-size: 1rem;

      &:focus {
        border-color: transparent;
      }
    }
  }
</style>
