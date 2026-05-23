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
  $: from = total === 0 ? 0 : offset + 1
  $: to = Math.min(offset + limit, total)

  function go (newOffset: number): void {
    dispatch('page', { offset: Math.max(0, newOffset) })
  }
</script>

<div class="pagination">
  <span class="info">
    Page {page} of {totalPages} · Showing {from}–{to} of {total}
  </span>
  <div class="actions">
    <button class="btn" disabled={!hasPrev} on:click={() => go(offset - limit)}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      Prev
    </button>
    <button class="btn" disabled={!hasNext} on:click={() => go(offset + limit)}>
      Next
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  </div>
</div>

<style lang="scss">
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 1rem;
    border-top: 1px solid var(--theme-divider-color);
  }

  .info {
    font-size: 0.8rem;
    color: var(--theme-content-color);
    opacity: 0.65;
  }

  .actions {
    display: flex;
    gap: 0.4rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.65rem;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    color: var(--theme-content-color);
    border-radius: 0.35rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 80ms ease;

    &:hover:not(:disabled) {
      background: var(--theme-popup-hover);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
</style>
