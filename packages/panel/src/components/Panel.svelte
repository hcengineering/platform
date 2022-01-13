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
  import { Icon, IconClose, IconExpand, IconMoreH, Component, ActionIcon } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let title: string
  export let icon: Asset | AnySvelteComponent
  export let fullSize: boolean = true
  export let rightSection: AnyComponent | undefined = undefined
  export let object: Doc

  const dispatch = createEventDispatcher()
</script>

<div class="overlay" on:click={() => { dispatch('close') }}/>
<div class="dialog-container" class:fullSize>

{#if fullSize}
  <div class="leftSection">
    <div class="flex-between header">
      <Icon {icon} size={'large'} />
      <div class="flex-grow ml-4 flex-col">
        <div class="fs-title">{title}</div>
        <div class="small-text content-dark-color">Candidate pool name</div>
      </div>
      <ActionIcon icon={IconMoreH} size={'medium'} />
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
      <Icon {icon} size={'large'} />
      <div class="flex-grow ml-4 flex-col">
        <div class="fs-title">{title}</div>
        <div class="small-text content-dark-color">Candidate pool name</div>
      </div>
      <ActionIcon icon={IconMoreH} size={'medium'} />
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
    background: var(--theme-bg-color);
    border-radius: 1.25rem;

    .header {
      flex-shrink: 0;
      padding: 0 2rem 0 2.5rem;
      min-height: 0;
      height: 4rem;
      color: var(--theme-content-accent-color);
      border-bottom: 1px solid var(--theme-zone-bg);
    }

    .subtitle {
      flex-shrink: 0;
      padding: 0 2rem;
      height: 3.5rem;
      min-height: 0;
      border-bottom: 1px solid var(--theme-zone-bg);
    }
  }

  .unionSection {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    height: max-content;   
    
    .header { padding: 0 6rem 0 2.5rem; }
  }

  .fullSize {
    flex-direction: row;
    left: 1rem;
  }

  .leftSection, .rightSection {
    flex-basis: 50%;
    width: 50%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .leftSection {
    border-right: 1px solid var(--theme-card-divider);
    .scroll-container {
      overflow: auto;
      margin: 2.5rem 2rem 1.5rem;
      .content {
        flex-shrink: 0;
        margin: .5rem .5rem 0;
      }
    }
  }
  // .rightSection {
  //   background-color: transparent;
  // }

  .tools {
    position: absolute;
    display: flex;
    top: 1.5rem;
    right: 2rem;

    .tool {
      margin-left: 1rem;
      color: var(--theme-content-accent-color);
      cursor: pointer;
      &:hover { color: var(--theme-caption-color); }
    }
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    opacity: .5;
  }
</style>