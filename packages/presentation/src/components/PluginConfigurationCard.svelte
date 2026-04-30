<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { Icon, IconInfo, Label, Toggle, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import presentation from '../plugin'

  export let label: IntlString
  export let description: IntlString | undefined = undefined
  export let icon: Asset | undefined = undefined
  export let enabled: boolean = true
  export let beta: boolean = false
  export let suffix: string | undefined = undefined
  export let compact: boolean = false

  const dispatch = createEventDispatcher<{ toggle: { enabled: boolean } }>()
</script>

<div class="plugin-card" class:enabled class:plugin-card--compact={compact}>
  <div class="plugin-card__row">
    <span class="plugin-card__icon">
      <Icon icon={icon ?? IconInfo} size={'medium'} />
    </span>
    <span class="plugin-card__label">
      <span class="plugin-card__name">
        <Label {label} />
      </span>
      {#if suffix !== undefined && suffix !== ''}
        <span class="plugin-card__suffix">({suffix})</span>
      {/if}
      {#if compact && description !== undefined}
        <button
          type="button"
          class="plugin-card__info"
          aria-label={'Module description'}
          use:tooltip={{ label: description, direction: 'top' }}
        >
          <Icon icon={IconInfo} size={'small'} />
        </button>
      {/if}
      {#if beta}
        <span class="plugin-card__beta" use:tooltip={{ label: presentation.string.BetaVersion, direction: 'top' }}
          >β</span
        >
      {/if}
    </span>
    <span class="plugin-card__spacer" />
    <Toggle
      on={enabled}
      on:change={(e) => {
        dispatch('toggle', { enabled: e.detail === true })
      }}
    />
  </div>
  {#if !compact && description !== undefined}
    <div class="plugin-card__description">
      <Label label={description} />
    </div>
  {/if}
</div>

<style lang="scss">
  .plugin-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.75rem 0.875rem;
    gap: 0.5rem;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;
    color: var(--theme-content-color);
    transition:
      border-color 120ms ease,
      background-color 120ms ease;

    &:hover {
      border-color: var(--theme-button-border-hover, var(--theme-divider-color));
    }

    &.enabled {
      background-color: var(--theme-button-hovered, var(--theme-button-default));
    }

    // Compact mode collapses the card back to a single fixed-height row;
    // description (if any) lives in a tooltip on the (?) icon.
    &--compact {
      flex-direction: row;
      align-items: center;
      height: 3.25rem;
      padding: 0 0.875rem;
      gap: 0.625rem;
    }
  }

  .plugin-card__row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
  }
  // In compact mode the outer .plugin-card already supplies the row layout —
  // collapse the inner .plugin-card__row so its children become direct flex
  // children of .plugin-card and align with the toggle on the right.
  .plugin-card--compact .plugin-card__row {
    display: contents;
  }

  .plugin-card__icon {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    color: var(--theme-content-color);
  }

  .plugin-card__label {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    flex-grow: 0;
    min-width: 0;
  }

  .plugin-card__name {
    color: var(--theme-caption-color);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plugin-card__suffix {
    color: var(--theme-darker-color);
    font-size: 0.75rem;
  }

  .plugin-card__info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: var(--theme-darker-color);
    cursor: help;

    &:hover,
    &:focus-visible {
      color: var(--theme-content-color);
      background-color: var(--theme-divider-color);
      outline: none;
    }
  }

  .plugin-card__beta {
    color: var(--theme-darker-color);
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.0625rem 0.375rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
  }

  .plugin-card__spacer {
    flex-grow: 1;
  }

  // Indented under the icon column so it visually aligns with the label.
  // Keeps line length comfortable without becoming busy.
  .plugin-card__description {
    color: var(--theme-content-color);
    opacity: 0.75;
    font-size: 0.8125rem;
    line-height: 1.4;
    padding-left: calc(1.25rem + 0.625rem);
  }
</style>
