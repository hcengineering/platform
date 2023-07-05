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
  import Label from './Label.svelte'

  export let label: IntlString | undefined = undefined
  export let on: boolean = false
  export let disabled: boolean = false
</script>

<div class="flex-row-center">
  <label class="mini-toggle">
    <input class="chBox" type="checkbox" bind:checked={on} on:change {disabled} />
    <span class="toggle-switch" />
  </label>
  {#if label}
    <span
      class="mini-toggle-label"
      on:click={() => {
        if (!disabled) {
          on = !on
        }
      }}
    >
      <Label {label} />
    </span>
  {/if}
</div>

<style lang="scss">
  .mini-toggle {
    display: inline-block;
    width: 22px;
    height: 14px;
    min-width: 22px;
    // line-height: 1.75rem;
    vertical-align: middle;
    font-size: inherit;
    user-select: none;
    .chBox {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      border: 0;
      padding: 0;
      clip: rect(0 0 0 0);
      overflow: hidden;

      &:checked + .toggle-switch {
        background-color: var(--theme-toggle-on-bg-color);
        &:hover {
          background-color: var(--theme-toggle-on-bg-hover);
        }
        &:before {
          left: 9px;
          background: var(--theme-toggle-on-sw-color);
        }
      }
      &:not(:disabled) + .toggle-switch {
        cursor: pointer;
      }
      &:disabled + .toggle-switch {
        filter: grayscale(70%);
        &:before {
          background: #eee;
        }
      }
      // &:focus-within + .toggle-switch { box-shadow: 0 0 0 2px var(--accented-button-outline); }
    }
    // &:active > .toggle-switch { box-shadow: 0 0 0 2px var(--accented-button-outline); }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 22px;
      height: 14px;
      border-radius: 4.5rem;
      background-color: var(--theme-toggle-bg-color);
      transition: left 0.2s, background-color 0.2s;
      &:before {
        content: '';
        position: absolute;
        top: 2px;
        left: 3px;
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--theme-toggle-sw-color);
        // box-shadow: 1px 2px 7px rgba(119, 129, 142, 0.1);
        transition: all 0.1s ease-out;
      }
      &:hover {
        background-color: var(--theme-toggle-bg-hover);
      }
    }

    &-label {
      margin-left: 0.375rem;
      font-size: 0.75rem;
      color: var(--content-color);
      cursor: pointer;
    }
  }
</style>
