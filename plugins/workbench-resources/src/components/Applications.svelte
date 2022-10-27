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
  import type { Ref } from '@hcengineering/core'
  import type { Application } from '@hcengineering/workbench'
  import { createEventDispatcher } from 'svelte'
  import AppItem from './AppItem.svelte'
  import { Scroller } from '@hcengineering/ui'

  export let active: Ref<Application> | undefined
  export let apps: Application[] = []
  export let direction: 'vertical' | 'horizontal' = 'vertical'

  const dispatch = createEventDispatcher()

  let shown: boolean = false
</script>

<div class="flex-row-center clear-mins apps-{direction} relative">
  <Scroller
    invertScroll
    padding={direction === 'horizontal' ? '.25rem 0' : '0 .5rem'}
    horizontal={direction === 'horizontal'}
    contentDirection={direction}
  >
    <div class="apps-space-{direction}" />
    {#each apps.filter((it) => (shown ? true : !it.hidden)) as app}
      <AppItem
        selected={app._id === active}
        icon={app.icon}
        label={app.label}
        bind:hidden={app.hidden}
        editable={shown}
        action={async () => {
          dispatch('active', app)
        }}
        notify={false}
      />
    {/each}
    <div class="apps-space-{direction}" />
  </Scroller>
  <div class="thinButton {direction}" class:shown on:click={() => (shown = !shown)} />
</div>

<style lang="scss">
  .apps-horizontal {
    margin: 0 1rem;
    padding: 0 0.25rem;
    min-height: 4rem;
  }
  .apps-vertical {
    margin: 1rem 0;
    padding: 0.25rem 0;
    min-width: 4rem;
  }
  .apps-space {
    &-vertical {
      min-height: 0.25rem;
      height: 0.25rem;
    }
    &-horizontal {
      min-width: 0.25rem;
      width: 0.25rem;
    }
  }

  .thinButton {
    position: absolute;
    transform-origin: center center;
    background-color: var(--button-bg-color);
    border: 1px solid var(--button-border-color);
    border-radius: 0.125rem;
    box-shadow: var(--button-shadow);
    opacity: 0.2;
    // z-index: 1;
    cursor: pointer;

    transition-property: opacity, transform;
    transition-timing-function: var(--timing-main);
    transition-duration: 0.1s;

    &.vertical {
      top: calc(100% + 0.25rem);
      left: 50%;
      height: 0.375rem;
      width: 2.5rem;
      transform: translateX(-50%) scale(0.6);
      &:hover {
        transform: translateX(-50%) scale(0.8);
      }
    }
    &.horizontal {
      left: calc(100% + 0.25rem);
      top: 50%;
      width: 0.375rem;
      height: 2.5rem;
      transform: translateY(-50%) scale(0.6);
      &:hover {
        transform: translateY(-50%) scale(0.8);
      }
      &.shown {
        transform: translateY(-50%) scale(0.9);
        &:hover {
          transform: translateY(-50%) scale(1);
        }
      }
    }

    &:hover {
      transform: translateX(-50%) scale(0.8);
      background-color: var(--button-bg-hover);
      border-color: var(--button-border-hover);
      opacity: 0.9;
    }

    &.shown {
      transform: translateX(-50%) scale(0.9);
      opacity: 0.8;

      &:hover {
        transform: translateX(-50%) scale(1);
        background-color: var(--button-bg-hover);
        border-color: var(--button-border-hover);
        opacity: 1;
      }
    }
  }
</style>
