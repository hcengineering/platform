<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let total: number = 0
  export let offset: number = 0
  export let limit: number = 50

  const dispatch = createEventDispatcher<{ page: { offset: number } }>()

  $: page = Math.floor(offset / limit) + 1
  $: totalPages = Math.max(1, Math.ceil(total / limit))
  $: hasPrev = offset > 0
  $: hasNext = offset + limit < total

  function go (newOffset: number): void {
    dispatch('page', { offset: Math.max(0, newOffset) })
  }
</script>

<div class="pagination">
  <button disabled={!hasPrev} on:click={() => go(offset - limit)}>Prev</button>
  <span>
    Page {page} of {totalPages} · Showing {total === 0 ? 0 : offset + 1}-{Math.min(offset + limit, total)} of {total}
  </span>
  <button disabled={!hasNext} on:click={() => go(offset + limit)}>Next</button>
</div>

<style lang="scss">
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    padding: 0.75rem;
    border-top: 1px solid var(--theme-divider-color);
  }
  button {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--theme-button-border);
    background: var(--theme-button-color);
    color: var(--theme-content-color);
    border-radius: 0.25rem;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
