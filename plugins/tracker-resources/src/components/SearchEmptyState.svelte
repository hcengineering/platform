<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import { SearchEmptyState } from '@hcengineering/view-resources'
  import tracker from '../plugin'

  export let searchText: string
  export let activeFilters: string[] = []

  // Tracker-specific broader-scope action: jump to the All Issues view.
  // URL shape: /workbench/<ws>/tracker/<project|special>/<view> — replace the
  // project-or-special slot with the 'allIssues' special view. The search
  // text is intentionally not carried over (the view opens unfiltered).
  function gotoAllIssues (): void {
    const loc = getCurrentResolvedLocation()
    if (loc.path.length < 3 || loc.path[2] !== 'tracker') return
    loc.path[3] = 'allIssues'
    loc.path.length = 4
    navigate(loc)
  }
</script>

<SearchEmptyState
  {searchText}
  {activeFilters}
  titleLabel={tracker.string.SearchEmptyTitle}
  activeFiltersLabel={tracker.string.SearchEmptyActiveFilters}
  clearFiltersLabel={tracker.string.SearchEmptyClearFilters}
  broaderScopeLabel={tracker.string.SearchEmptyAllProjects}
  onBroaderScope={gotoAllIssues}
/>
