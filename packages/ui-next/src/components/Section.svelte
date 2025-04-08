<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  import Label from './Label.svelte'
  import IconArrowChevronRight from './icons/IconArrowChevronRight.svelte'
  import IconArrowChevronDown from './icons/IconArrowChevronDown.svelte'
  import Divider from './Divider.svelte'

  export let id: string
  export let title: IntlString
  export let withHeaderDivider = false
  export let expanded = true
  export let selected = false

  const dispatch = createEventDispatcher()

  let _expanded = expanded

  function toggleExpanded (event: MouseEvent): void {
    event.stopPropagation()
    event.preventDefault()
    _expanded = !_expanded
    dispatch('toggle', id)
  }
</script>

<div class="section">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="section__header" class:selected on:click>
    <div class="section__arrow" on:click={toggleExpanded}>
      {#if _expanded}
        <IconArrowChevronDown />
      {:else}
        <IconArrowChevronRight />
      {/if}
    </div>

    <div class="section__title next-label-overflow">
      <Label label={title} />
    </div>

    {#if withHeaderDivider}
      <Divider />
    {/if}
  </div>

  <div class="section__content">
    {#if _expanded}
      <slot />
    {/if}
  </div>
</div>

<style lang="scss">
  .section {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .section__header {
    display: flex;
    width: 100%;
    min-height: 1.5rem;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 0.5rem;
    padding: 0.5rem;

    &.selected {
      background: var(--next-surface-color-fg-inv);
    }
  }

  .section__title {
    color: var(--next-text-color-secondary);
    font-size: 0.813rem;
    font-weight: 500;
  }

  .section__arrow {
    color: var(--next-label-color-secondary);
    min-width: 1rem;
  }

  .section__content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
</style>
