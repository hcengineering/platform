<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createQuery } from '@hcengineering/presentation'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import tracker from '../plugin'
  import { kindCode } from './gantt/lib/predecessor-format'

  /**
   * Tiny single-line presenter for an IssueRelation, used by Huly's
   * activity framework (registered as the ObjectPresenter for
   * tracker.class.IssueRelation in models/tracker/src/presenters.ts).
   *
   * Without this presenter, activity entries for a new dependency render
   * as "New related to: Dependency" — the generic class label. With it,
   * they render as "New related to: FS +2d → OSTRO-29 Office/social
   * container", which tells the user exactly which dependency was
   * created and (after removal) which one was deleted.
   */
  export let value: IssueRelation

  const targetQuery = createQuery()
  let target: Issue | undefined

  $: targetQuery.query(tracker.class.Issue, { _id: value.target }, (res) => {
    target = res[0]
  })

  // Surface identifier/title as plain reactive values — Svelte's template
  // parser doesn't accept `(x as any).foo` casts inline.
  $: targetIdentifier = (target as unknown as { identifier?: string } | undefined)?.identifier ?? ''
  $: targetTitle = target?.title ?? ''

  function formatLag (lag: number): string {
    if (lag === 0) return ''
    return lag > 0 ? ` +${lag}d` : ` ${lag}d`
  }

  function kindBg (kind: IssueRelation['kind']): string {
    switch (kind) {
      case 'finish-to-start': return '#6366f1'
      case 'start-to-start': return '#8b5cf6'
      case 'finish-to-finish': return '#f59e0b'
      case 'start-to-finish': return '#ef4444'
    }
  }
</script>

<span class="rel-presenter">
  <span class="kind" style="background: {kindBg(value.kind)}">{kindCode(value.kind)}</span>
  {#if value.lag !== 0}<span class="lag">{formatLag(value.lag).trim()}</span>{/if}
  <span class="arrow">→</span>
  {#if target !== undefined}
    <span class="ident">{targetIdentifier}</span>
    <span class="title">{targetTitle}</span>
  {:else}
    <span class="placeholder">…</span>
  {/if}
</span>

<style lang="scss">
  .rel-presenter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  .kind {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 3px;
    color: white;
    letter-spacing: 0.5px;
  }
  .lag {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: var(--theme-content-trans-color);
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 3px;
    padding: 0 3px;
  }
  .arrow {
    color: var(--theme-content-trans-color);
  }
  .ident {
    font-weight: 500;
  }
  .title {
    color: var(--theme-content-trans-color);
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 26ch;
    white-space: nowrap;
  }
  .placeholder {
    color: var(--theme-content-trans-color);
  }
</style>
