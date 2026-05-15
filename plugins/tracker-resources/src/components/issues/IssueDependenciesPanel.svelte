<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createQuery, getClient, ObjectSearchPopup, type ObjectSearchResult } from '@hcengineering/presentation'
  import { Label, showPopup } from '@hcengineering/ui'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import { canEditIssue } from '../../utils'
  import DependencyEditor from '../DependencyEditor.svelte'
  import { kindCode } from '../gantt/lib/predecessor-format'

  /**
   * Issue-editor side-panel that surfaces every Gantt `IssueRelation`
   * touching the current issue, split into two visually separated
   * groups: "Predecessors" (this issue is the successor, arrow incoming)
   * and "Successors" (this issue is the predecessor, arrow outgoing).
   *
   * Rows open the same `DependencyEditor` popup the Gantt arrows use,
   * so kind/lag can be edited or the relation can be deleted right from
   * the issue detail view. A "+" button picks a target issue via
   * ObjectSearchPopup and writes a default `FS lag=0` IssueRelation —
   * the user can immediately click the new row to refine kind/lag.
   *
   * Two separate live-queries (instead of one $or query) because the
   * CockroachDB adapter doesn't translate top-level $or — same
   * workaround the Gantt view uses for its space-wide relations query.
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
    // Spec §1A: canEdit is determined by the source (predecessor).
    // For outgoing rows the source IS this issue.
    // For incoming rows the source is the other (predecessor) issue —
    // if it hasn't been resolved by the live query yet, default to
    // read-only rather than optimistically granting edit-rights via
    // the viewer's own permission.
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

  function onAddDependency (): void {
    // Ignore-list keeps the picker from showing the current issue and
    // anything we already depend on or that depends on us.
    const ignore: Ref<Issue>[] = [issue._id]
    for (const r of incoming) ignore.push(r.attachedTo)
    for (const r of outgoing) ignore.push(r.target)
    showPopup(
      ObjectSearchPopup,
      {
        _class: tracker.class.Issue,
        ignore,
        label: tracker.string.SelectIssue
      },
      'top',
      async (picked: ObjectSearchResult | undefined) => {
        if (picked === undefined) return
        const target = picked.doc as Issue
        const ops = client.apply(undefined, 'add-dependency-from-issue-editor')
        await ops.addCollection(
          tracker.class.IssueRelation,
          issue.space,
          issue._id,
          tracker.class.Issue,
          'relations',
          { target: target._id, kind: 'finish-to-start', lag: 0 }
        )
        await ops.commit()
      }
    )
  }

  function formatLag (lag: number): string {
    if (lag === 0) return ''
    return lag > 0 ? ` +${lag}d` : ` ${lag}d`
  }

  /** Background colour per dependency kind — matches the four FS/SS/FF/SF
   *  badge colours used in the Gantt predecessor column. */
  function kindClass (kind: IssueRelation['kind']): string {
    switch (kind) {
      case 'finish-to-start': return 'kind-fs'
      case 'start-to-start': return 'kind-ss'
      case 'finish-to-finish': return 'kind-ff'
      case 'start-to-finish': return 'kind-sf'
    }
  }

  $: total = incoming.length + outgoing.length
</script>

<span class="labelTop labelTop--with-action">
  <Label label={tracker.string.Dependencies} />
  {#if !readonly}
    <button
      class="add-btn"
      type="button"
      title="Add dependency"
      on:click={onAddDependency}
    >+</button>
  {/if}
</span>
{#if total === 0}
  <div class="empty">
    <Label label={tracker.string.NoPredecessors} />
  </div>
{:else}
  <div class="deps">
    {#if incoming.length > 0}
      <div class="dep-group-label">
        <Label label={tracker.string.Predecessors} />
      </div>
      {#each incoming as rel (rel._id)}
        {@const other = otherIssues.get(String(rel.attachedTo))}
        <button
          class="dep-row"
          type="button"
          title={other?.title ?? ''}
          on:click={() => openEditor(rel)}
        >
          <span class="kind {kindClass(rel.kind)}">{kindCode(rel.kind)}</span>
          {#if rel.lag !== 0}<span class="lag">{formatLag(rel.lag).trim()}</span>{/if}
          <span class="dir">←</span>
          <span class="ident">{other?.identifier ?? '…'}</span>
          <span class="title">{other?.title ?? ''}</span>
        </button>
      {/each}
    {/if}
    {#if outgoing.length > 0}
      <div class="dep-group-label">
        <Label label={tracker.string.GanttSuccessors} />
      </div>
      {#each outgoing as rel (rel._id)}
        {@const other = otherIssues.get(String(rel.target))}
        <button
          class="dep-row"
          type="button"
          title={other?.title ?? ''}
          on:click={() => openEditor(rel)}
        >
          <span class="kind {kindClass(rel.kind)}">{kindCode(rel.kind)}</span>
          {#if rel.lag !== 0}<span class="lag">{formatLag(rel.lag).trim()}</span>{/if}
          <span class="dir">→</span>
          <span class="ident">{other?.identifier ?? '…'}</span>
          <span class="title">{other?.title ?? ''}</span>
        </button>
      {/each}
    {/if}
  </div>
{/if}

<style lang="scss">
  :global(.labelTop--with-action) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .add-btn {
    background: transparent;
    border: 1px solid var(--theme-divider-color);
    border-radius: 4px;
    color: var(--theme-content-color);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 1px 6px;
    height: 20px;
  }
  .add-btn:hover {
    background: var(--theme-button-hovered);
  }
  .empty {
    color: var(--theme-content-trans-color);
    font-size: 12px;
    padding: 4px 0;
  }
  .deps {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dep-group-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-content-trans-color);
    padding: 6px 0 2px;
  }
  .dep-row {
    display: flex;
    align-items: center;
    gap: 6px;
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
    font-size: 10px;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 3px;
    color: white;
    letter-spacing: 0.5px;
  }
  .kind.kind-fs { background: #6366f1; }
  .kind.kind-ss { background: #8b5cf6; }
  .kind.kind-ff { background: #f59e0b; }
  .kind.kind-sf { background: #ef4444; }
  .lag {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: var(--theme-content-trans-color);
    background: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 3px;
    padding: 0px 3px;
  }
  .dir {
    font-size: 12px;
    color: var(--theme-content-trans-color);
    min-width: 12px;
  }
  .ident {
    font-weight: 500;
    min-width: 60px;
    font-size: 12px;
  }
  .title {
    color: var(--theme-content-trans-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    font-size: 12px;
  }
</style>
