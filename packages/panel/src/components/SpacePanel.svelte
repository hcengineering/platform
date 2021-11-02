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
  import type { AnySvelteComponent, AnyComponent } from '@anticrm/ui'
  import { IconClose, Label, ScrollBox, Icon, Tabs } from '@anticrm/ui'

  import { createEventDispatcher } from 'svelte'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent

  const dispatch = createEventDispatcher()
</script>

<div class="overlay" on:click={() => { dispatch('close') }}/>
<div class="dialog-container">
  <div class="flex-row-center header">
    {#if typeof (icon) === 'string'}
      <Icon {icon} size={'medium'} />
    {:else}
      <svelte:component this={icon} size={'medium'} />
    {/if}
    <div class="flex-grow fs-title ml-2"><Label {label} /></div>
    <div class="tool" on:click={() => { dispatch('close') }}><IconClose size={'small'} /></div>
  </div>
  <div class="flex-row-center subtitle">
    Subtitle
  </div>
  <div class="content">
    <Tabs model={[{ label: 'General' }, { label: 'Members' }, { label: 'Activity' }]} />
    <slot />
    <!-- <ScrollBox vertical stretch noShift>
      <div class="flex-col content">
        <slot />
      </div>
    </ScrollBox> -->
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
    box-shadow: var(--theme-dialog-shadow);
    backdrop-filter: blur(10px);

    .header {
      flex-shrink: 0;
      padding: 0 2rem 0 2.5rem;
      height: 4.5rem;
      border-bottom: 1px solid var(--theme-dialog-divider);

      .tool {
        margin-left: .75rem;
        transform-origin: center center;
        transform: scale(.75);
        color: var(--theme-content-accent-color);
        cursor: pointer;
        &:hover { color: var(--theme-caption-color); }
      }
    }

    .subtitle {
      flex-shrink: 0;
      padding: 0 2.5rem;
      height: 3.5rem;
      border-bottom: 1px solid var(--theme-dialog-divider);
    }

    .content {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      margin-bottom: 2.5rem;
      padding: 0 2.5rem;
      height: max-content;
    }
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--theme-menu-color);
    opacity: .6;
  }
</style>