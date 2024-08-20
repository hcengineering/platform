<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  export let value: string | undefined = undefined
  export let id: string | undefined = undefined
  export let name: string | undefined = undefined
  export let size: 'small' | 'medium' = 'small'
  export let kind: 'primary' | 'secondary' = 'primary'
</script>

<div class="container {kind}">
  <input
    class={size}
    type="text"
    {id}
    {name}
    bind:value
    on:blur
    on:change
    on:keyup
    on:input
    inputmode="numeric"
    autocomplete="off"
    placeholder=""
    spellcheck="false"
    autocapitalize="on"
  />
</div>

<style lang="scss">
  .container {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);

    &.primary {
      caret-color: var(--theme-content-color);
    }

    &.secondary {
      caret-color: var(--theme-caret-color);
    }

    &:focus-within {
      border-color: var(--theme-list-divider-color);
      background-color: var(--theme-button-focused);
    }

    input {
      text-align: center;
      margin: 0;
      padding: 0;
      background-color: transparent;
      border: none;
      border-radius: 0.75rem;

      &.small {
        width: 1.5rem;
        height: 2rem;
        font-size: 1rem;
      }

      &.medium {
        width: 3.125rem;
        height: 4.375rem;
        font-size: 2rem;
      }
    }
  }
</style>
