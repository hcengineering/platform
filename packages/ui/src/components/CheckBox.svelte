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
  export let symbol: 'check' | 'minus' = 'check'
  export let circle: boolean = false
  export let primary: boolean = false
</script>

<label class="checkbox" class:circle class:primary class:checked>
  <input class="chBox" type="checkbox" bind:checked on:change />
  <svg class="checkSVG" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    {#if !circle}
      <path
        class="back"
        class:primary
        d="M4,0h8c2.2,0,4,1.8,4,4v8c0,2.2-1.8,4-4,4H4c-2.2,0-4-1.8-4-4V4C0,1.8,1.8,0,4,0z"
      />
    {/if}
    {#if symbol === 'minus'}
      <rect class="check" class:primary x="4" y="7.4" width="8" height="1.2" />
    {:else}
      <polygon class="check" class:primary points="7.3,11.5 4,8.3 5,7.4 7.3,9.7 11.8,5.1 12.7,6.1 " />
    {/if}
  </svg>
</label>

<style lang="scss">
  .checkbox {
    flex-shrink: 0;

    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 1rem;
    height: 1rem;

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
        & .back {
          fill: var(--theme-bg-check);
          &.primary {
            fill: var(--primary-button-enabled);
          }
        }
        & .check {
          visibility: visible;
          fill: var(--theme-button-bg-enabled);
          &.primary {
            fill: var(--primary-button-color);
          }
        }
      }
      &:not(:disabled) + .checkSVG {
        cursor: pointer;
      }
      &:disabled + .checkSVG {
        filter: grayscale(70%);
      }
    }
    .checkSVG {
      width: 1rem;
      height: 1rem;
      border-radius: 0.25rem;

      .back {
        fill: var(--theme-button-bg-hovered);
      }
      .check {
        visibility: hidden;
        fill: var(--theme-button-bg-enabled);
      }
    }
  }

  .circle {
    width: 1.25rem;
    height: 1.25rem;
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-bg-focused-color);
    border-radius: 50%;

    &.checked {
      background-color: var(--theme-bg-check);
    }
    &.primary {
      border-color: transparent;
      &.checked {
        background-color: var(--primary-button-enabled);
      }
    }
  }
</style>
