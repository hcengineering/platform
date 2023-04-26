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
  import type { IntlString, Asset } from '@hcengineering/platform'
  import type { AnySvelteComponent } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Icon, tooltip } from '@hcengineering/ui'
  import PreviewOn from './icons/PreviewOn.svelte'
  import PreviewOff from './icons/PreviewOff.svelte'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent
  export let selected: boolean
  export let notify: boolean = false
  export let hidden: boolean = false
  export let editable: 'vertical' | 'horizontal' | false = false

  const dispatch = createEventDispatcher()
</script>

<button
  class="app{editable ? ' ' + editable : ''}"
  class:selected
  class:hidden
  id={'app-' + label}
  use:tooltip={{ label }}
>
  <div class="flex-center icon-container" class:noty={notify}>
    <Icon {icon} size={'large'} />
  </div>
  {#if notify}<div class="marker" />{/if}
  {#if editable}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="starButton"
      class:hidden
      on:click|preventDefault|stopPropagation={() => {
        hidden = !hidden
        dispatch('visible', !hidden)
      }}
    >
      {#if hidden}
        <PreviewOff size={'small'} />
      {:else}
        <PreviewOn size={'small'} />
      {/if}
    </div>
  {/if}
</button>

<style lang="scss">
  .app {
    position: relative;
    padding: 0;
    width: 2.5rem;
    height: 2.5rem;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    cursor: pointer;
    outline: none;

    &.horizontal {
      margin: 0 0.125rem;
    }
    &.vertical {
      margin: 0.125rem 0;
    }
    .icon-container {
      width: 1.5rem;
      height: 1.5rem;
      color: var(--theme-navpanel-icons-color);

      .normal-font &.noty {
        clip-path: url(#notify-normal);
      }
      .small-font &.noty {
        clip-path: url(#notify-small);
      }
    }

    &:hover .icon-container {
      color: var(--theme-caption-color);
    }
    &:focus {
      box-shadow: 0 0 0 2px var(--primary-button-focused-border);
      .icon-container {
        color: var(--theme-caption-color);
      }
    }

    &.selected {
      background-color: var(--theme-button-enabled);
      border: 1px solid var(--theme-button-border);
      .icon-container {
        color: var(--theme-caption-color);
      }
    }

    &.hidden {
      border: 1px dashed var(--theme-dark-color);
      .icon-container {
        color: var(--theme-dark-color);
      }
      &:hover .icon-container {
        color: var(--theme-content-color);
      }
    }
  }

  .marker {
    position: absolute;
    top: 1.25rem;
    right: 0.5rem;
    width: 0.425rem;
    height: 0.425rem;
    border-radius: 50%;
    background-color: var(--highlight-red);
  }

  .starButton {
    position: absolute;
    right: 0.25rem;
    bottom: 0.25rem;
    height: 1rem;
    width: 1rem;
    color: var(--activity-status-busy);
    transform-origin: center center;
    transform: scale(1);
    opacity: 0.8;
    z-index: 10000;
    filter: drop-shadow(0 0 1px #000);
    cursor: pointer;

    &:hover {
      transform: scale(1.2);
      opacity: 1;
    }
    &.hidden {
      color: var(--warning-color);
      transform: scale(0.7);
      opacity: 0.5;

      &:hover {
        transform: scale(0.9);
        opacity: 0.8;
      }
    }
  }
</style>
