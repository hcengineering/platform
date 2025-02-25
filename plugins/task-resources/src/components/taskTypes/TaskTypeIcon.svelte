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
  import { TaskType } from '@hcengineering/task'
  import {
    ColorDefinition,
    Icon,
    IconSize,
    IconWithEmoji,
    getColorNumberByText,
    getPlatformColorDef,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'

  export let value: TaskType | undefined
  export let size: IconSize = 'small'
  export let inline: boolean = false

  const dispatch = createEventDispatcher()

  const dispatchAccentColor = (color?: ColorDefinition): void => {
    dispatch('accent-color', color)
  }

  $: color = getPlatformColorDef(value?.color ?? getColorNumberByText(value?.name ?? ''), $themeStore.dark)
  $: dispatchAccentColor(color)

  onMount(() => {
    dispatchAccentColor(color)
  })
</script>

{#if value}
  {@const icon = value?.icon === view.ids.IconWithEmoji ? IconWithEmoji : value?.icon}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="flex-center state-container clear-mins" class:inline on:click>
    {#if icon != null}
      <Icon {icon} {size} iconProps={{ icon: value?.color }} />
    {:else}
      <div class="border-divider-color svg-{size} border-radius-1" style:background={color?.color} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .state-container {
    flex-shrink: 0;

    &.inline {
      transform: translateY(0.125rem);
    }
  }
</style>
