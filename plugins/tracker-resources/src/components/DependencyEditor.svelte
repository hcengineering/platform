<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Label, NumberInput } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import type { IssueRelation } from '@hcengineering/tracker'
  import tracker from '../plugin'
  import { kindCode, kindFromCode } from './gantt/lib/predecessor-format'

  /**
   * Popup for editing a single IssueRelation. Opened from
   * GanttDependencyArrow's click handler or the lag pill (both bubble up to
   * GanttView, which calls showPopup with this component). canEdit gates
   * Save and Delete; reads `Permission.UpdateIssue` on the source issue,
   * resolved by the caller (GanttView), same check as connector-dot
   * visibility. Spec §5.
   */
  export let relation: IssueRelation
  export let canEdit: boolean

  const dispatch = createEventDispatcher<{ close: void }>()
  const client = getClient()

  let kindCodeValue: 'FS' | 'SS' | 'FF' | 'SF' = kindCode(relation.kind)
  let lagValue: number = relation.lag
  let confirmingDelete = false

  $: dirty = kindFromCode(kindCodeValue) !== relation.kind || lagValue !== relation.lag

  function clampLag (n: number): number {
    if (Number.isNaN(n)) return 0
    if (n < -30) return -30
    if (n > 90) return 90
    return Math.round(n)
  }

  async function save (): Promise<void> {
    if (!canEdit || !dirty) return
    const ops = client.apply(undefined, 'gantt-dependency-edit')
    await ops.update(relation, { kind: kindFromCode(kindCodeValue), lag: clampLag(lagValue) })
    await ops.commit()
    dispatch('close')
  }

  async function doDelete (): Promise<void> {
    if (!canEdit) return
    const ops = client.apply(undefined, 'gantt-dependency-delete')
    await ops.remove(relation)
    await ops.commit()
    dispatch('close')
  }

  function cancel (): void {
    dispatch('close')
  }

  const KIND_OPTIONS: Array<{ code: 'FS' | 'SS' | 'FF' | 'SF', label: typeof tracker.string.DependencyKindFS }> = [
    { code: 'FS', label: tracker.string.DependencyKindFS },
    { code: 'SS', label: tracker.string.DependencyKindSS },
    { code: 'FF', label: tracker.string.DependencyKindFF },
    { code: 'SF', label: tracker.string.DependencyKindSF }
  ]
</script>

<div class="dep-editor">
  <div class="header">
    <span class="title"><Label label={tracker.string.DependencyEditTitle} /></span>
  </div>
  <div class="row">
    <span class="label"><Label label={tracker.string.DependencyKind} /></span>
    <select class="select" bind:value={kindCodeValue} disabled={!canEdit}>
      {#each KIND_OPTIONS as opt}
        <option value={opt.code}><Label label={opt.label} /></option>
      {/each}
    </select>
  </div>
  <div class="row">
    <span class="label"><Label label={tracker.string.DependencyLag} /></span>
    <div class="lag-spinner">
      <NumberInput
        bind:value={lagValue}
        minValue={-30}
        maxValue={90}
        disabled={!canEdit}
      />
    </div>
  </div>

  {#if confirmingDelete}
    <div class="confirm">
      <Label label={tracker.string.DependencyDeleteConfirm} />
      <div class="confirm-buttons">
        <Button kind="regular" label={view.string.Cancel} on:click={() => { confirmingDelete = false }} />
        <Button kind="dangerous" label={tracker.string.DependencyDelete} on:click={doDelete} />
      </div>
    </div>
  {:else}
    <div class="footer">
      <Button kind="dangerous" label={tracker.string.DependencyDelete} disabled={!canEdit} on:click={() => { confirmingDelete = true }} />
      <span class="spacer" />
      <Button kind="regular" label={view.string.Cancel} on:click={cancel} />
      <Button kind="primary" label={view.string.Save} disabled={!canEdit || !dirty} on:click={save} />
    </div>
  {/if}
</div>

<style lang="scss">
  .dep-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    min-width: 320px;
    max-width: 400px;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 8px;
    box-shadow: var(--theme-popup-shadow);
  }
  .header .title {
    font-weight: 600;
    font-size: 14px;
    color: var(--theme-caption-color);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .row .label {
    width: 92px;
    font-size: 13px;
    color: var(--theme-content-color);
  }
  .select {
    flex: 1;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--theme-button-border);
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    border-radius: 4px;
    font-size: 13px;
  }
  .lag-spinner {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }
  .confirm {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border-top: 1px solid var(--theme-divider-color);
  }
  .confirm-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .footer .spacer { flex: 1; }
</style>
