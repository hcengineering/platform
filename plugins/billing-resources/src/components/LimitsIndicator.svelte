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
  import { location, tooltip } from '@hcengineering/ui'
  import UsageProgressBar from './UsageProgressBar.svelte'
  import UsagePopup from './UsagePopup.svelte'

  let pollInterval: number | undefined
  let currentWorkspace: string | undefined

  const POLL_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes in milliseconds

  $: state = $subscriptionStore
  $: usageInfo = state.usageInfo
  $: currentTier = state.currentTier
  $: workspace = $location.path[1]

  // Watch for workspace changes
  $: if (workspace !== currentWorkspace) {
    handleWorkspaceChange(workspace)
  }

  // Calculate usage percentages from store data
  $: storageUsed = usageInfo?.usage?.storageBytes ?? 0
  $: trafficUsed = usageInfo?.usage?.livekitTrafficBytes ?? 0
  $: limits = calculateLimits(currentTier)

  $: storagePercent = limits.storageLimit > 0 ? Math.min(storageUsed / limits.storageLimit, 1) : 0
  $: bandwidthPercent = limits.trafficLimit > 0 ? Math.min(trafficUsed / limits.trafficLimit, 1) : 0

  onMount(() => {
    // Initialize with current workspace
    currentWorkspace = workspace

    // Initial check if workspace exists
    if (workspace != null) {
      void checkWorkspaceLimits()

      // Set up polling every 10 minutes
      pollInterval = setInterval(() => {
        void checkWorkspaceLimits()
      }, POLL_INTERVAL_MS)
    }
  })

  onDestroy(() => {
    if (pollInterval !== undefined) {
      clearInterval(pollInterval)
    }
  })

  function handleClick (): void {
    void upgradePlan()
  }

  function handleWorkspaceChange (newWorkspace: string | undefined): void {
    const prevWorkspace = currentWorkspace
    currentWorkspace = newWorkspace

    // Only clean up and refetch if workspace actually changed
    if (prevWorkspace !== newWorkspace) {
      // Clear existing data
      resetSubscriptionStore()
      if (pollInterval !== undefined) {
        clearInterval(pollInterval)
        pollInterval = undefined
      }

      if (newWorkspace != null) {
        void checkWorkspaceLimits()
        pollInterval = setInterval(() => {
          void checkWorkspaceLimits()
        }, POLL_INTERVAL_MS)
      }
    }
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
  <div class="limit-item">
    <UsageProgressBar percent={storagePercent} height="5px" />
  </div>

  <div class="limit-item">
    <UsageProgressBar percent={bandwidthPercent} height="5px" />
  </div>
</button>

<style lang="scss">
  .limits-container {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    border-radius: var(--small-BorderRadius);
    cursor: pointer;
    transition: background-color 0.2s ease;
    padding: 0.25rem;
    border: none;
    background: none;
    outline: none;

    &:hover,
    &:focus {
      background-color: var(--theme-button-hovered);
    }
  }
  .limit-item {
    display: flex;
    align-items: center;
    padding: 0.0625rem;
    border-radius: var(--small-BorderRadius);
    transition: background-color 0.2s ease;
    position: relative;
    border: 1px solid var(--theme-trans-color);
  }
</style>
