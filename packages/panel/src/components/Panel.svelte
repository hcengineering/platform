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
  import type { Asset, IntlString } from '@anticrm/platform'
  import type { AnyComponent, AnySvelteComponent } from '@anticrm/ui'
  import { Icon, ActionIcon, Component, IconSearch, IconClose, IconMoreH } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let title: string
  export let icon: Asset | AnySvelteComponent
  export let rightSection: AnyComponent | undefined
  export let object: Doc

  const dispatch = createEventDispatcher()

  const getIntlString = (str: string): IntlString => str as IntlString
</script>

<!-- <div class="overlay" on:click={() => { dispatch('close') }}/> -->
<div class="panel-container">
  <div class="leftSection">

    <div class="flex-between header">
      <div class="icon">
        {#if typeof (icon) === 'string'}
          <Icon {icon} size={'large'} />
        {:else}
          <svelte:component this={icon} size={'small'} />
        {/if}
      </div>
      <div class="title">{title}</div>
      <ActionIcon label={getIntlString('More...')} icon={IconMoreH} size={'medium'} action={async () => {}} />
    </div>

    {#if $$slots.subtitle}<div class="flex-row-center subtitle"><slot name="subtitle" /></div>{/if}

    <div class="flex-col scroll-container">
      <div class="flex-col content">
        <slot />
      </div>
    </div>
  </div>

  <div class="rightSection">
    <Component is={rightSection ?? activity.component.Activity} props={{object}}/>
  </div>

  <div class="flex-row-center tools">
    <div class="ml-4"><ActionIcon icon={IconSearch} size={'small'} label={getIntlString('Search')} action={async () => {}} /></div>
    <div class="ml-4"><ActionIcon icon={IconClose} size={'small'} label={getIntlString('Close')} action={async () => { dispatch('close') }} /></div>
  </div>
</div>

<style lang="scss">
  .panel-container {
    overflow: hidden;
    // position: fixed;
    // top: 32px;
    // bottom: 1.25rem;
    // left: 5rem;
    // right: 1.25rem;

    display: flex;
    flex-direction: row;
    height: 100%;
    // height: calc(100% - 32px - 1.25rem);
    background: var(--theme-panel-bg);
    border-radius: .75rem;
    filter: drop-shadow(-4px 0px 4px rgba(0, 0, 0, .25));

    .header {
      flex-shrink: 0;
      padding: 0 2.5rem;
      height: 4.5rem;
      border-bottom: 1px solid var(--theme-dialog-divider);

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
      border-bottom: 1px solid var(--theme-bg-accent-hover);
    }
  }

  .leftSection, .rightSection {
    flex-basis: 50%;
    display: flex;
    flex-direction: column;
  }
  .leftSection {
    border-right: 1px solid var(--theme-bg-accent-hover);
    .scroll-container {
      overflow: auto;
      margin: 2rem 2rem 1.5rem;
      .content {
        flex-shrink: 0;
        margin: .5rem .5rem 0;
      }
    }
  }

  .tools {
    position: absolute;
    display: flex;
    top: 1.75rem;
    right: 2rem;
    color: var(--theme-content-accent-color);
  }

  // .overlay {
  //   position: fixed;
  //   top: 0;
  //   left: 0;
  //   width: 100%;
  //   height: 100%;
  //   background-color: rgba(0, 0, 0, .4);
  // }
</style>