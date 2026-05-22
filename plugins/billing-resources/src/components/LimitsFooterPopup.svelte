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
  import { createEventDispatcher } from 'svelte'
  import { Button, Label } from '@hcengineering/ui'
  import billing from '../plugin'
  import { restrictionStore } from '../stores/restriction'
  import { subscriptionStore } from '../stores/subscription'
  import { upgradePlan } from '../utils'
  import UsageSection from './UsageSection.svelte'

  const dispatch = createEventDispatcher()

  $: rState = $restrictionStore
  $: subState = $subscriptionStore

  $: gracePeriodEndsAtDate = rState.gracePeriodEndsAt !== undefined ? new Date(rState.gracePeriodEndsAt) : undefined
  $: formattedDate =
    gracePeriodEndsAtDate !== undefined
      ? gracePeriodEndsAtDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : ''

  function handleUpgrade (): void {
    dispatch('close')
    void upgradePlan()
  }
</script>

<div class="limits-footer-popup">
  <div class="header" class:warning={rState.mode === 'warning'} class:restricted={rState.mode === 'restricted'}>
    <div class="title">
      {#if rState.mode === 'restricted'}
        <Label label={billing.string.LimitExceededRestrictedTitle} />
      {:else}
        <Label label={billing.string.LimitExceededWarningTitle} params={{ date: formattedDate }} />
      {/if}
    </div>
  </div>

  <div class="body">
    <div class="hint">
      {#if rState.mode === 'restricted'}
        <Label label={billing.string.LimitExceededRestrictedHint} />
      {:else}
        <Label label={billing.string.LimitExceededWarningHint} params={{ date: formattedDate }} />
      {/if}
    </div>

    {#if subState.usageInfo !== undefined}
      <div class="usage">
        <UsageSection usage={subState.usageInfo} tier={subState.currentTier} />
      </div>
    {/if}

    <div class="footer">
      <Button kind="primary" size="medium" label={billing.string.UpgradePlanCta} on:click={handleUpgrade} />
    </div>
  </div>
</div>

<style lang="scss">
  .limits-footer-popup {
    display: flex;
    flex-direction: column;
    min-width: 20rem;
    max-width: 26rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: var(--small-BorderRadius);
    box-shadow: var(--theme-popup-shadow);
    overflow: hidden;

    .header {
      padding: 0.625rem 0.875rem;
      border-bottom: 1px solid var(--theme-popup-divider);

      .title {
        font-weight: 600;
        color: var(--theme-caption-color);
      }

      &.warning {
        background: var(--theme-warning-color, var(--theme-popup-hover));
        .title {
          color: var(--theme-on-warning-color, var(--theme-caption-color));
        }
      }
      &.restricted {
        background: var(--theme-error-color, var(--theme-popup-hover));
        .title {
          color: var(--theme-on-error-color, #fff);
        }
      }
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.875rem;
    }

    .hint {
      color: var(--theme-content-color);
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
    }
  }
</style>
