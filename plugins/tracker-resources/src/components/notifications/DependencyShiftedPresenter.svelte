<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import type { DependencyShiftedNotification } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'

  /**
   * Dependency-Shifted notification presenter.
   *
   * Used as the ObjectPresenter for `tracker.class.DependencyShiftedNotification`.
   * Renders the bundle as:
   *
   *   <Identifier> shifted PROJ-3 — N dependent issues moved
   *     • PROJ-5  Title of PROJ-5
   *     • PROJ-7  Title of PROJ-7
   *
   * The trigger issue is shown in the header; the body lists which issues moved.
   * It deliberately shows NO per-issue day delta: the pre-shift dates no longer
   * exist server-side once the cascade commits, so any delta would rest on
   * client-reported, unverifiable input. The authentic new dates live on the
   * issues themselves. The renderer is read-only — clicking an entry is handled
   * by the surrounding inbox-list shell.
   */
  export let value: DependencyShiftedNotification
</script>

<div class="depshift">
  <div class="depshift__header">
    <Label
      label={tracker.string.DependencyShiftedHeader}
      params={{ sender: '', trigger: value.triggerIssueIdentifier }}
    />
  </div>
  <div class="depshift__subline">
    <Label label={tracker.string.DependencyShiftedMessage} params={{ count: value.shiftedIssues.length }} />
  </div>
  <ul class="depshift__list">
    {#each value.shiftedIssues as entry (entry.issueId)}
      <li class="depshift__item">
        <span class="depshift__identifier">{entry.identifier}</span>
        <span class="depshift__title">{entry.title}</span>
      </li>
    {/each}
  </ul>
</div>

<style lang="scss">
  .depshift {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;

    &__header {
      font-weight: 600;
      color: var(--theme-caption-color);
    }

    &__subline {
      color: var(--theme-darker-color);
      font-size: 0.75rem;
    }

    &__list {
      list-style: none;
      margin: 0.25rem 0 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    &__item {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      padding: 0.125rem 0;
    }

    &__identifier {
      font-family: var(--mono-font);
      font-weight: 500;
      color: var(--theme-caption-color);
      flex-shrink: 0;
    }

    &__title {
      color: var(--theme-content-color);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
