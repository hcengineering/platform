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

  export let checked: boolean = false
  export let symbol: 'check' | 'minus' = 'check'
  export let size: 'small' | 'medium' | 'large' = 'small'
  export let circle: boolean = false
  export let kind: 'default' | 'accented' | 'positive' = 'default'
  export let readonly = false

  const dispatch = createEventDispatcher()

  const handleValueChanged = (event: Event) => {
    if (readonly) {
      return
    }
    const eventTarget = event.target as HTMLInputElement
    const isChecked = eventTarget.checked

    dispatch('value', isChecked)
  }
</script>

<label
  class="checkbox {size}"
  class:circle
  class:accented={kind === 'accented'}
  class:positive={kind === 'positive'}
  class:readonly
  class:checked
  on:click|stopPropagation
>
  <input class="chBox" disabled={readonly} type="checkbox" bind:checked on:change={handleValueChanged} />
  <svg class="checkSVG" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    {#if checked}
      {#if symbol === 'minus'}
        <rect
          class="check"
          class:accented={kind === 'accented'}
          class:positive={kind === 'positive'}
          x="4"
          y="7.4"
          width="8"
          height="1.2"
        />
      {:else}
        <polygon
          class="check"
          class:accented={kind === 'accented'}
          class:positive={kind === 'positive'}
          points="7.3,11.5 4,8.3 5,7.4 7.3,9.7 11.8,5.1 12.7,6.1 "
        />
      {/if}
    {/if}
  </svg>
</label>

<style lang="scss">
  .checkbox {
    flex-shrink: 0;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    background-color: var(--theme-button-hovered);
    border: 1px solid var(--theme-checkbox-border);
    border-radius: 0.25rem;

    &.small {
      width: 0.875rem;
      height: 0.875rem;
    }
    &.medium {
      width: 1rem;
      height: 1rem;
    }
    &.large {
      width: 1.25rem;
      height: 1.25rem;
    }
    &.circle {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
    }
    &.checked {
      background-color: var(--theme-checkbox-bg-color);
    }
    &.accented.checked {
      background-color: var(--accented-button-default);
      border-color: transparent;
    }
    &.positive.checked {
      background-color: var(--positive-button-default);
      border-color: transparent;
    }
    &.readonly.checked {
      background-color: var(--theme-checkbox-disabled);
    }

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
        & .check {
          visibility: visible;
          fill: var(--theme-checkbox-color);
          &.accented {
            fill: var(--accented-button-color);
          }
          &.positive {
            fill: var(--accented-button-color);
          }
        }
      }
      &:not(:disabled) + .checkSVG {
        cursor: pointer;
      }
      &:disabled + .checkSVG .check {
        fill: var(--theme-checkbox-disabled);
      }
    }
    .checkSVG {
      width: 0.875rem;
      height: 0.875rem;

      .check {
        visibility: hidden;
        fill: var(--theme-checkbox-color);
      }
    }
  }
</style>
