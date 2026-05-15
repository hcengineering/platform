<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { Button, Label } from '@hcengineering/ui'
  import { type Issue } from '@hcengineering/tracker'
  import { createEventDispatcher } from 'svelte'
  import view from '@hcengineering/view'
  import tracker from '../../plugin'

  /**
   * Safety prompt shown after a mouse-drag commits but before the actual
   * server write. User feedback 2026-05-11: easy to mis-grab an issue
   * while panning the canvas, so a one-click confirm is a useful guard.
   *
   * The two ViewOptions toggles ganttConfirmMove / ganttConfirmResize
   * (Customize-View → Display) gate whether this popup is shown at all;
   * default-on so first-time users get the safety net.
   */
  export let issue: Issue
  export let kind: 'move' | 'resize'
  export let newStart: number
  export let newDue: number

  const dispatch = createEventDispatcher<{ close: boolean }>()

  function fmt (ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }
</script>

<div class="confirm-popup">
  <div class="header">
    <span class="title">
      <Label label={kind === 'move' ? tracker.string.GanttConfirmMoveTitle : tracker.string.GanttConfirmResizeTitle} />
    </span>
  </div>
  <div class="body">
    <Label
      label={kind === 'move' ? tracker.string.GanttConfirmMoveBody : tracker.string.GanttConfirmResizeBody}
      params={{ title: issue.title, start: fmt(newStart), due: fmt(newDue) }}
    />
  </div>
  <div class="footer">
    <Button
      kind={'regular'}
      label={view.string.Cancel}
      on:click={() => dispatch('close', false)}
    />
    <Button
      kind={'primary'}
      label={tracker.string.GanttConfirmApply}
      on:click={() => dispatch('close', true)}
    />
  </div>
</div>

<style lang="scss">
  .confirm-popup {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    min-width: 320px;
    max-width: 480px;
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
  .body {
    font-size: 13px;
    color: var(--theme-content-color);
    line-height: 1.4;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
</style>
