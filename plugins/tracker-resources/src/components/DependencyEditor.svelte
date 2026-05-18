<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { translate } from '@hcengineering/platform'
  import { Button, Label, NumberInput, themeStore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import type { IssueRelation } from '@hcengineering/tracker'
  import tracker from '../plugin'
  import { kindCode, kindFromCode } from './gantt/lib/predecessor-format'
  import MiniDependencyDiagram from './dependency/MiniDependencyDiagram.svelte'
  import {
    DIAGRAM_KINDS,
    diagramGridIndex,
    clampLagSlider,
    type DiagramKindCode
  } from './dependency/diagram-helpers'

  /**
   * Popup for editing a single IssueRelation. Opened from
   * GanttDependencyArrow's click handler or the lag pill (both bubble up to
   * GanttView, which calls showPopup with this component). canEdit gates
   * Save and Delete; reads `Permission.UpdateIssue` on the source issue,
   * resolved by the caller (GanttView), same check as connector-dot
   * visibility. Spec §5.
   *
   * kind picker rewritten as a 2×2 grid of mini SVG diagrams
   * (FS / SS / FF / SF). After a pick, the grid collapses to a compact
   * single-diagram view with an inline lag slider; a "Change kind" button
   * re-expands the grid.
   */
  export let relation: IssueRelation
  export let canEdit: boolean
  /**
   * Phase 3c — optional UndoManager. When supplied by GanttView, every
   * successful save/delete pushes a matching UndoEntry. When unset (e.g.
   * future opening from another view), the editor still works but the
   * change is not undoable.
   */
  export let undoManager: import('./gantt/lib/undo-manager').UndoManager | undefined = undefined

  const dispatch = createEventDispatcher<{ close: void }>()
  const client = getClient()

  let kindCodeValue: DiagramKindCode = kindCode(relation.kind)
  let pickKindAriaLabel = ''
  $: void translate(tracker.string.DependencyPickKind, {}, $themeStore.language).then((t) => {
    pickKindAriaLabel = t
  })
  let lagValue: number = relation.lag
  let confirmingDelete = false
  //  — picker stays compact when an existing kind is already set
  // (i.e. when editing an existing relation, which is the common case here
  // since the editor opens from a click on an existing arrow). The "Change
  // kind" button re-expands the grid.
  let pickerExpanded = false
  let gridEl: HTMLDivElement | null = null

  $: dirty = kindFromCode(kindCodeValue) !== relation.kind || lagValue !== relation.lag
  // Slider range is the comfortable UX window; the NumberInput still allows
  // the full storage clamp (-30..+90) so power-users can enter wider values.
  const SLIDER_MIN = -14
  const SLIDER_MAX = 14
  $: sliderValue = clampLagSlider(lagValue, SLIDER_MIN, SLIDER_MAX)
  $: outOfSliderRange = lagValue < SLIDER_MIN || lagValue > SLIDER_MAX

  function clampLag (n: number): number {
    if (Number.isNaN(n)) return 0
    if (n < -30) return -30
    if (n > 90) return 90
    return Math.round(n)
  }

  async function focusKindButton (code: DiagramKindCode): Promise<void> {
    await tick()
    const btn = gridEl?.querySelector<HTMLButtonElement>(`button[data-kind="${code}"]`)
    btn?.focus()
  }

  function pickKind (code: DiagramKindCode): void {
    kindCodeValue = code
    pickerExpanded = false
  }

  function changeKind (): void {
    pickerExpanded = true
    void focusKindButton(kindCodeValue)
  }

  function onGridKeydown (event: KeyboardEvent): void {
    let dir: 'up' | 'down' | 'left' | 'right' | null = null
    if (event.key === 'ArrowUp') dir = 'up'
    else if (event.key === 'ArrowDown') dir = 'down'
    else if (event.key === 'ArrowLeft') dir = 'left'
    else if (event.key === 'ArrowRight') dir = 'right'
    else if (event.key === 'Enter' || event.key === ' ') {
      // Native button activation handles click; only act when the focused
      // element exposes a data-kind. Prevent default to avoid form submit.
      const focused = document.activeElement as HTMLButtonElement | null
      const k = focused?.dataset?.kind as DiagramKindCode | undefined
      if (k !== undefined && DIAGRAM_KINDS.includes(k)) {
        event.preventDefault()
        pickKind(k)
      }
      return
    } else return

    const focused = document.activeElement as HTMLButtonElement | null
    const current = (focused?.dataset?.kind as DiagramKindCode | undefined) ?? kindCodeValue
    const next = diagramGridIndex(current, dir)
    if (next !== null) {
      event.preventDefault()
      void focusKindButton(next)
    }
  }

  function onSliderInput (event: Event): void {
    if (!canEdit) return
    const v = Number((event.target as HTMLInputElement).value)
    lagValue = clampLag(v)
  }

  async function save (): Promise<void> {
    if (!canEdit || !dirty) return
    const before = { kind: relation.kind, lag: relation.lag }
    const after = { kind: kindFromCode(kindCodeValue), lag: clampLag(lagValue) }
    const ops = client.apply(undefined, 'gantt-dependency-edit')
    await ops.update(relation, after)
    const result = await ops.commit()
    if (result.result !== false && undoManager !== undefined) {
      undoManager.push({
        kind: 'relation-edit',
        relationId: relation._id,
        relationSpace: relation.space,
        before,
        after,
        description: `Edit dependency ${String(relation.attachedTo)} → ${String(relation.target)}`
      })
    }
    dispatch('close')
  }

  async function doDelete (): Promise<void> {
    if (!canEdit) return
    // Snapshot the full doc BEFORE delete so undo can re-create it with the
    // exact same _id (matches the deterministic-id pattern used in
    // dependency-create).
    const snapshot = { ...relation }
    const ops = client.apply(undefined, 'gantt-dependency-delete')
    await ops.remove(relation)
    const result = await ops.commit()
    if (result.result !== false && undoManager !== undefined) {
      undoManager.push({
        kind: 'relation-delete',
        relation: snapshot,
        description: `Delete dependency ${String(snapshot.attachedTo)} → ${String(snapshot.target)}`
      })
    }
    dispatch('close')
  }

  function cancel (): void {
    dispatch('close')
  }
</script>

<div class="dep-editor">
  <div class="header">
    <span class="title"><Label label={tracker.string.DependencyEditTitle} /></span>
  </div>

  <div class="row picker-row">
    <span class="label"><Label label={tracker.string.DependencyKind} /></span>
    {#if pickerExpanded}
      <div
        class="kind-grid"
        bind:this={gridEl}
        role="radiogroup"
        tabindex="-1"
        aria-label={pickKindAriaLabel}
        on:keydown={onGridKeydown}
      >
        {#each DIAGRAM_KINDS as code}
          <MiniDependencyDiagram
            kind={code}
            selected={code === kindCodeValue}
            disabled={!canEdit}
            on:pick={(e) => pickKind(e.detail)}
          />
        {/each}
      </div>
    {:else}
      <div class="compact-view">
        <MiniDependencyDiagram kind={kindCodeValue} selected compact disabled />
        <button
          type="button"
          class="change-link"
          disabled={!canEdit}
          on:click={changeKind}
        >
          <Label label={tracker.string.DependencyChangeKind} />
        </button>
      </div>
    {/if}
  </div>

  <div class="row lag-row">
    <span class="label"><Label label={tracker.string.DependencyLag} /></span>
    <div class="lag-controls">
      <input
        type="range"
        class="lag-slider"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step="1"
        value={sliderValue}
        disabled={!canEdit || outOfSliderRange}
        aria-valuemin={SLIDER_MIN}
        aria-valuemax={SLIDER_MAX}
        aria-valuenow={sliderValue}
        on:input={onSliderInput}
      />
      <div class="lag-spinner">
        <NumberInput
          bind:value={lagValue}
          minValue={-30}
          maxValue={90}
          disabled={!canEdit}
        />
      </div>
      <span class="lag-unit">d</span>
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
    max-width: 420px;
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
  .picker-row {
    align-items: flex-start;
  }
  .row .label {
    width: 92px;
    flex-shrink: 0;
    font-size: 13px;
    color: var(--theme-content-color);
    padding-top: 6px;
  }
  .kind-grid {
    display: grid;
    grid-template-columns: repeat(2, auto);
    grid-template-rows: repeat(2, auto);
    gap: 8px;
  }
  .compact-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .change-link {
    background: none;
    border: none;
    color: var(--theme-link-color);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 6px;
    text-decoration: underline;
    &:hover:not([disabled]) {
      color: var(--theme-caption-color);
    }
    &[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  .lag-row {
    align-items: center;
  }
  .lag-row .label {
    padding-top: 0;
  }
  .lag-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  .lag-slider {
    flex: 1;
    min-width: 80px;
    accent-color: var(--theme-link-color);
  }
  .lag-spinner {
    width: 64px;
    flex-shrink: 0;
  }
  .lag-unit {
    font-size: 12px;
    color: var(--theme-darker-color);
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
