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
  import { Label } from '@hcengineering/ui'
  import billing from '../plugin'
  import { restrictionStore } from '../stores/restriction'
  import { subscriptionStore } from '../stores/subscription'
  import UsageSection from './UsageSection.svelte'

  $: rState = $restrictionStore
  $: subState = $subscriptionStore

  $: gracePeriodEndsAtDate = rState.gracePeriodEndsAt !== undefined ? new Date(rState.gracePeriodEndsAt) : undefined
  $: formattedDate =
    gracePeriodEndsAtDate !== undefined
      ? gracePeriodEndsAtDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : ''
</script>

<div class="limits-footer-popup p-2">
  <div class="title">
    {#if rState.mode === 'restricted'}
      <Label label={billing.string.LimitExceededRestrictedTitle} />
    {:else}
      <Label label={billing.string.LimitExceededWarningTitle} params={{ date: formattedDate }} />
    {/if}
  </div>
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

  <div class="cta">
    <Label label={billing.string.UpgradePlanCta} />
  </div>
</div>

<style lang="scss">
  .limits-footer-popup {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 18rem;
    max-width: 24rem;

    .title {
      font-weight: 600;
      color: var(--theme-caption-color);
    }
    .hint {
      color: var(--theme-content-color);
      font-size: 0.8125rem;
    }
    .usage {
      margin-top: 0.25rem;
    }
    .cta {
      margin-top: 0.25rem;
      color: var(--theme-link-color, var(--theme-caption-color));
      font-weight: 500;
    }
  }
</style>
