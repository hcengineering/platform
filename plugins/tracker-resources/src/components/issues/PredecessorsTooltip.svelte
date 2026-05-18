<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import type { Issue } from '@hcengineering/tracker'
  import { DocNavLink } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import {
    formatPredecessorEntry,
    type PredecessorEntry
  } from '../gantt/lib/predecessor-list-format'
  import { kindCode } from '../gantt/lib/predecessor-format'

  /**
   * Hover-tooltip body for the '+N more' badge in the Tracker-list
   * Predecessors column. Renders one row per upstream issue with the
   * full identifier-link + kind-badge + signed lag.
   *
   * Receives the FULL predecessor list (not just the rest) so a power
   * user who hovers the badge sees every dependency in one place
   * instead of having to mentally add the inline one.
   */
  export let predecessors: PredecessorEntry[] = []

  function lagSuffix (lag: number): string {
    if (lag === 0) return ''
    return lag > 0 ? ` +${lag}d` : ` ${lag}d`
  }

  // Pre-compute view rows in <script> so the template stays cast-free.
  // Svelte's template parser stumbles over inline `as unknown as Issue`
  // casts — same workaround as in IssueRelationPresenter.svelte.
  $: rows = predecessors.map((entry) => ({
    key: entry.rel._id as unknown as string,
    object: entry.source as unknown as Issue,
    identifier: (entry.source as unknown as { identifier: string }).identifier,
    kindLabel: kindCode(entry.rel.kind),
    lag: entry.rel.lag,
    titleText: formatPredecessorEntry(entry.rel, entry.source)
  }))
</script>

<div class="predecessors-tooltip">
  {#each rows as row (row.key)}
    <div class="tooltip-row" title={row.titleText}>
      <DocNavLink object={row.object} component={tracker.component.EditIssue}>
        <span class="ident">{row.identifier}</span>
      </DocNavLink>
      <span class="kind">{row.kindLabel}</span>
      {#if row.lag !== 0}
        <span class="lag">{lagSuffix(row.lag).trim()}</span>
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .predecessors-tooltip {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px;
    min-width: 160px;
  }
  .tooltip-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  .ident {
    font-weight: 500;
    color: var(--theme-content-color);
  }
  .kind {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    color: var(--theme-content-trans-color);
    letter-spacing: 0.5px;
  }
  .lag {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: var(--theme-content-trans-color);
  }
</style>
