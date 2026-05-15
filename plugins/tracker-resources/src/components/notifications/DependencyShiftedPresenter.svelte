<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import type { DependencyShiftedNotification, ShiftedIssuePayload } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'

  /**
   *  — Dependency-Shifted notification presenter.
   *
   * Used as the ObjectPresenter for `tracker.class.DependencyShiftedNotification`.
   * Renders the bundle as:
   *
   *   <Identifier> shifted PROJ-3 — N dependent issues moved
   *     • PROJ-5 (+2 days)
   *     • PROJ-7 (+2 days)
   *
   * The trigger issue is shown in the header; the body lists every shifted
   * issue with a per-issue delta in calendar days. The renderer is read-only —
   * clicking an entry is handled by the surrounding inbox-list shell.
   */
  export let value: DependencyShiftedNotification

  const DAY_MS = 86_400_000

  function deltaDays (entry: ShiftedIssuePayload): number {
    return Math.round(entry.deltaMs / DAY_MS)
  }

  function deltaLabel (days: number): string {
    if (days === 0) return ''
    return days > 0 ? `+${days}d` : `${days}d`
  }
</script>

<div class="depshift">
  <div class="depshift__header">
    <Label
      label={tracker.string.DependencyShiftedHeader}
      params={{ sender: '', trigger: value.triggerIssueIdentifier }}
    />
  </div>
  <div class="depshift__subline">
    <Label
      label={tracker.string.DependencyShiftedMessage}
      params={{ count: value.shiftedIssues.length }}
    />
  </div>
  <ul class="depshift__list">
    {#each value.shiftedIssues as entry (entry.issueId)}
      {@const days = deltaDays(entry)}
      <li class="depshift__item">
        <span class="depshift__identifier">{entry.identifier}</span>
        <span class="depshift__title">{entry.title}</span>
        {#if days !== 0}
          <span class="depshift__delta" class:depshift__delta--positive={days > 0} class:depshift__delta--negative={days < 0}>
            {deltaLabel(days)}
          </span>
        {:else}
          <span class="depshift__delta depshift__delta--neutral">
            <Label label={tracker.string.DependencyShiftedNoChange} />
          </span>
        {/if}
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

    &__delta {
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
      font-weight: 500;

      &--positive {
        color: var(--theme-warning-color, #b58900);
      }

      &--negative {
        color: var(--theme-positive-color, #2aa198);
      }

      &--neutral {
        color: var(--theme-darker-color);
        font-weight: 400;
      }
    }
  }
</style>
