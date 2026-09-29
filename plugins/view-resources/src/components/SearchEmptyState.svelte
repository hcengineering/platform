<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  Generic card shown when the user has typed something but zero items match.
  Replaces the previous behaviour (silent empty grid that left the user
  unsure whether the search was running or just broken).

  Mounted by a consumer when shouldShowEmptyState(searchRaw, count) is true,
  inside an out-of-flow overlay so it never displaces the still-live viewlet
  (see the overlay comment at the consumer). Because it floats above the
  viewlet it carries its own surface (background/border/shadow) instead of
  inheriting the page background.

  Labels are injected by the consumer so the card stays domain-neutral:
  `titleLabel` (params `{ query }`), `activeFiltersLabel` (params `{ filters }`)
  and `clearFiltersLabel`. The optional broader-scope button is only rendered
  when both `broaderScopeLabel` and `onBroaderScope` are provided; the consumer
  decides what "broader scope" means (e.g. jumping to a project-wide view).
-->
<script lang="ts">
  import { type IntlString } from '@hcengineering/platform'
  import { Button, Label } from '@hcengineering/ui'
  import { setFilters } from '../filter'

  export let searchText: string
  export let activeFilters: string[] = []
  export let titleLabel: IntlString
  export let activeFiltersLabel: IntlString
  export let clearFiltersLabel: IntlString
  export let broaderScopeLabel: IntlString | undefined = undefined
  export let onBroaderScope: (() => void) | undefined = undefined

  function clearFilters (): void {
    setFilters([])
  }
</script>

<div class="search-empty-state" role="region" aria-live="polite">
  <div class="icon" aria-hidden="true">🔍</div>
  <h2 class="title">
    <Label label={titleLabel} params={{ query: searchText }} />
  </h2>
  {#if activeFilters.length > 0}
    <div class="filters-info">
      <Label label={activeFiltersLabel} params={{ filters: activeFilters.join(', ') }} />
    </div>
  {/if}
  <div class="actions">
    {#if activeFilters.length > 0}
      <Button kind="primary" label={clearFiltersLabel} on:click={clearFilters} />
    {/if}
    {#if broaderScopeLabel !== undefined && onBroaderScope !== undefined}
      <Button kind="ghost" label={broaderScopeLabel} on:click={onBroaderScope} />
    {/if}
  </div>
</div>

<style lang="scss">
  .search-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-6);
    max-width: min(32rem, 90%);
    color: var(--theme-content-color);
    background-color: var(--theme-popup-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-focus-BorderRadius);
    box-shadow: var(--theme-popup-shadow);
    text-align: center;
  }
  .icon {
    font-size: 2rem;
  }
  .title {
    margin: 0;
    font-weight: 500;
    font-size: 1rem;
    color: var(--theme-content-color);
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
