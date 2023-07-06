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
  import type { Asset } from '@hcengineering/platform'
  import type { AnySvelteComponent, ButtonSize } from '../types'
  import Icon from './Icon.svelte'

  export let icon: Asset | AnySvelteComponent | undefined
  export let size: ButtonSize = 'large'
  export let ghost: boolean = false
  export let selected: boolean = false
  export let accented: boolean = false
  export let id: string | undefined = undefined
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  {id}
  class="flex-center icon-button icon-{size}"
  class:selected
  class:ghost
  class:accented
  on:click|stopPropagation
  on:mousemove
>
  <div class="content">
    {#if $$slots.content}
      <slot name="content" />
    {:else if icon}
      <Icon {icon} size={'full'} />
    {/if}
  </div>
</div>

<style lang="scss">
  .icon-button {
    flex-shrink: 0;
    color: var(--caption-color);
    border: 1px solid var(--trans-content-20);
    border-radius: 50%;
    cursor: pointer;

    &:hover {
      border-color: var(--button-border-hover);
    }
    .content {
      pointer-events: none;
    }
    &.selected {
      background-color: var(--menu-bg-select);
    }
    &.ghost {
      background-color: var(--menu-bg-select-trans);

      &:hover {
        background-color: var(--menu-bg-select);
      }
    }
    &.accented {
      color: var(--accented-button-color);
      background-color: var(--accented-button-default);
      border-color: var(--accented-button-border);
      &:hover {
        background-color: var(--accented-button-hovered);
      }
      &:active {
        background-color: var(--accented-button-pressed);
      }
    }
  }
  .icon-inline {
    width: 1em;
    height: 1em;
  }
  .icon-small {
    width: 1.5rem;
    height: 1.5rem;
    .content {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
  .icon-medium {
    width: 1.75rem;
    height: 1.75rem;
    .content {
      width: 0.875rem;
      height: 0.875rem;
    }
  }
  .icon-large {
    width: 2rem;
    height: 2rem;
    .content {
      width: 1rem;
      height: 1rem;
    }
  }
  .icon-x-large {
    width: 2.25rem;
    height: 2.25rem;
    .content {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
</style>
