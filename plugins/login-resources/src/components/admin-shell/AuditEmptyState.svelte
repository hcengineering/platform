<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let hasFilter: boolean

  const dispatch = createEventDispatcher<{ clearFilter: void }>()
</script>

<div class="audit-empty-state">
  <div class="icon" aria-hidden="true">📭</div>
  {#if hasFilter}
    <p class="title">No audit entries match the current filter</p>
    <Button kind="regular" label={getEmbeddedLabel('Clear filter')}
            on:click={() => dispatch('clearFilter')} />
  {:else}
    <p class="title">No audit entries yet</p>
    <p class="hint">Admin actions are recorded automatically as they happen.</p>
  {/if}
</div>

<style lang="scss">
  .audit-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: var(--theme-darker-color);
  }
  .icon { font-size: 2rem; opacity: 0.7; }
  .title { margin: 0; font-weight: 500; }
  .hint { margin: 0; font-size: 0.85rem; opacity: 0.8; }
</style>
