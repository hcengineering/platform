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
  <input class="chBox" type="checkbox" bind:checked={on}>
  <span class="toggle-switch"></span>
</label>

<style lang="scss">
  .toggle {
    display: inline-block;
    height: 28px;
    line-height: 28px;
    vertical-align: middle;
    font-size: 14px;
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
        &:before {
          transform: translateX(22px);
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
      &:focus-within + .toggle-switch {
        border: 1px solid var(--primary-button-focused-border);
        box-shadow: 0 0 0 2px var(--primary-button-outline);
      }
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      box-sizing: border-box;
      width: 54px;
      height: 30px;
      border-radius: 50px;
      vertical-align: top;
      background-color: var(--theme-off-color);
      border: 1px solid transparent;
      transition: .2s;
      &:before {
        content: '';
        position: absolute;
        top: 2px;
        left: 3px;
        display: inline-block;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 1px 2px 7px rgba(119, 129, 142, 0.1);
        transition: .15s;
      }
    }
  }
</style>
