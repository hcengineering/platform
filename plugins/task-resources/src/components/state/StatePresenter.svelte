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
  import { createEventDispatcher, onMount } from 'svelte'
  import type { State } from '@hcengineering/task'
  import { getColorNumberByText, getPlatformColor, hexToRgb } from '@hcengineering/ui'

  export let value: State | undefined
  export let shouldShowAvatar = true
  export let inline: boolean = false
  export let colorInherit: boolean = false
  export let accent: boolean = false

  const dispatch = createEventDispatcher()

  const defaultFill = 'currentColor'
  $: fill = value ? getPlatformColor(value.color ?? getColorNumberByText(value.name)) : defaultFill
  const dispatchAccentColor = (fill: string) =>
    dispatch('accent-color', fill !== defaultFill ? hexToRgb(fill) : { r: 127, g: 127, b: 127 })
  $: dispatchAccentColor(fill)

  onMount(() => {
    dispatchAccentColor(fill)
  })
</script>

{#if value}
  <div class="flex-presenter" class:inline-presenter={inline}>
    {#if shouldShowAvatar}
      <div class="state-container" class:inline style="background-color: {fill}" />
    {/if}
    <span class="label nowrap">{value.name}</span>
  </div>
{/if}

<style lang="scss">
  .state-container {
    flex-shrink: 0;
    margin-right: 0.5rem;
    width: 0.875rem;
    height: 0.875rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;

    &.inline {
      transform: translateY(0.125rem);
    }
  }
</style>
