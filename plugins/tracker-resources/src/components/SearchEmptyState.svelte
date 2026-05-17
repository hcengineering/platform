<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  Card shown when the user has typed something but zero issues match.
  Replaces the previous behaviour (silent empty grid that left the user
  unsure whether the search was running or just broken).

  Mounted by IssuesView when shouldShowEmptyState(searchRaw, count) is
  true. Buttons: clear-all-filters (only when filters are active), and
  jump to All Issues view with the current search text preserved.
-->
<script lang="ts">
  import { Button, Label, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import { setFilters } from '@hcengineering/view-resources'
  import tracker from '../plugin'

  export let searchText: string
  export let activeFilters: string[] = []

  function clearFilters (): void {
    setFilters([])
  }
  function gotoAllIssues (): void {
    const loc = getCurrentResolvedLocation()
    // Tracker URL shape: /workbench/<ws>/tracker/<project|special>/<view>
    // The "All Issues" special-view is at path index 3 keyed 'allIssues'.
    loc.path[3] = 'allIssues'
    navigate(loc)
  }
</script>

<div class="search-empty-state">
  <div class="icon">🔍</div>
  <div class="title">
    <Label label={tracker.string.SearchEmptyTitle} params={{ query: searchText }} />
  </div>
  {#if activeFilters.length > 0}
    <div class="filters-info">
      <Label
        label={tracker.string.SearchEmptyActiveFilters}
        params={{ filters: activeFilters.join(', ') }}
      />
    </div>
  {/if}
  <div class="actions">
    {#if activeFilters.length > 0}
      <Button kind="primary" label={tracker.string.SearchEmptyClearFilters} on:click={clearFilters} />
    {/if}
    <Button kind="ghost" label={tracker.string.SearchEmptyAllProjects} on:click={gotoAllIssues} />
  </div>
</div>

<style lang="scss">
  .search-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-6);
    color: var(--theme-content-color);
  }
  .icon {
    font-size: 2rem;
  }
  .title {
    font-weight: 500;
    font-size: 1rem;
  }
  .filters-info {
    font-size: 0.875rem;
    color: var(--theme-dark-color);
  }
  .actions {
    display: flex;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }
</style>
