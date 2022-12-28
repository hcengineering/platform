<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { AttachedData } from '@hcengineering/core'

  import { Issue } from '@hcengineering/tracker'
  import { floorFractionDigits } from '@hcengineering/ui'
  import EstimationProgressCircle from './EstimationProgressCircle.svelte'
  import TimePresenter from './TimePresenter.svelte'

  export let value: Issue | AttachedData<Issue>
  export let estimation: number | undefined = undefined

  $: _estimation = estimation ?? value.estimation

  $: workDayLength = value.workDayLength
  $: childReportTime = floorFractionDigits(
    value.reportedTime + (value.childInfo ?? []).map((it) => it.reportedTime).reduce((a, b) => a + b, 0),
    3
  )
  $: childEstimationTime = (value.childInfo ?? []).map((it) => it.estimation).reduce((a, b) => a + b, 0)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="estimation-container" on:click>
  <div class="icon">
    <EstimationProgressCircle
      value={Math.max(value.reportedTime, childReportTime)}
      max={childEstimationTime || _estimation}
    />
  </div>
  <span class="overflow-label label flex-row-center flex-nowrap text-md">
    {#if value.reportedTime > 0 || childReportTime > 0}
      {#if childReportTime}
        {@const rchildReportTime = childReportTime}
        {@const reportDiff = floorFractionDigits(rchildReportTime - value.reportedTime, 3)}
        {#if reportDiff !== 0 && value.reportedTime !== 0}
          <div class="flex flex-nowrap mr-1" class:showError={reportDiff > 0}>
            <TimePresenter value={rchildReportTime} {workDayLength} />
          </div>
          <div class="romColor">
            (<TimePresenter value={value.reportedTime} {workDayLength} />)
          </div>
        {:else if value.reportedTime === 0}
          <TimePresenter value={childReportTime} {workDayLength} />
        {:else}
          <TimePresenter value={value.reportedTime} {workDayLength} />
        {/if}
      {:else}
        <TimePresenter value={value.reportedTime} {workDayLength} />
      {/if}
      <div class="p-1">/</div>
    {/if}
    {#if childEstimationTime}
      {@const childEstTime = Math.round(childEstimationTime)}
      {@const estimationDiff = childEstTime - Math.round(_estimation)}
      {#if estimationDiff !== 0}
        <div class="flex flex-nowrap mr-1" class:showWarning={estimationDiff !== 0}>
          <TimePresenter value={childEstTime} {workDayLength} />
        </div>
        {#if _estimation !== 0}
          <div class="romColor">
            (<TimePresenter value={_estimation} {workDayLength} />)
          </div>
        {/if}
      {:else}
        <TimePresenter value={_estimation} {workDayLength} />
      {/if}
    {:else}
      <TimePresenter value={_estimation} {workDayLength} />
    {/if}
  </span>
</div>

<style lang="scss">
  .estimation-container {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
    cursor: pointer;

    .icon {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--content-color);
    }
    .label {
      margin-left: 0.5rem;
      font-weight: 500;
      font-size: 0.8125rem;
      color: var(--accent-color);
    }
    &:hover {
      .icon {
        color: var(--caption-color) !important;
      }
    }

    .showError {
      color: var(--error-color) !important;
    }
    .showWarning {
      color: var(--warning-color) !important;
    }
    .romColor {
      color: var(--content-color) !important;
    }
  }
</style>
