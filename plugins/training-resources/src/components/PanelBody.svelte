<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { type IModeSelector, TabList } from '@hcengineering/ui'

  export let modes: IModeSelector<any>

  $: tabItems = modes.config.map((c) => {
    return {
      id: c[0],
      labelIntl: c[1],
      labelParams: c[2]
    }
  })
</script>

<div class="root">
  <div class="tabs popupPanel-title">
    <TabList
      items={tabItems}
      selected={modes.mode}
      kind={'plain'}
      adaptiveShrink={null}
      on:select={(event) => {
        modes.onChange(event.detail.id)
      }}
    />
  </div>
  <div class="content">
    <slot />
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  .tabs {
    flex: 0;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .content {
    flex: 1;
    overflow-y: scroll;
    position: relative;
  }
</style>
