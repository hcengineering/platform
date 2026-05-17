<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  Inline filter chips. Renders the active filter list in a single horizontal
  row; trailing chips collapse to a "+N" button + popover when the row is
  too narrow. Replaces the standalone <FilterBar /> chip-row render in the
  Tracker IssuesView. Both consumers share the same query-builder helper
  (`makeFilterQuery`), so the resulting query is bit-identical to legacy.
-->
<script lang="ts">
  import type { Class, Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, eventToHTMLElement, resizeObserver, showPopup } from '@hcengineering/ui'
  import type { Filter } from '@hcengineering/view'
  import { createEventDispatcher, tick } from 'svelte'
  import { filterStore, removeFilter } from '../../filter'
  import { makeFilterQuery } from '../../filter/query-builder'
  import view from '../../plugin'
  import FilterSection from './FilterSection.svelte'
  import InlineFilterChipsOverflow from './InlineFilterChipsOverflow.svelte'
  import { computeOverflow } from './InlineFilterChips.svelte.helpers'

  export let _class: Ref<Class<Doc>> | undefined
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let containerWidth = 0
  let chipEls: HTMLElement[] = []
  let visibleCount = 0
  let hiddenCount = 0
  const BADGE_WIDTH = 64

  async function recompute (): Promise<void> {
    await tick()
    const widths = chipEls.map((el) => el?.getBoundingClientRect().width ?? 0)
    const r = computeOverflow(widths, containerWidth, BADGE_WIDTH)
    visibleCount = r.visibleCount
    hiddenCount = r.hiddenCount
  }

  // Re-run on filter-store or container-width change. The `void` references
  // make the reactive block depend on both even though `recompute` is async.
  $: {
    void $filterStore
    void containerWidth
    void recompute()
  }

  function onContainerResize (el: Element): void {
    const w = (el as HTMLElement).clientWidth
    if (w !== containerWidth) containerWidth = w
  }

  async function rebuildQuery (filters: Filter[]): Promise<void> {
    const next = await makeFilterQuery(
      query,
      filters,
      async (id) => await client.findOne(view.class.FilterMode, { _id: id }),
      undefined,
      hierarchy
    )
    dispatch('change', next)
  }
  $: void rebuildQuery($filterStore)

  function openOverflowPopover (e: MouseEvent): void {
    showPopup(InlineFilterChipsOverflow, { hiddenStartIndex: visibleCount, space }, eventToHTMLElement(e))
  }

  // Reference _class to keep the prop usable for future affordances (chip-add
  // popovers reuse it). The current component does not need it because the
  // add affordance lives on FilterButton, but consumers pass it for symmetry
  // with <FilterBar />.
  $: void _class
</script>

<div class="inline-filter-chips" use:resizeObserver={onContainerResize}>
  {#each $filterStore as filter, i (filter.index)}
    {#if i < visibleCount}
      <span bind:this={chipEls[i]} class="chip-slot">
        <FilterSection
          {space}
          {filter}
          on:change={() => rebuildQuery($filterStore)}
          on:remove={() => removeFilter(i)}
        />
      </span>
    {/if}
  {/each}
  {#if hiddenCount > 0}
    <Button
      kind="ghost"
      size="small"
      label={view.string.FilterOverflowBadge}
      labelParams={{ count: hiddenCount }}
      on:click={openOverflowPopover}
    />
  {/if}
</div>

<style lang="scss">
  .inline-filter-chips {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-wrap: nowrap;
    overflow: hidden;
    min-width: 0;
    flex: 1 1 0;
  }
  .chip-slot { flex-shrink: 0; }
</style>
