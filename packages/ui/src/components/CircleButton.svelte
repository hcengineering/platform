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
  import type { Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '../types'
  import Icon from './Icon.svelte'

  export let icon: Asset | AnySvelteComponent
  export let size: 'small' | 'medium' | 'large' | 'x-large' = 'large'
  export let transparent: boolean = false
  export let selected: boolean = false
  export let primary: boolean = false
</script>

<div class="icon-button icon-{size}" class:selected class:transparent class:primary on:click on:mousemove>
  <div class="content">
    {#if typeof (icon) === 'string'}
      <Icon {icon} size={'small'} />
    {:else}
      <svelte:component this={icon} size={'small'} />
    {/if}
  </div>
</div>

<style lang="scss">
  .icon-button {
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid var(--theme-card-divider);
    border-radius: 50%;
    backdrop-filter: blur(3px);
    cursor: pointer;

    .content {
      transform-origin: center center;
      transform: scale(.75);
      pointer-events: none;
    }
    &:hover {
      color: var(--theme-caption-color);
      border-color: var(--theme-bg-focused-border);
    }
    &:active {
      color: var(--theme-content-accent-color);
      background-color: var(--theme-bg-accent-color);
    }
    &.selected { background-color: var(--theme-button-bg-hovered); }
    &.transparent { background-color: rgba(31, 31, 37, .3); }
    &.primary {
      color: var(--theme-caption-color);
      background-color: var(--primary-button-enabled);
      border-color: var(--primary-button-border);
      &:hover { background-color: var(--primary-button-hovered); }
      &:active { background-color: var(--primary-button-pressed); }
    }
  }
  .icon-small {
    width: 1.5rem;
    height: 1.5rem;
    .content { transform: scale(.6); }
  }
  .icon-medium {
    width: 1.75rem;
    height: 1.75rem;
  }
  .icon-large {
    width: 2rem;
    height: 2rem;
    .content { transform: scale(.9); }
  }
  .icon-x-large {
    width: 2.25rem;
    height: 2.25rem;
    .content { transform: none; }
  }
</style>
