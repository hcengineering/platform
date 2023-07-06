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
  import { AnyAttribute } from '@hcengineering/core'
  import type { TagReference } from '@hcengineering/tags'
  import { getPlatformColorDef, Icon, IconClose, resizeObserver, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import TagItem from './TagItem.svelte'

  export let value: TagReference
  export let isEditable: boolean = false
  export let kind: 'list' | 'link' | 'skills' = 'skills'
  export let realWidth: number | undefined = undefined
  export let attr: AnyAttribute | undefined
  export let inline: boolean = false

  const dispatch = createEventDispatcher()

  $: color = getPlatformColorDef(value.color ?? 0, $themeStore.dark)
</script>

{#if value}
  {#if inline}
    <TagItem tag={value} schema={attr?.schema ?? '0'} inline />
  {:else if kind === 'skills'}
    <TagItem tag={value} schema={attr?.schema ?? '0'} />
  {:else if kind === 'link'}
    <button
      class="link-container"
      use:resizeObserver={(element) => {
        realWidth = element.clientWidth
      }}
    >
      <div class="color" style:background-color={color.color} />
      <span class="label overflow-label ml-1 text-sm caption-color max-w-40">{value.title}</span>
    </button>
  {:else if kind === 'list'}
    <div
      class="listitems-container"
      style:padding-right={isEditable ? '0' : '0.5rem'}
      use:resizeObserver={(element) => {
        realWidth = element.clientWidth
      }}
    >
      <div class="color" style:background-color={color.color} />
      <span class="label overflow-label ml-1-5 max-w-40">
        {value.title}
      </span>
      {#if isEditable}
        <button class="btn-close" on:click|stopPropagation={() => dispatch('remove', value)}>
          <Icon icon={IconClose} size={'x-small'} />
        </button>
      {/if}
    </div>
  {/if}
{/if}

<style lang="scss">
  .listitems-container {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding-left: 0.5rem;
    height: 1.75rem;
    min-width: 0;
    min-height: 0;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 1.5rem;
    user-select: none;

    &:hover {
      background-color: var(--theme-button-hovered);
    }
    .label {
      color: var(--theme-caption-color);
    }
    .btn-close {
      flex-shrink: 0;
      margin-left: 0.125rem;
      padding: 0 0.25rem 0 0.125rem;
      height: 1.75rem;
      color: var(--theme-content-color);
      border-left: 1px solid transparent;

      &:hover {
        color: var(--theme-caption-color);
        border-left-color: var(--theme-divider-color);
      }
    }
  }

  .link-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.375rem;
    height: 1.5rem;
    min-width: 1.5rem;
    font-size: 0.75rem;
    line-height: 0.75rem;
    white-space: nowrap;
    color: var(--theme-content-color);
    background-color: var(--theme-link-button-color);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    &:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-link-button-hover);
      border-color: var(--theme-list-divider-color);
      transition-duration: 0;
    }
    &:focus {
      border-color: var(--primary-edit-border-color) !important;
    }
    &:disabled {
      color: rgb(var(--theme-caption-color) / 40%);
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
