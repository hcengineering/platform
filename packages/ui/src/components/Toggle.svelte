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
  import { createEventDispatcher } from 'svelte'

  export let on: boolean = false
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()
</script>

<label class="toggle">
  <input
    class="chBox"
    type="checkbox"
    {disabled}
    bind:checked={on}
    on:change={(e) => {
      dispatch('change', on)
    }}
  />
  <span class="toggle-switch" />
</label>

<style lang="scss">
  .toggle {
    display: inline-block;
    width: 2.25rem;
    min-width: 2.25rem;
    height: 1.25rem;
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
          left: 1.125rem;
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
      width: 2.25rem;
      height: 1.25rem;
      border-radius: 1.25rem;
      background-color: var(--theme-toggle-bg-color);
      transition: left 0.2s, background-color 0.2s;
      &:before {
        content: '';
        position: absolute;
        top: 0.125rem;
        left: 0.125rem;
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        background: var(--theme-toggle-sw-color);
        box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.15), 0px 3px 1px rgba(0, 0, 0, 0.06);
        transition: 0.15s;
      }
      &:hover {
        background-color: var(--theme-toggle-bg-hover);
      }
    }
  }
</style>
