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
  import type { State } from '@hcengineering/task'
  import {
    ColorDefinition,
    defaultBackground,
    getColorNumberByText,
    getPlatformColorDef,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  export let value: State | undefined
  export let shouldShowAvatar = true
  export let inline: boolean = false
  export let disabled: boolean = false
  export let oneLine: boolean = false
  export let shouldShowName: boolean = true
  export let shouldShowTooltip: boolean = false
  export let noUnderline: boolean = false
  export let shrink: number = 0

  const dispatch = createEventDispatcher()

  $: color = value ? getPlatformColorDef(value.color ?? getColorNumberByText(value.name), $themeStore.dark) : undefined
  const dispatchAccentColor = (color?: ColorDefinition) => dispatch('accent-color', color)

  $: dispatchAccentColor(color)

  onMount(() => {
    dispatchAccentColor(color)
  })
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="flex-presenter"
    class:inline-presenter={inline}
    class:flex-no-shrink={!shouldShowName || shrink === 0}
    on:click
  >
    {#if shouldShowAvatar}
      <div
        class="state-container"
        class:inline
        class:mr-2={shouldShowName}
        style:background-color={color?.color ?? defaultBackground($themeStore.dark)}
        title={shouldShowTooltip ? value.name : undefined}
      />
    {/if}
    {#if shouldShowName}
      <span class="overflow-label label" class:nowrap={oneLine} class:no-underline={noUnderline || disabled}>
        {value.name}
      </span>
    {/if}
  </div>
{/if}

<style lang="scss">
  .state-container {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;

    &.inline {
      transform: translateY(0.125rem);
    }
  }
</style>
