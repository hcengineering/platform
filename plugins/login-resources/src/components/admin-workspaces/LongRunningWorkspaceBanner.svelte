<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import type { WorkspaceInfoWithStatus } from '@hcengineering/core'

  export let candidates: Array<WorkspaceInfoWithStatus & { lastProcessingTime?: number }> = []
  export let thresholdHours: number = 1

  const dispatch = createEventDispatcher<{
    'show-all': void
    'reset-attempts': void
  }>()

  $: visibleCandidates = candidates.slice(0, 2)
  $: extraCount = Math.max(0, candidates.length - 2)
</script>

{#if candidates.length > 0}
  <div class="lrw-banner" role="alert">
    <div class="lrw-banner-content">
      <strong>{candidates.length} workspace(s) have shown no processing progress for &gt; {thresholdHours}h:</strong>
      <ul>
        {#each visibleCandidates as ws}
          <li>
            <strong>{ws.name ?? ws.url}</strong>
            ({ws.mode}{#if ws.lastProcessingTime != null}, no tick since {new Date(ws.lastProcessingTime).toLocaleString()}{/if})
          </li>
        {/each}
        {#if extraCount > 0}
          <li class="lrw-more">[+{extraCount} more]</li>
        {/if}
      </ul>
    </div>
    <div class="lrw-banner-actions">
      <Button kind={'regular'} size={'small'} label={getEmbeddedLabel('View all')} on:click={() => dispatch('show-all')} />
      <Button kind={'regular'} size={'small'} label={getEmbeddedLabel('Reset attempts')} on:click={() => dispatch('reset-attempts')} />
    </div>
  </div>
{/if}

<style lang="scss">
  .lrw-banner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.85rem 1rem;
    background: rgba(245, 158, 11, 0.10);
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: 0.5rem;
    color: #b45309;
    font-size: 0.85rem;

    ul {
      list-style: none;
      margin: 0.35rem 0 0 0;
      padding: 0;

      li {
        line-height: 1.5;
      }

      .lrw-more {
        font-style: italic;
        opacity: 0.8;
      }
    }
  }

  .lrw-banner-content {
    flex: 1;
    min-width: 0;
  }

  .lrw-banner-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
  }
</style>
