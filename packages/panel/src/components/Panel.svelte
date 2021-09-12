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
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { ReferenceInput } from '@anticrm/text-editor'
  import { IconClose, IconExpand, IconActivity, ScrollBox, Button, Label, Icon } from '@anticrm/ui'

  import { createEventDispatcher } from 'svelte'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent
  export let okAction: () => void
  export let fullSize: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="overlay"/>
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
      <div class="title"><Label {label} /></div>
    </div>
    {#if $$slots.subtitle}<div class="subtitle"><slot name="subtitle" /></div>{/if}
    <div class="content"><ScrollBox vertical stretch><slot /></ScrollBox></div>
  </div>
  <div class="rightSection">
    <div class="flex-row-center header">
      <div class="icon"><IconActivity size={'small'} /></div>
      <div class="title">Activity</div>
    </div>
    <div class="content">
      <ScrollBox vertical stretch>
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
      </ScrollBox>
    </div>
    <div class="ref-input"><ReferenceInput /></div>
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
      <div class="title"><Label {label} /></div>
    </div>
    {#if $$slots.subtitle}<div class="subtitle"><slot name="subtitle" /></div>{/if}
    <ScrollBox vertical stretch noShift>
      <div class="content"><slot /></div>
      <div class="flex-row-center activity header">
        <div class="icon"><IconActivity size={'small'} /></div>
        <div class="title">Activity</div>
      </div>
      <div class="activity content">
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
        <div class="content-bar" />
      </div>
    </ScrollBox>
    <div class="ref-input"><ReferenceInput /></div>
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
    top: 1.5rem;
    bottom: 1.5rem;
    left: 50%;
    right: 1.5rem;

    display: flex;
    flex-direction: column;
    height: calc(100% - 3rem);
    background: rgba(31, 31, 37, 0.7);
    border-radius: 1.25rem;
    box-shadow: 0px 44px 154px rgba(0, 0, 0, .75);
    backdrop-filter: blur(30px);

    .header {
      flex-shrink: 0;
      padding: 0 2.5rem;
      height: 4.5rem;
      border-bottom: 1px solid var(--theme-card-divider);

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
      display: flex;
      align-items: center;
      padding: 0 2rem;
      height: 3.5rem;
      border-bottom: 1px solid var(--theme-card-divider);
    }
  }

  .unionSection {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    height: max-content;
  }
  .content {
    overflow: visible;
    flex-shrink: 0;
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    padding: 0 2.5rem;
    height: max-content;
  }
  .activity {
    background-color: var(--theme-bg-accent-color);
    &.header { border-bottom: none; }
    &.content {
      background-color: var(--theme-bg-accent-color);
    }
  }

  .fullSize {
    flex-direction: row;
    left: 1.5rem;

    .leftSection, .rightSection {
      flex-basis: 50%;
      display: flex;
      flex-direction: column;
    }
    .leftSection {
      border-right: 1px solid var(--theme-bg-accent-hover);
    }
    .rightSection {
      background-color: transparent;
      .header { border-bottom: 1px solid var(--theme-card-divider); }
      .content {
        padding-top: 1.5rem;
        background-color: var(--theme-bg-accent-color);
      }
    }
  }
  
  .ref-input {
    background-color: var(--theme-bg-accent-color);
    padding: 1.5rem 2.5rem;
  }

  .tools {
    position: absolute;
    display: flex;
    top: 1.75rem;
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

  .content-bar {
    flex-shrink: 0;
    height: 100px;
    background-color: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .5);
    border-radius: 1rem;
  }
  .content-bar + .content-bar { margin-top: 1rem; }
</style>