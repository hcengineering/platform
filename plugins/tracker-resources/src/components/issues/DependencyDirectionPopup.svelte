<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { Button, IconAdd, Label, Icon } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  /**
   * Direction chooser for the Dependencies-panel "+" button. Mirrors the
   * HierarchyAddPopup chooser pattern so the two affordances feel
   * consistent — "+" never silently picks a direction; the user always
   * sees the predecessor/successor choice.
   *
   * Dispatches close with 'predecessor' | 'successor' | undefined.
   *   - 'predecessor' → the picked issue is the predecessor; the CURRENT
   *     issue depends on it (FS arrow points INTO the current issue)
   *   - 'successor' → the picked issue is the successor; it depends on
   *     the current issue (FS arrow points OUT of the current issue)
   */
  const dispatch = createEventDispatcher<{
    close: 'predecessor' | 'successor' | undefined
  }>()

  function pickPredecessor (): void {
    dispatch('close', 'predecessor')
  }
  function pickSuccessor (): void {
    dispatch('close', 'successor')
  }
</script>

<div class="dep-dir-popup antiPopup">
  <div class="header">
    <Icon icon={tracker.icon.Relations} size={'small'} />
    <span class="title"><Label label={tracker.string.AddDependency} /></span>
  </div>
  <div class="actions">
    <Button
      icon={IconAdd}
      label={tracker.string.AddPredecessor}
      kind={'ghost'}
      justify={'left'}
      width={'100%'}
      showTooltip={{ label: tracker.string.AddPredecessorHint, direction: 'bottom' }}
      on:click={pickPredecessor}
    />
    <Button
      icon={IconAdd}
      label={tracker.string.AddSuccessor}
      kind={'ghost'}
      justify={'left'}
      width={'100%'}
      showTooltip={{ label: tracker.string.AddSuccessorHint, direction: 'bottom' }}
      on:click={pickSuccessor}
    />
  </div>
</div>

<style lang="scss">
  .dep-dir-popup {
    display: flex;
    flex-direction: column;
    min-width: 260px;
    padding: 8px;
    gap: 4px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--theme-content-trans-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .title {
    flex: 1;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 4px;
  }
</style>
