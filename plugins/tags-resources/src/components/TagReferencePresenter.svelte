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
  import type { TagReference } from '@hcengineering/tags'
  import { getPlatformColor, Icon, IconClose, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { tagLevel } from '../utils'
  import TagItem from './TagItem.svelte'

  export let value: TagReference
  export let isEditable: boolean = false
  export let kind: 'labels' | 'kanban-labels' | 'skills' = 'skills'
  export let realWidth: number | undefined = undefined

  const dispatch = createEventDispatcher()
  $: tagIcon = tagLevel[(((value?.weight ?? 0) % 3) + 1) as 1 | 2 | 3]
</script>

{#if value}
  {#if kind === 'skills'}
    <TagItem tag={value} />
  {:else if kind === 'kanban-labels'}
    <button
      class="label-container"
      use:resizeObserver={(element) => {
        realWidth = element.clientWidth
      }}
    >
      <div class="color" style:background-color={getPlatformColor(value.color ?? 0)} />
      <span class="overflow-label ml-1 text-sm caption-color">{value.title}</span>
    </button>
  {:else if kind === 'labels'}
    <div
      class="tag-container"
      style:padding-right={isEditable ? '0' : '0.5rem'}
      use:resizeObserver={(element) => {
        realWidth = element.clientWidth
      }}
    >
      <div class="color" style:background-color={getPlatformColor(value.color ?? 0)} />
      <span class="overflow-label ml-1-5 caption-color"
        >{value.title}-
        <Icon icon={tagIcon} size={'small'} />
      </span>
      {#if isEditable}
        <button class="btn-close" on:click|stopPropagation={() => dispatch('remove', value.tag)}>
          <Icon icon={IconClose} size={'x-small'} />
        </button>
      {/if}
    </div>
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

  .label-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.375rem;
    height: 1.375rem;
    min-width: 1.375rem;
    font-weight: 500;
    font-size: 0.75rem;
    line-height: 0.75rem;
    white-space: nowrap;
    color: var(--accent-color);
    background-color: var(--board-card-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.25rem;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    &:hover {
      color: var(--accent-color);
      background-color: var(--button-bg-hover);
      border-color: var(--button-border-hover);
      transition-duration: 0;
    }
    &:focus {
      border-color: var(--primary-edit-border-color) !important;
    }
    &:disabled {
      color: rgb(var(--caption-color) / 40%);
      cursor: not-allowed;
    }
  }

  .color {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
</style>
