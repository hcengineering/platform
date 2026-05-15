<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, showPopup } from '@hcengineering/ui'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import { canEditIssue } from '../../utils'
  import DependencyEditor from '../DependencyEditor.svelte'
  import { kindCode } from '../gantt/lib/predecessor-format'

  /**
   * Issue-editor side-panel that surfaces every Gantt `IssueRelation`
   * touching the current issue — both incoming (this issue is the
   * successor) and outgoing (this issue is the predecessor). Rows open
   * the same `DependencyEditor` popup the Gantt arrow uses, so the user
   * can edit kind/lag or delete the relation directly from the issue
   * detail view.
   *
   * Two separate live-queries instead of one $or query — the
   * CockroachDB adapter doesn't translate top-level $or (same workaround
   * GanttView uses for its space-wide query).
   */
  export let issue: Issue
  export let readonly: boolean = false

  const incomingQuery = createQuery()
  const outgoingQuery = createQuery()
  const client = getClient()

  let incoming: IssueRelation[] = []
  let outgoing: IssueRelation[] = []
  let otherIssues = new Map<string, Issue>()

  $: incomingQuery.query(
    tracker.class.IssueRelation,
    { target: issue._id },
    (res: IssueRelation[]) => {
      incoming = res
      void resolveOtherIssues()
    }
  )
  $: outgoingQuery.query(
    tracker.class.IssueRelation,
    { attachedTo: issue._id },
    (res: IssueRelation[]) => {
      outgoing = res
      void resolveOtherIssues()
    }
  )

  async function resolveOtherIssues (): Promise<void> {
    const refs = new Set<Ref<Issue>>()
    for (const r of incoming) refs.add(r.attachedTo)
    for (const r of outgoing) refs.add(r.target)
    if (refs.size === 0) {
      otherIssues = new Map()
      return
    }
    const docs = await client.findAll(tracker.class.Issue, { _id: { $in: Array.from(refs) } })
    const next = new Map<string, Issue>()
    for (const i of docs) next.set(String(i._id), i)
    otherIssues = next
  }

  async function openEditor (rel: IssueRelation): Promise<void> {
    // canEdit is determined by the source (predecessor) issue per
    // spec §1 decision A. For outgoing rows the source IS this issue
    // (`rel.attachedTo === issue._id`); the editor can open with our
    // own permission. For incoming rows the source is the OTHER issue;
    // if the otherIssues map hasn't resolved it yet (live query in
    // flight), we open the editor in read-only mode rather than
    // optimistically granting edit-rights via `issue` as a fallback —
    // that would let a viewer of issue B edit a relation owned by A.
    // The DependencyEditor itself remains usable for inspection.
    const isOutgoing = String(rel.attachedTo) === String(issue._id)
    let canEdit = false
    if (!readonly) {
      if (isOutgoing) {
        canEdit = await canEditIssue(issue)
      } else {
        const source = otherIssues.get(String(rel.attachedTo))
        canEdit = source !== undefined && await canEditIssue(source)
      }
    }
    showPopup(DependencyEditor, { relation: rel, canEdit }, 'middle')
  }

  function formatLag (lag: number): string {
    if (lag === 0) return ''
    return lag > 0 ? ` +${lag}d` : ` ${lag}d`
  }

  $: total = incoming.length + outgoing.length
</script>

<span class="labelTop">
  <Label label={tracker.string.Dependencies} />
</span>
{#if total === 0}
  <div class="empty">
    <Label label={tracker.string.NoPredecessors} />
  </div>
{:else}
  <div class="deps">
    {#each incoming as rel (rel._id)}
      {@const other = otherIssues.get(String(rel.attachedTo))}
      <button class="dep-row" type="button" on:click={() => openEditor(rel)}>
        <span class="kind">{kindCode(rel.kind)}{formatLag(rel.lag)}</span>
        <span class="dir">←</span>
        <span class="ident">{other?.identifier ?? '…'}</span>
        <span class="title">{other?.title ?? ''}</span>
      </button>
    {/each}
    {#each outgoing as rel (rel._id)}
      {@const other = otherIssues.get(String(rel.target))}
      <button class="dep-row" type="button" on:click={() => openEditor(rel)}>
        <span class="kind">{kindCode(rel.kind)}{formatLag(rel.lag)}</span>
        <span class="dir">→</span>
        <span class="ident">{other?.identifier ?? '…'}</span>
        <span class="title">{other?.title ?? ''}</span>
      </button>
    {/each}
  </div>
{/if}

<style lang="scss">
  .empty {
    color: var(--theme-content-trans-color);
    font-size: 12px;
    padding: 4px 0;
  }
  .deps {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dep-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--theme-divider-color);
    border-radius: 4px;
    color: var(--theme-content-color);
    cursor: pointer;
    text-align: left;
    font: inherit;
    width: 100%;
  }
  .dep-row:hover {
    background: var(--theme-button-hovered);
  }
  .kind {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: var(--theme-content-trans-color);
    min-width: 56px;
  }
  .dir {
    font-size: 12px;
    color: var(--theme-content-trans-color);
    min-width: 12px;
  }
  .ident {
    font-weight: 500;
    min-width: 60px;
  }
  .title {
    color: var(--theme-content-trans-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
</style>
