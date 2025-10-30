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
  import { Tier } from '@hcengineering/billing'
  import { UsageStatus } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import plugin from '../plugin'
  import UsageProgress from './UsageProgress.svelte'

  export let usage: UsageStatus
  export let tier: Tier | undefined

  $: storageUsedBytes = usage.usage.storageBytes ?? 0
  $: trafficUsedBytes = usage.usage.livekitTrafficBytes ?? 0
  $: storageLimitBytes = (tier?.storageLimitGB ?? 0) * 1000 * 1000 * 1000
  $: trafficLimitBytes = (tier?.trafficLimitGB ?? 0) * 1000 * 1000 * 1000
</script>

<div class="flex-col flex-gap-2">
  <div class="fs-bold">
    <Label label={plugin.string.Usage} />
  </div>

  <UsageProgress label={plugin.string.StorageUsage} value={storageUsedBytes} limit={storageLimitBytes} />

  <UsageProgress label={plugin.string.TrafficUsage} value={trafficUsedBytes} limit={trafficLimitBytes} />
</div>
