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
  import { Asset } from '@hcengineering/platform'
  import { TagElement, TagReference } from '@hcengineering/tags'
  import { ActionIcon, AnySvelteComponent, getPlatformColor, Icon, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { getTagStyle, tagLevel } from '../utils'

  export let tag: TagReference | undefined = undefined
  export let element: TagElement | undefined = undefined
  export let action: Asset | AnySvelteComponent | undefined = undefined
  export let selected: boolean = false
  export let schema: '0' | '3' | '9' = '9'
  export let inline: boolean = false

  const dispatch = createEventDispatcher()

  $: name = element?.title ?? tag?.title ?? 'New item'

  $: tagIcon = schema !== '9' ? undefined : tagLevel[(((tag?.weight ?? 0) % 3) + 1) as 1 | 2 | 3]
</script>

{#if inline}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    style={`--tag-color:${getPlatformColor(tag?.color ?? element?.color ?? 0)}`}
    class="tag-item-inline overflow-label max-w-40"
    on:click
    use:tooltip={{
      label: element?.description ? tags.string.TagTooltip : undefined,
      props: { text: element?.description },
      direction: 'right'
    }}
  >
    {name}
  </span>
{:else}
  <div
    class="text-sm flex flex-between tag-item"
    style={`${getTagStyle(getPlatformColor(tag?.color ?? element?.color ?? 0), selected)}`}
    on:click
    on:keydown
    use:tooltip={{
      label: element?.description ? tags.string.TagTooltip : undefined,
      props: { text: element?.description },
      direction: 'right'
    }}
  >
    <span class="overflow-label max-w-40">{name}</span>
    <span class="ml-1">
      {#if tag && tagIcon && schema !== '0'}
        <Icon icon={tagIcon} size={'small'} />
      {/if}
    </span>
    {#if action}
      <div class="ml-1">
        <ActionIcon
          icon={action}
          size={'medium'}
          action={() => {
            dispatch('action')
          }}
        />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .tag-item {
    margin: 0.125rem;
    padding: 0.125rem 0.25rem;

    border-radius: 0.25rem;

    font-weight: 500;
    font-size: 0.75rem;

    text-transform: uppercase;
    color: var(--accent-color);
    &:hover {
      color: var(--caption-color);
    }

    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tag-item-inline {
    position: relative;
    padding-left: 0.75rem;
    font-weight: 500;
    color: var(--accent-color);

    &::before {
      position: absolute;
      content: '';
      top: 50%;
      left: 0.125rem;
      width: 0.25rem;
      height: 0.25rem;
      background-color: var(--tag-color);
      border-radius: 50%;
      transform: translateY(-50%);
      z-index: 1;
    }
  }
</style>
