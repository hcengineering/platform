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
  import type { IntlString } from '@anticrm/platform'
  import Spinner from './Spinner.svelte'
  import Label from './Label.svelte'

  export let label: IntlString
  export let primary: boolean = false
  export let disabled: boolean = false
  export let loading: boolean = false
  export let width: string | undefined = undefined
</script>

<button class="button" class:primary disabled={disabled || loading} style={width ? 'width: ' + width : ''} on:click>
  {#if loading}
    <Spinner />
  {:else}
    <Label {label} />
  {/if}
</button>

<style lang="scss">
  .button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    padding: 0 25px;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-enabled);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 12px;
    outline: none;
    user-select: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    &:hover {
      background-color: var(--theme-button-bg-hovered);
      border-color: var(--theme-button-border-hovered);
    }
    &:focus {
      background-color: var(--theme-button-bg-focused);
      border-color: var(--theme-button-border-focused);
    }
    &:active {
      background-color: var(--theme-button-bg-pressed);
      border-color: var(--theme-button-border-pressed);
    }
    &:disabled {
      background-color: var(--theme-button-bg-disabled);
      border-color: var(--theme-button-border-disabled);
      color: rgb(var(--theme-caption-color) / 40%);
      cursor: not-allowed;
    }
  }

  .primary {
    background-color: var(--primary-button-enabled);
    border-color: var(--primary-button-border);
    &:hover {
      background-color: var(--primary-button-hovered);
      border-color: var(--primary-button-border);
    }
    &:focus {
      background-color: var(--primary-button-focused);
      border-color: var(--primary-button-focused-border);
      box-shadow: 0 0 0 2px var(--primary-button-outline);
    }
    &:active {
      background-color: var(--primary-button-pressed);
      border-color: var(--primary-button-border);
      box-shadow: none;
    }
    &:disabled {
      background-color: var(--primary-button-disabled);
      border-color: var(--primary-button-border);
      color: rgb(var(--theme-caption-color) / 60%);
      cursor: not-allowed;
    }
  }
</style>
