<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import type { TestRun } from '@hcengineering/test-management'
  import { Label, ProgressCircle, Loading } from '@hcengineering/ui'

  import TestRunResult from './TestRunResult.svelte'
  import { type TestRunStats, getTestRunStats } from '../../testRunUtils'
  import testManagement from '../../plugin'

  export let _id: Ref<TestRun>
  let stats: TestRunStats | undefined = undefined

  let isLoading = true

  getTestRunStats(_id).then((newStats) => {
    stats = newStats
    isLoading = false
  })
</script>

<div class="popupPanel-body__aside-grid">
  <span class="labelOnPanel"><Label label={testManagement.string.TestResults} /> </span>
  {#if !isLoading && stats !== undefined}
    <TestRunResult value={stats} />
  {:else}
    <Loading />
  {/if}
  <span class="labelOnPanel">
    <Label label={testManagement.string.DonePercent} />
  </span>
  {#if !isLoading}
    <div class="flex-row-center content-color text-sm pointer-events-none">
      <div class="mr-1">
        <ProgressCircle value={stats?.done ?? 0} />
      </div>
      {stats?.done ?? 0}
    </div>
  {:else}
    <Loading />
  {/if}
</div>
