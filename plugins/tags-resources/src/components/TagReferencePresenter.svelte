<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { TagReference } from '@anticrm/tags'
  import { getPlatformColor, IconClose, Icon, Button } from '@anticrm/ui'
  import TagItem from './TagItem.svelte'
  import { createEventDispatcher } from 'svelte'

  export let value: TagReference
  export let isEditable: boolean = false
  export let kind: 'labels' | 'skills' = 'skills'
  export let size: 'small' | 'medium' = 'medium'
  export let realWidth: number | undefined = undefined

  const dispatch = createEventDispatcher()
</script>

{#if value}
  {#if kind === 'skills'}
    <TagItem tag={value} />
  {:else if kind === 'labels'}
    {#if size === 'small'}
      <Button kind={'link-bordered'} size={'inline'} bind:realWidth>
        <svelte:fragment slot="content">
          <div class="color" style:background-color={getPlatformColor(value.color ?? 0)} />
          <span class="overflow-label ml-1 text-sm caption-color">{value.title}</span>
        </svelte:fragment>
      </Button>
    {:else}
      <div class="tag-container" style:padding-right={isEditable ? '0' : '.5rem'}>
        <div class="color" style:background-color={getPlatformColor(value.color ?? 0)} />
        <span class="overflow-label ml-1 caption-color">{value.title}</span>
        {#if isEditable}
          <button class="btn-close" on:click|stopPropagation={() => dispatch('remove', value.tag)}>
            <Icon icon={IconClose} size={'x-small'} />
          </button>
        {/if}
      </div>
    {/if}
  {/if}
{/if}

<style lang="scss">
  .tag-container {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding-left: 0.5rem;
    height: 1.5rem;
    min-width: 0;
    min-height: 0;
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;

    .btn-close {
      flex-shrink: 0;
      margin-left: 0.125rem;
      padding: 0 0.25rem 0 0.125rem;
      height: 1.75rem;
      color: var(--content-color);
      border-left: 1px solid transparent;

      &:hover {
        color: var(--caption-color);
        border-left-color: var(--divider-color);
      }
    }
  }

  .color {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
</style>
