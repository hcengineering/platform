<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { WithLookup } from '@hcengineering/core'
  import { Button, Label } from '@hcengineering/ui'
  import { type Issue } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import StatusEditor from '../issues/StatusEditor.svelte'
  import PriorityEditor from '../issues/PriorityEditor.svelte'
  import AssigneeEditor from '../issues/AssigneeEditor.svelte'
  import StartDateEditor from '../issues/StartDateEditor.svelte'
  import DueDateEditor from '../issues/DueDateEditor.svelte'

  /**
   * Phase 1.E — lightweight popover surfaced by single-click on a Gantt bar
   * when ganttQuickInfoOnClick is true. Reuses the existing Tracker editors
   * so inline-edit UX matches the full editor. Double-click anywhere in the
   * Gantt continues to open the full editor.
   *
   * Dispatches close with payload 'openFull' when the "Open full editor"
   * button is clicked; the showPopup caller routes that to the regular
   * EditIssue panel. Otherwise close is dispatched without payload.
   */
  export let issue: Issue

  // StartDateEditor / DueDateEditor expect WithLookup<Issue>; cast once here
  // rather than using `as` inside template expressions (not supported in Svelte 4).
  $: issueWithLookup = issue as WithLookup<Issue>

  const dispatch = createEventDispatcher<{ close: 'openFull' | undefined }>()
</script>

<div class="quick-info antiPopup">
  <header class="quick-info__header">
    <span class="ident">{issue.identifier}</span>
    <span class="title">{issue.title}</span>
  </header>

  <div class="quick-info__row">
    <span class="label"><Label label={tracker.string.Status}/></span>
    <StatusEditor value={issue} kind="link" isEditable={true} />
  </div>

  <div class="quick-info__row">
    <span class="label"><Label label={tracker.string.Priority}/></span>
    <PriorityEditor value={issue} kind="link" isEditable={true} />
  </div>

  <div class="quick-info__row">
    <span class="label"><Label label={tracker.string.Assignee}/></span>
    <AssigneeEditor object={issue} kind="link" width="100%" />
  </div>

  <div class="quick-info__row">
    <span class="label"><Label label={tracker.string.IssueStartDate}/></span>
    <StartDateEditor value={issueWithLookup} width="100%" editable={true} />
  </div>

  <div class="quick-info__row">
    <span class="label"><Label label={tracker.string.DueDate}/></span>
    <DueDateEditor value={issueWithLookup} width="100%" editable={true} />
  </div>

  <footer class="quick-info__footer">
    <Button
      kind="ghost"
      label={tracker.string.QuickInfoOpenFullEditor}
      on:click={() => {
        dispatch('close', 'openFull')
      }}
    />
  </footer>
</div>

<style lang="scss">
  .quick-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    min-width: 280px;
    max-width: 360px;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 8px;
    box-shadow: var(--theme-popup-shadow);
  }
  .quick-info__header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--theme-divider-color);
    .ident {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: var(--theme-content-trans-color);
    }
    .title {
      font-weight: 600;
      font-size: 14px;
      color: var(--theme-caption-color);
    }
  }
  .quick-info__row {
    display: grid;
    grid-template-columns: 86px 1fr;
    align-items: center;
    gap: 8px;
    .label {
      font-size: 12px;
      color: var(--theme-content-trans-color);
    }
  }
  .quick-info__footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 6px;
    border-top: 1px solid var(--theme-divider-color);
  }
</style>
