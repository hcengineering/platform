<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  export let kind: 'normal' | 'list' = 'normal'

  $: _estimation = estimation ?? value.estimation

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
  <span class="overflow-label label flex-row-center flex-nowrap {kind}">
    {#if value.reportedTime > 0 || childReportTime > 0}
      {#if childReportTime}
        {@const rchildReportTime = childReportTime}
        {@const reportDiff = floorFractionDigits(rchildReportTime - value.reportedTime, 3)}
        {#if reportDiff !== 0 && value.reportedTime !== 0}
          <div
            class="flex flex-nowrap"
            class:mr-1={kind !== 'list'}
            class:showError={reportDiff > 0 && kind !== 'list'}
          >
            <TimePresenter value={rchildReportTime} />
          </div>
          {#if kind !== 'list'}
            <div class="romColor">
              (<TimePresenter value={value.reportedTime} />)
            </div>
          {/if}
        {:else if value.reportedTime === 0}
          <TimePresenter value={childReportTime} />
        {:else}
          <TimePresenter value={value.reportedTime} />
        {/if}
      {:else}
        <TimePresenter value={value.reportedTime} />
      {/if}
      <span>/</span>
    {/if}
    {#if childEstimationTime}
      {@const childEstTime = Math.round(childEstimationTime)}
      {@const estimationDiff = childEstTime - Math.round(_estimation)}
      {#if estimationDiff !== 0}
        <div
          class="flex flex-nowrap"
          class:mr-1={kind !== 'list'}
          class:showWarning={estimationDiff !== 0 && kind !== 'list'}
        >
          <TimePresenter value={childEstTime} />
        </div>
        {#if _estimation !== 0 && kind !== 'list'}
          <div class="romColor">
            (<TimePresenter value={_estimation} />)
          </div>
        {/if}
      {:else}
        <TimePresenter value={_estimation} />
      {/if}
    {:else}
      <TimePresenter value={_estimation} />
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
      color: var(--theme-dark-color);
    }
    .label {
      font-size: 0.8125rem;
      margin-left: 0.5rem;

      &.normal {
        color: var(--theme-content-color);
      }
      &.list {
        color: var(--theme-halfcontent-color);
      }
    }
    &:hover {
      .icon {
        color: var(--theme-caption-color) !important;
      }
    }

    .showError {
      color: var(--theme-error-color) !important;
    }
    .showWarning {
      color: var(--theme-warning-color) !important;
    }
    .romColor {
      color: var(--theme-content-color) !important;
    }
  }
</style>
