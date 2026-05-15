<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// Tier-2 #7 — Saved Gantt-Views.
// Modal popup for creating a new Gantt-saved-view from the current state.
// Fields: name (required), "Zeitfenster fixieren" checkbox, public toggle.
// The GanttView toolbar opens this popup via showPopup() and reads the
// emitted detail to call its own saveCurrentGanttView() handler.
//
// Mirrors the layout of plugins/view-resources/src/components/filter/
// FilterSave.svelte (the platform-standard save dialog) so PMs don't see
// two visually-divergent save flows depending on the viewlet.
-->
<script lang="ts">
  import { Card } from '@hcengineering/presentation'
  import { Button, EditBox, ToggleWithLabel, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  // Defaults reflect the spec: "Zeitfenster fixieren" is OFF by default
  // (only zoom is restored on open). Public toggle is ON by default,
  // matching the FilterSave.svelte default — the workspace-shared
  // pattern is more useful than purely private views.
  export let fixTimeWindow: boolean = false
  export let sharable: boolean = true

  let viewName: string = ''

  const dispatch = createEventDispatcher()

  async function onSave (): Promise<void> {
    const trimmed = viewName.trim()
    if (trimmed.length === 0) return
    dispatch('close', { name: trimmed, fixTimeWindow, sharable })
  }
</script>

<Card
  label={tracker.string.GanttSavedViewNew}
  okAction={onSave}
  canSave={viewName.trim().length > 0}
  okLabel={tracker.string.GanttSavedViewSave}
  gap={'gapV-4'}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button icon={view.icon.Views} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <div class="clear-mins flex-grow">
      <EditBox
        placeholder={tracker.string.GanttSavedViewNamePlaceholder}
        bind:value={viewName}
        kind={'large-style'}
        autoFocus
        focusIndex={1}
      />
    </div>
  </div>
  <div class="popup-section">
    <ToggleWithLabel bind:on={fixTimeWindow} label={tracker.string.GanttSavedViewFixTimeWindow} />
    <div class="popup-hint">
      <Label label={tracker.string.GanttSavedViewFixTimeWindowHint} />
    </div>
  </div>
  <div class="popup-section">
    <ToggleWithLabel bind:on={sharable} label={tracker.string.GanttSavedViewPublic} />
  </div>
</Card>

<style lang="scss">
  .popup-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }
  .popup-hint {
    font-size: 12px;
    opacity: 0.7;
    padding-left: 2.5rem;
  }
</style>
