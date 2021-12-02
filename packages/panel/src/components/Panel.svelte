<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import activity from '@anticrm/activity'
  import type { Doc } from '@anticrm/core'
  import type { Asset } from '@anticrm/platform'
  import type { AnyComponent, AnySvelteComponent } from '@anticrm/ui'
  import { Icon,IconClose,IconExpand, Component } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let title: string
  export let icon: Asset | AnySvelteComponent
  export let fullSize: boolean = false
  export let rightSection: AnyComponent | undefined = undefined
  export let object: Doc

  const dispatch = createEventDispatcher()
</script>

<div class="overlay" on:click={() => { dispatch('close') }}/>
<div class="dialog-container" class:fullSize>

{#if fullSize}
  <div class="leftSection">
    <div class="flex-row-center header">
      <div class="icon">
        {#if typeof (icon) === 'string'}
          <Icon {icon} size={'small'} />
        {:else}
          <svelte:component this={icon} size={'small'} />
        {/if}
      </div>
      <div class="title">{title}</div>
    </div>
    {#if $$slots.subtitle}<div class="flex-row-center subtitle"><slot name="subtitle" /></div>{/if}
    <div class="flex-col scroll-container">
      <div class="flex-col content">
        <slot />
      </div>
    </div>
  </div>
  <div class="rightSection">
    <Component is={rightSection ?? activity.component.Activity} props={{object, fullSize}}/>
  </div>
{:else}
  <div class="unionSection">
    <div class="flex-row-center header">
      <div class="icon">
        {#if typeof (icon) === 'string'}
          <Icon {icon} size={'small'} />
        {:else}
          <svelte:component this={icon} size={'small'} />
        {/if}
      </div>
      <div class="title">{title}</div>
    </div>
    {#if $$slots.subtitle}<div class="flex-row-center subtitle"><slot name="subtitle" /></div>{/if}

    <Component is={activity.component.Activity} props={{object, fullSize}}>
      <slot />
    </Component>
  </div>
{/if}

  <div class="tools">
    <div class="tool" on:click={() => { fullSize = !fullSize }}><div class="icon"><IconExpand size={'small'} /></div></div>
    <div class="tool" on:click={() => { dispatch('close') }}><div class="icon"><IconClose size={'small'} /></div></div>
  </div>
</div>

<style lang="scss">
  .dialog-container {
    overflow: hidden;
    position: fixed;
    top: 32px;
    bottom: 1.25rem;
    left: 50%;
    right: 1rem;

    display: flex;
    flex-direction: column;
    height: calc(100% - 32px - 1.25rem);
    background: var(--theme-dialog-bg);
    border-radius: 1.25rem;
    box-shadow: 0px 44px 154px rgba(0, 0, 0, .75);
    backdrop-filter: blur(15px);

    .header {
      flex-shrink: 0;
      padding: 0 2.5rem 0 2rem;
      height: 4rem;
      border-bottom: 1px solid var(--theme-dialog-divider);

      .icon { opacity: .6; }
      .title {
        flex-grow: 1;
        margin-left: .5rem;
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
        user-select: none;
      }
    }

    .subtitle {
      flex-shrink: 0;
      padding: 0 2rem;
      height: 3.5rem;
      border-bottom: 1px solid var(--theme-dialog-divider);
    }
  }

  .unionSection {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    height: max-content;    
  }

  .fullSize {
    flex-direction: row;
    left: 1rem;
  }

  .leftSection, .rightSection {
    flex-basis: 50%;
    display: flex;
    flex-direction: column;
  }
  .leftSection {
    border-right: 1px solid var(--theme-dialog-divider);
    .scroll-container {
      overflow: auto;
      margin: 2rem 2rem 1.5rem;
      .content {
        flex-shrink: 0;
        margin: .5rem .5rem 0;
      }
    }
  }
  .rightSection {
    background-color: transparent;
  }

  .tools {
    position: absolute;
    display: flex;
    top: 1.5rem;
    right: 2rem;

    .tool {
      margin-left: .75rem;
      opacity: .4;
      cursor: pointer;

      .icon {
        transform-origin: center center;
        transform: scale(.75);
      }
      &:hover { opacity: 1; }
    }
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--theme-menu-color);
    opacity: .7;
  }
</style>