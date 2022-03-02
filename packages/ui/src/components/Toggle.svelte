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
  export let on: boolean = false
</script>

<label class="toggle">
  <input class="chBox" type="checkbox" bind:checked={on} on:change>
  <span class="toggle-switch"></span>
</label>

<style lang="scss">
  .toggle {
    display: inline-block;
    width: 3.25rem;
    min-width: 3.25rem;
    height: 1.75rem;
    line-height: 1.75rem;
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
        background-color: var(--theme-on-color);
        &:before { left: calc(3.5rem - 1.625rem); }
      }
      &:not(:disabled) + .toggle-switch { cursor: pointer; }
      &:disabled + .toggle-switch {
        filter: grayscale(70%);
        &:before { background: #eee; }
      }
      // &:focus-within + .toggle-switch { box-shadow: 0 0 0 2px var(--primary-button-outline); }
    }
    // &:active > .toggle-switch { box-shadow: 0 0 0 2px var(--primary-button-outline); }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 3.5rem;
      height: 1.75rem;
      border-radius: 3.125rem;
      background-color: var(--theme-off-color);
      transition: left .2s, background-color .2s;
      &:before {
        content: '';
        position: absolute;
        top: .125rem;
        left: .125rem;
        display: inline-block;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background: #fff;
        box-shadow: 1px 2px 7px rgba(119, 129, 142, 0.1);
        transition: .15s;
      }
    }
  }
</style>
