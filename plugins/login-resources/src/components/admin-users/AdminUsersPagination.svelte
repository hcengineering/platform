<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Button, IconBack, IconForward } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

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

<div class="pagination flex-row-center flex-no-shrink p-2">
  <span class="info">
    Page {page} of {totalPages} · Showing {from}–{to} of {total}
  </span>
  <div class="actions flex-row-center flex-gap-2">
    <Button
      icon={IconBack}
      label={getEmbeddedLabel('Prev')}
      kind={'regular'}
      size={'small'}
      disabled={!hasPrev}
      on:click={() => go(offset - limit)}
    />
    <Button
      iconRight={IconForward}
      label={getEmbeddedLabel('Next')}
      kind={'regular'}
      size={'small'}
      disabled={!hasNext}
      on:click={() => go(offset + limit)}
    />
  </div>
</div>

<style lang="scss">
  .pagination {
    justify-content: space-between;
    margin-top: var(--spacing-2);
  }

  .info {
    font-size: 0.82rem;
    color: var(--theme-darker-color);
  }
</style>
