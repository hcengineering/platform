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
  export let checked: boolean = false
</script>

<label class="checkbox">
  <input class="chBox" type="checkbox" bind:checked={checked}>
  <svg class="checkSVG" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path class="back" d="M4,0h8c2.2,0,4,1.8,4,4v8c0,2.2-1.8,4-4,4H4c-2.2,0-4-1.8-4-4V4C0,1.8,1.8,0,4,0z"/>
    <polygon class="check" points="7.3,11.5 4,8.3 5,7.4 7.3,9.7 11.8,5.1 12.7,6.1 "/>
    <path class="border" d="M12,16H4c-2.2,0-4-1.8-4-4V4c0-2.2,1.8-4,4-4h8c2.2,0,4,1.8,4,4v8C16,14.2,14.2,16,12,16z M4,1 C2.3,1,1,2.3,1,4v8c0,1.7,1.3,3,3,3h8c1.7,0,3-1.3,3-3V4c0-1.7-1.3-3-3-3H4z"/>
  </svg>
</label>

<style lang="scss">
  .checkbox {
    display: inline-block;
    width: 16px;
    height: 16px;

    .chBox {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      border: 0;
      padding: 0;
      clip: rect(0 0 0 0);
      overflow: hidden;

      &:checked + .checkSVG {
        & > .back {
          fill: var(--theme-bg-check);
        }
        & > .check {
          visibility: visible;
          fill: var(--theme-button-bg-enabled);
        }
        & > .border {
          visibility: hidden;
        }
      }
      &:not(:disabled) + .checkSVG {
        cursor: pointer;
      }
      &:disabled + .checkSVG {
        filter: grayscale(70%);
      }
      &:focus-within + .checkSVG {
        border: 1px solid var(--primary-button-focused-border);
        box-shadow: 0 0 0 2px var(--primary-button-outline);
      }
    }
    .checkSVG {
      width: 16px;
      height: 16px;
      border-radius: 4px;

      .back {
        fill: var(--theme-button-bg-hovered);
      }
      .check {
        visibility: hidden;
        fill: var(--theme-button-bg-enabled);
      }
      .border {
        fill: var(--theme-button-border-enabled);
      }
    }
  }
</style>
