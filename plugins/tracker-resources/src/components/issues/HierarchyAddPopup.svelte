<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { Button, IconAdd, Label, Icon } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  /**
   * Two-option chooser for adding a hierarchy edge to the current issue.
   *
   * Direction:
   *   - 'parent' → the picked/new issue becomes the parent of the current one
   *   - 'sub'    → the picked/new issue becomes a child of the current one
   *
   * Dispatches `select` with `'create' | 'link'` and lets the caller route
   * to CreateIssue or to the corresponding ObjectPopup (LinkSubIssueActionPopup
   * for sub-direction, SetParentIssueActionPopup for parent-direction).
   *
   * Why a chooser instead of two side-by-side buttons: the issue editor's
   * left rail is space-constrained and growing it further would push the
   * issue title down on small screens. A single + icon per direction with
   * a follow-up chooser keeps the cold-glance UI compact while preserving
   * discoverability of both flows (the "Link existing" affordance had been
   * undiscoverable as an icon-only ghost button before — see
   * IssueDependenciesPanel + SubIssues commit history 2026-05-12..14).
   */
  export let direction: 'parent' | 'sub'

  const dispatch = createEventDispatcher<{
    close: 'create' | 'link' | undefined
  }>()

  $: titleLabel = direction === 'parent' ? tracker.string.AddParentIssue : tracker.string.AddSubIssue
  $: createLabel = direction === 'parent' ? tracker.string.CreateNewParentIssue : tracker.string.CreateNewSubIssue
  $: linkLabel = direction === 'parent' ? tracker.string.LinkExistingParentIssue : tracker.string.LinkExistingSubIssue

  function onCreate (): void {
    dispatch('close', 'create')
  }
  function onLink (): void {
    dispatch('close', 'link')
  }
</script>

<div class="hier-popup antiPopup">
  <div class="header">
    <Icon icon={tracker.icon.Parent} size={'small'} />
    <span class="title"><Label label={titleLabel} /></span>
  </div>
  <div class="actions">
    <Button
      icon={IconAdd}
      label={createLabel}
      kind={'ghost'}
      justify={'left'}
      width={'100%'}
      on:click={onCreate}
    />
    <Button
      icon={tracker.icon.Parent}
      label={linkLabel}
      kind={'ghost'}
      justify={'left'}
      width={'100%'}
      on:click={onLink}
    />
  </div>
</div>

<style lang="scss">
  .hier-popup {
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
