<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, addNotification, NotificationSeverity, showPopup } from '@hcengineering/ui'
  import { translate } from '@hcengineering/platform'
  import type { Ref } from '@hcengineering/core'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import { canEditIssue } from '../../utils'
  import DependencyEditor from '../DependencyEditor.svelte'
  import { kindCode } from '../gantt/lib/predecessor-format'
  import { wouldCreateCycle } from '../gantt/lib/scheduler'
  import SelectDependencyIssuePopup from './SelectDependencyIssuePopup.svelte'
  import DependencyDirectionPopup from './DependencyDirectionPopup.svelte'

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
    // Two-step flow: first ask for direction (predecessor vs successor),
    // then open the project-scoped picker. The chooser pattern mirrors
    // HierarchyAddPopup so the "+" affordance is consistent across the
    // hierarchy and dependency panels — neither silently picks a side.
    showPopup(
      DependencyDirectionPopup,
      {},
      'top',
      (dir?: 'predecessor' | 'successor') => {
        if (dir === undefined) return
        pickAndAttach(dir)
      }
    )
  }

  function pickAndAttach (direction: 'predecessor' | 'successor'): void {
    // ignoreObjects must exclude the current issue and any already-existing
    // relations on the chosen side. Outgoing for 'successor', incoming for
    // 'predecessor' — adding an existing edge would just be a duplicate.
    const existingOnSide: Ref<Issue>[] = direction === 'successor'
      ? outgoing.map((r) => r.target)
      : incoming.map((r) => r.attachedTo)
    showPopup(
      SelectDependencyIssuePopup,
      { issue, outgoing: [], extraIgnore: existingOnSide },
      'top',
      async (picked: Issue | undefined | null) => {
        if (picked === undefined || picked === null) return
        // For 'predecessor' direction, the picked issue is the source and
        // the current issue is the target. Cycle check flips the args.
        const sourceId = direction === 'successor' ? issue._id : picked._id
        const targetId = direction === 'successor' ? picked._id : issue._id
        if (wouldCreateCycle(sourceId, targetId, [...incoming, ...outgoing])) {
          const title = await translate(tracker.string.DependencyCycle, {}, undefined)
          addNotification(title, '', undefined as any, undefined, NotificationSeverity.Warning)
          return
        }
        // Permission check on the SOURCE side (per spec §1A) — for the
        // 'predecessor' direction the source is the picked issue, so the
        // user must have edit rights on it.
        const sourceIssue = direction === 'successor' ? issue : picked
        if (!await canEditIssue(sourceIssue)) {
          const title = await translate(tracker.string.GanttDragFailed, {}, undefined)
          addNotification(title, 'No permission on source issue', undefined as any, undefined, NotificationSeverity.Warning)
          return
        }
        const ops = client.apply(undefined, 'add-dependency-from-issue-editor')
        await ops.addCollection(
          tracker.class.IssueRelation,
          sourceIssue.space,
          sourceId,
          tracker.class.Issue,
          'relations',
          { target: targetId, kind: 'finish-to-start', lag: 0 }
        )
        await ops.commit()
      }
    )
  }

  async function removeDependency (rel: IssueRelation): Promise<void> {
    // Same permission check as the editor's Delete button: only the
    // source-side editable user can drop the relation.
    const isOutgoing = String(rel.attachedTo) === String(issue._id)
    const source = isOutgoing ? issue : otherIssues.get(String(rel.attachedTo))
    if (source === undefined) return
    if (!await canEditIssue(source)) return
    const ops = client.apply(undefined, 'remove-dependency-from-issue-editor')
    await ops.removeDoc(tracker.class.IssueRelation, rel.space, rel._id)
    await ops.commit()
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
        <div class="dep-row-wrap">
          <button
            class="dep-row"
            type="button"
            title={(other?.identifier ?? '') + (other !== undefined ? ' — ' : '') + (other?.title ?? '')}
            on:click={() => openEditor(rel)}
          >
            <span class="kind {kindClass(rel.kind)}">{kindCode(rel.kind)}</span>
            {#if rel.lag !== 0}<span class="lag">{formatLag(rel.lag).trim()}</span>{/if}
            <span class="dir">←</span>
            <span class="title">{other?.title ?? '…'}</span>
          </button>
          {#if !readonly}
            <button
              class="del-btn"
              type="button"
              title="Remove dependency"
              on:click|stopPropagation={() => removeDependency(rel)}
            >×</button>
          {/if}
        </div>
      {/each}
    {/if}
    {#if outgoing.length > 0}
      <div class="dep-group-label">
        <Label label={tracker.string.GanttSuccessors} />
      </div>
      {#each outgoing as rel (rel._id)}
        {@const other = otherIssues.get(String(rel.target))}
        <div class="dep-row-wrap">
          <button
            class="dep-row"
            type="button"
            title={(other?.identifier ?? '') + (other !== undefined ? ' — ' : '') + (other?.title ?? '')}
            on:click={() => openEditor(rel)}
          >
            <span class="kind {kindClass(rel.kind)}">{kindCode(rel.kind)}</span>
            {#if rel.lag !== 0}<span class="lag">{formatLag(rel.lag).trim()}</span>{/if}
            <span class="dir">→</span>
            <span class="title">{other?.title ?? '…'}</span>
          </button>
          {#if !readonly}
            <button
              class="del-btn"
              type="button"
              title="Remove dependency"
              on:click|stopPropagation={() => removeDependency(rel)}
            >×</button>
          {/if}
        </div>
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
  .dep-row-wrap {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 4px;
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
    flex: 1;
    min-width: 0;
  }
  .dep-row:hover {
    background: var(--theme-button-hovered);
  }
  .del-btn {
    visibility: hidden;
    background: transparent;
    border: 1px solid var(--theme-divider-color);
    border-radius: 4px;
    color: var(--theme-content-trans-color);
    font-size: 14px;
    line-height: 1;
    width: 22px;
    cursor: pointer;
    padding: 0;
  }
  .dep-row-wrap:hover .del-btn {
    visibility: visible;
  }
  .del-btn:hover {
    background: var(--theme-warning-color, #fef2f2);
    color: var(--theme-error-color, #dc2626);
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
