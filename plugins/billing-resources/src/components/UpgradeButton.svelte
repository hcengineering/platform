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
  import { Button } from '@hcengineering/ui'
  import { onMount, onDestroy } from 'svelte'
  import billing from '../plugin'
  import { upgradePlan, isLimitExceeded } from '../utils'

  export let disabled: boolean = false
  export let size: 'medium' | 'small' = 'small'

  let limitExceeded = false
  let pollInterval: number | undefined

  const POLL_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes in milliseconds

  // TODO: Store flag or recommended plan in workspace info
  async function checkLimits (): Promise<void> {
    try {
      limitExceeded = await isLimitExceeded()
    } catch (error) {
      console.error('Error checking limits:', error)
      limitExceeded = false
    }
  }

  async function handleClick (): Promise<void> {
    if (!disabled) {
      void upgradePlan()
    }
  }

  onMount(() => {
    // Initial check
    void checkLimits()

    // Set up polling every 10 minutes
    pollInterval = setInterval(() => {
      void checkLimits()
    }, POLL_INTERVAL_MS)
  })

  onDestroy(() => {
    if (pollInterval !== undefined) {
      clearInterval(pollInterval)
    }
  })
</script>

{#if limitExceeded}
  <div class="px-2">
    <Button
      label={billing.string.UpgradePlan}
      showTooltip={{
        label: billing.string.LimitReached
      }}
      kind="attention"
      {size}
      {disabled}
      on:click={handleClick}
    />
  </div>
{/if}
