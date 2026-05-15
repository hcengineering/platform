<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import type { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import { tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { kindCode, signedLag } from '../gantt/lib/predecessor-format'
  import {
    sortPredecessorsByIdentifier,
    splitFirstAndRest
  } from '../gantt/lib/predecessor-list-format'
  import PredecessorsTooltip from './PredecessorsTooltip.svelte'

  /**
   * Tracker-list column presenter for the optional 'Predecessors'
   * column.
   *
   * Rendering:
   *   <empty>                              -- 0 predecessors
   *   <DocNavLink>PROJ-3</DocNavLink> FS+2d -- exactly 1 predecessor
   *   <DocNavLink>PROJ-3</DocNavLink> FS+2d +2 more -- with +N badge
   *
   * Click on the identifier navigates to the predecessor issue
   * (standard Tracker DocNavLink -> EditIssue). The kind+lag are
   * plain text so the click target is unambiguously the identifier.
   * Click on the '+N more' badge does nothing (hover-only tooltip).
   *
   * Performance: two live queries per row (relations + sources).
   * Acceptable while the list is non-virtualised — the Tracker list
   * already runs one Live-Query per row for several other columns.
   * Future optimisation (out of scope per spec): batched
   * findAll(target: {$in: visibleIds}) once per page.
   */
  export let value: Issue | undefined

  let relations: IssueRelation[] = []
  const relQuery = createQuery()

  $: if (value !== undefined) {
    relQuery.query(
      tracker.class.IssueRelation,
      { target: value._id },
      (res) => {
        relations = res
      }
    )
  } else {
    relations = []
  }

  let sources = new Map<Ref<Issue>, Issue>()
  const sourceQuery = createQuery()

  $: {
    const sourceIds = relations.map((r) => r.attachedTo as unknown as Ref<Issue>)
    if (sourceIds.length === 0) {
      sources = new Map()
    } else {
      sourceQuery.query(
        tracker.class.Issue,
        { _id: { $in: sourceIds } },
        (res) => {
          const next = new Map<Ref<Issue>, Issue>()
          for (const issue of res) next.set(issue._id, issue)
          sources = next
        }
      )
    }
  }

  $: entries = sortPredecessorsByIdentifier(relations, sources)
  $: split = splitFirstAndRest(entries)

  function lagSuffix (lag: number): string {
    const s = signedLag(lag)
    return s === '' ? '' : ' ' + s
  }

  // Pre-cast in <script> so the template stays free of inline TS casts
  // (svelte's template parser does not accept `as unknown as Issue` in
  // attribute expressions — same constraint as IssueRelationPresenter).
  $: firstView = split.first === null
    ? null
    : {
        object: split.first.source as unknown as Issue,
        identifier: (split.first.source as unknown as { identifier: string }).identifier,
        kindLabel: kindCode(split.first.rel.kind),
        lagSuffix: lagSuffix(split.first.rel.lag)
      }
</script>

{#if firstView !== null}
  <span class="predecessors-cell">
    <DocNavLink object={firstView.object} component={tracker.component.EditIssue}>
      <span class="ident">{firstView.identifier}</span>
    </DocNavLink>
    <span class="kind-lag">&nbsp;{firstView.kindLabel}{firstView.lagSuffix}</span>
    {#if split.extraCount > 0}
      <span
        class="more-badge"
        use:tooltip={{ component: PredecessorsTooltip, props: { predecessors: entries } }}
      >
        +{split.extraCount} more
      </span>
    {/if}
  </span>
{/if}

<style lang="scss">
  .predecessors-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .ident {
    font-weight: 500;
    color: var(--theme-content-color);
  }
  .kind-lag {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: var(--theme-content-trans-color);
  }
  .more-badge {
    margin-left: 4px;
    font-size: 11px;
    color: var(--theme-content-trans-color);
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 8px;
    padding: 0 6px;
    cursor: default;
    white-space: nowrap;
  }
</style>
