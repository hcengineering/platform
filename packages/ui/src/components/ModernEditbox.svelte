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
  import { IntlString, translate } from '@hcengineering/platform'
  import Label from './Label.svelte'
  import { themeStore } from '..'

  export let label: IntlString
  export let value: string | undefined = undefined
  export let kind: 'default' | 'ghost' = 'default'
  export let size: 'small' | 'large' = 'small'
  export let disabled: boolean = false
  export let error: boolean = false
  export let password: boolean = false
  export let limit: number = 0

  $: maxlength = limit === 0 ? null : limit

  let placeholderStr: string = ''
  $: ph = translate(label, {}, $themeStore.language).then((r) => {
    placeholderStr = r
  })
  $: labeled = kind === 'default' && size === 'large'
  $: placeholder = labeled ? ' ' : placeholderStr
</script>

<label class="editbox-wrapper {kind} {size}" class:error class:disabled>
  {#if password}
    <input
      type="password"
      class="font-regular-14"
      class:labeled
      bind:value
      autocomplete="off"
      {placeholder}
      spellcheck="false"
      {disabled}
      {maxlength}
      on:blur
      on:change
      on:keyup
      on:input
    />
  {:else}
    <input
      type="text"
      class="font-regular-14"
      class:labeled
      bind:value
      autocomplete="off"
      {placeholder}
      spellcheck="false"
      {disabled}
      {maxlength}
      on:blur
      on:change
      on:keyup
      on:input
    />
  {/if}
  {#if labeled}<div class="font-regular-14 label"><Label {label} /></div>{/if}
</label>

<style lang="scss">
  .editbox-wrapper {
    display: flex;
    align-items: center;
    min-width: 0;
    border-radius: var(--medium-BorderRadius);

    &.default {
      background-color: var(--input-BackgroundColor);
      box-shadow: inset 0 0 0 1px var(--input-BorderColor);

      &.small {
        padding: var(--spacing-1) var(--spacing-1_5);
        height: var(--spacing-4);
      }
      &.large {
        position: relative;
        padding: 0 var(--spacing-2);
        height: var(--spacing-6_5);
      }
    }
    &.ghost {
      &.small {
        padding: var(--spacing-1_5) var(--spacing-2);
        height: var(--spacing-5);
      }
      &.large {
        padding: var(--spacing-1) var(--spacing-2);
        height: var(--spacing-6);

        input {
          font-weight: 500;
          font-size: 1.5rem;
        }
      }
    }

    &.error {
      box-shadow: inset 0 0 0 1px var(--input-error-BorderColor);
    }
    &:not(.disabled) {
      cursor: text;

      &.default {
        input::placeholder {
          color: var(--input-LabelColor);
        }
        &:active,
        &:focus-within {
          background-color: var(--input-BackgroundColor);
          outline: 2px solid var(--global-focus-BorderColor);
          outline-offset: 2px;
        }
        &:hover {
          background-color: var(--input-hover-BackgroundColor);
        }
      }
      &.ghost input::placeholder {
        color: var(--input-PlaceholderColor);
      }
      &:hover input:not(:focus)::placeholder {
        color: var(--input-hover-PlaceholderColor);
      }
      input:focus::placeholder {
        color: var(--input-focus-PlaceholderColor);
      }
    }
    &.disabled {
      &,
      input {
        cursor: not-allowed;
      }
      input::placeholder {
        color: var(--input-PlaceholderColor);
      }
      &.default {
        background-color: transparent;
      }
      &.ghost {
        box-shadow: inset 0 0 0 1px var(--input-BorderColor);
      }
    }

    input {
      margin: 0;
      padding: 0;
      width: 100%;
      color: var(--input-TextColor);
      caret-color: var(--global-focus-BorderColor);
      background-color: transparent;
      border: none;
      outline: none;
      appearance: none;

      &.labeled {
        height: 100%;
        padding-top: var(--spacing-3_5);
        padding-bottom: var(--spacing-1_5);
      }
    }

    .label {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      padding: var(--spacing-2_5) var(--spacing-2);
      font-size: 0.875rem;
      color: var(--input-LabelColor);
      transition:
        padding-top 0.2s,
        font-size 0.2s;
      pointer-events: none;
      user-select: none;
    }
    input:focus + .label,
    input:not(:placeholder-shown) + .label {
      padding-top: var(--spacing-1_5);
      font-size: 0.75rem;
      color: var(--input-filled-LabelColor);
    }
  }
</style>
