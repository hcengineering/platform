<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { onDestroy, onMount } from 'svelte'
  import { checkWorkspaceLimits, upgradePlan, calculateLimits } from '../utils'
  import { subscriptionStore, resetSubscriptionStore } from '../stores/subscription'
  import { location, PaletteColorIndexes, Progress, tooltip } from '@hcengineering/ui'
  import { addEventListener, removeEventListener } from '@hcengineering/platform'
  import workbench from '@hcengineering/workbench'
  import UsagePopup from './UsagePopup.svelte'

  let pollInterval: number | undefined

  const POLL_INTERVAL_MS = 60 * 60 * 1000 // 1 hour in milliseconds

  $: state = $subscriptionStore
  $: usageInfo = state.usageInfo
  $: currentTier = state.currentTier
  $: workspace = $location.path[1]

  const connectionListener = async (): Promise<void> => {
    resetSubscriptionStore()
    if (workspace !== undefined) {
      void checkWorkspaceLimits()
    }
  }

  // Calculate usage percentages from store data
  $: storageUsed = usageInfo?.usage?.storageBytes ?? 0
  $: trafficUsed = usageInfo?.usage?.livekitTrafficBytes ?? 0
  $: limits = calculateLimits(currentTier)

  $: storagePercent = limits.storageLimit > 0 ? Math.min(storageUsed / limits.storageLimit, 1) : 0
  $: bandwidthPercent = limits.trafficLimit > 0 ? Math.min(trafficUsed / limits.trafficLimit, 1) : 0

  $: storageColor = storagePercent >= 0.9 ? PaletteColorIndexes.Firework : undefined
  $: bandwidthColor = bandwidthPercent >= 0.9 ? PaletteColorIndexes.Firework : undefined

  onMount(() => {
    addEventListener(workbench.event.NotifyConnection, connectionListener)

    // Initial check if workspace exists
    if (workspace != null) {
      void checkWorkspaceLimits()

      pollInterval = setInterval(() => {
        void checkWorkspaceLimits()
      }, POLL_INTERVAL_MS)
    }
  })

  onDestroy(() => {
    if (pollInterval !== undefined) {
      clearInterval(pollInterval)
    }
    removeEventListener(workbench.event.NotifyConnection, connectionListener)
  })

  function handleClick (): void {
    void upgradePlan()
  }
</script>

<button
  type="button"
  class="limits-container"
  use:tooltip={{
    component: UsagePopup,
    props: { usage: usageInfo, tier: currentTier },
    direction: 'bottom'
  }}
  on:click={handleClick}
>
  <div class="progress-wrapper">
    <Progress color={storageColor} value={storageUsed} max={limits.storageLimit} fallback={0} small={true} />
  </div>
  <div class="progress-wrapper">
    <Progress color={bandwidthColor} value={trafficUsed} max={limits.trafficLimit} fallback={0} small={true} />
  </div>
</button>

<style lang="scss">
  .limits-container {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    border-radius: var(--extra-small-BorderRadius);
    cursor: pointer;
    transition: background-color 0.2s ease;
    padding: 0.188rem;
    width: 1.75rem;
    border: 1px solid var(--theme-trans-color);
    background: none;
    outline: none;

    &:hover,
    &:focus {
      background-color: var(--theme-button-hovered);
    }
  }

  .progress-wrapper {
    width: 100%;
  }
</style>
