<script lang="ts">
  //
  // © 2023 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //

  import { createEventDispatcher } from 'svelte'
  import type { TabItem } from '../types'
  import SwitcherBase from './SwitcherBase.svelte'

  export let items: TabItem[]
  export let selected: string | number = ''
  export let kind: 'nuance' | 'subtle' = 'nuance'
  export let name: string
  export let onlyIcons: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="switcher-container {kind}">
  {#each items as item}
    <SwitcherBase
      id={item.id}
      {name}
      {kind}
      checked={selected === item.id}
      icon={item.icon}
      color={item.color}
      title={onlyIcons ? undefined : item.label}
      label={onlyIcons ? undefined : item.labelIntl}
      labelParams={onlyIcons ? undefined : item.labelParams}
      tooltip={item.tooltip ? { label: item.tooltip } : undefined}
      on:change={() => {
        dispatch('select', item)
        if (item.action !== undefined) item.action()
      }}
    />
  {/each}
</div>

<style lang="scss">
  .switcher-container {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    flex-shrink: 0;
    min-width: 0;
    gap: var(--spacing-0_5);
    border-radius: var(--small-BorderRadius);

    &.subtle {
      background-color: var(--selector-BackgroundColor);
    }
  }
</style>
