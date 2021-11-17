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
  import type { Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { Icon } from '@anticrm/ui'

  export let icon: Asset | AnySvelteComponent
</script>

<div class="flex-col msg-container">
  <div class="flex-between">
    <div class="flex-center icon">
      <div class="scale-75">
        {#if typeof (icon) === 'string'}
          <Icon {icon} size={'small'}/>
        {:else}
          <svelte:component this={icon} size={'small'} />
        {/if}
      </div>
    </div>
    <div class="flex-grow label"><slot /></div>
    <div class="content-trans-color">Yesterday, 3:20 PM</div>
  </div>
  {#if $$slots.content}
    <div class="content"><slot name="content" /></div>
  {/if}
</div>

<style lang="scss">
  .msg-container {
    position: relative;
    &::after {
      content: '';
      position: absolute;
      top: 2.25rem;
      left: 1.125rem;
      bottom: 0;
      width: 1px;
      background-color: var(--theme-card-divider);
    }
  }
  :global(.msg-container + .msg-container::before) {
    content: '';
    position: absolute;
    top: -1.5rem;
    left: 1.125rem;
    height: 1.5rem;
    width: 1px;
    background-color: var(--theme-card-divider);
  }

  .icon {
    flex-shrink: 0;
    align-self: flex-start;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--theme-caption-color);
    border: 1px solid var(--theme-card-divider);
    border-radius: 50%;
  }

  .content {
    margin: .5rem 0 .5rem 3.25rem;
    padding: 1rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
  }

  .label {
    flex-wrap: wrap;
    margin: 0 1rem;
  }
  :global(.label b) { color: var(--theme-caption-color); }
  :global(.label span) {
    display: inline-block;
    padding: .125rem .25rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-bg-focused-color);
    border-radius: .25rem;
  }
  :global(.label span.bar) {
    padding: .25rem .5rem;
    font-weight: 500;
    font-size: .625rem;
    background-color: var(--primary-button-enabled);
  }
</style>
