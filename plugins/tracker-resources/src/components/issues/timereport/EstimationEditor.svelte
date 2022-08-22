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
  import { AttachedData } from '@anticrm/core'

  import { getClient } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { Button, ButtonKind, ButtonSize, eventToHTMLElement, Label, showPopup } from '@anticrm/ui'
  import EditBoxPopup from '@anticrm/view-resources/src/components/EditBoxPopup.svelte'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../../plugin'
  import EstimationPopup from './EstimationPopup.svelte'
  import EstimationProgressCircle from './EstimationProgressCircle.svelte'

  export let value: Issue | AttachedData<Issue>
  export let isEditable: boolean = true

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const handleestimationEditorOpened = (event: MouseEvent) => {
    event.stopPropagation()

    if (!isEditable) {
      return
    }

    if (kind === 'list') {
      showPopup(
        EstimationPopup,
        { value: value.estimation, format: 'number', object: value },
        eventToHTMLElement(event),
        (res) => {
          if (res != null) {
            changeEstimation(res)
          }
        }
      )
    } else {
      showPopup(EditBoxPopup, { value, format: 'number' }, eventToHTMLElement(event), (res) => {
        if (res !== undefined) {
          changeEstimation(res)
        }
      })
    }
  }

  const changeEstimation = async (newEstimation: number | undefined) => {
    if (!isEditable || newEstimation === undefined || value.estimation === newEstimation) {
      return
    }

    dispatch('change', newEstimation)

    if ('_id' in value) {
      await client.update(value, { estimation: newEstimation })
    } else {
      value.estimation = newEstimation
    }
  }

  $: childReportTime = (value.childInfo ?? []).map((it) => it.reportedTime).reduce((a, b) => a + b, 0)
  $: childEstimationTime = (value.childInfo ?? []).map((it) => it.estimation).reduce((a, b) => a + b, 0)

  function hourFloor (value: number): number {
    const days = Math.ceil(value)
    const hours = value - days
    return days + Math.floor(hours * 10) / 10
  }
</script>

{#if value}
  {#if kind === 'list'}
    <div class="estimation-container" on:click={handleestimationEditorOpened}>
      <div class="icon">
        <EstimationProgressCircle value={Math.max(value.reportedTime, childReportTime)} max={value.estimation} />
      </div>
      <span class="overflow-label label flex-row-center flex-nowrap text-md">
        {#if value.reportedTime > 0 || childReportTime > 0}
          {#if childReportTime}
            {@const rchildReportTime = hourFloor(childReportTime)}
            {@const reportDiff = rchildReportTime - hourFloor(value.reportedTime)}
            {#if reportDiff !== 0 && value.reportedTime !== 0}
              <div class="flex flex-nowrap mr-1" class:showError={reportDiff > 0}>
                <Label label={tracker.string.TimeSpendValue} params={{ value: rchildReportTime }} />
              </div>
              <div class="romColor">
                (<Label label={tracker.string.TimeSpendValue} params={{ value: hourFloor(value.reportedTime) }} />)
              </div>
            {:else if value.reportedTime === 0}
              <Label label={tracker.string.TimeSpendValue} params={{ value: hourFloor(childReportTime) }} />
            {:else}
              <Label label={tracker.string.TimeSpendValue} params={{ value: hourFloor(value.reportedTime) }} />
            {/if}
          {:else}
            <Label label={tracker.string.TimeSpendValue} params={{ value: hourFloor(value.reportedTime) }} />
          {/if}
          <div class="p-1">/</div>
        {/if}
        {#if childEstimationTime}
          {@const childEstTime = Math.round(childEstimationTime)}
          {@const estimationDiff = childEstTime - Math.round(value.estimation)}
          {#if estimationDiff !== 0}
            <div class="flex flex-nowrap mr-1" class:showWarning={estimationDiff !== 0}>
              <Label label={tracker.string.TimeSpendValue} params={{ value: childEstTime }} />
            </div>
            {#if value.estimation !== 0}
              <div class="romColor">
                (<Label label={tracker.string.TimeSpendValue} params={{ value: hourFloor(value.estimation) }} />)
              </div>
            {/if}
          {:else}
            <Label label={tracker.string.TimeSpendValue} params={{ value: hourFloor(value.estimation) }} />
          {/if}
        {:else}
          <Label label={tracker.string.TimeSpendValue} params={{ value: hourFloor(value.estimation) }} />
        {/if}
      </span>
    </div>
  {:else}
    <Button
      showTooltip={isEditable ? { label: tracker.string.Estimation } : undefined}
      label={tracker.string.TimeSpendValue}
      labelParams={{ value: value.estimation }}
      icon={tracker.icon.Estimation}
      {justify}
      {width}
      {size}
      {kind}
      disabled={!isEditable}
      on:click={handleestimationEditorOpened}
    />
  {/if}
{/if}

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
