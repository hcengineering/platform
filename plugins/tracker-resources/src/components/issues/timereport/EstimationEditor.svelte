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

  import { getClient } from '@hcengineering/presentation'
  import { Issue, IssueDraft } from '@hcengineering/tracker'
  import { Button, ButtonKind, ButtonSize, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { EditBoxPopup, FixedColumn } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../../plugin'
  import EstimationPopup from './EstimationPopup.svelte'
  import EstimationStatsPresenter from './EstimationStatsPresenter.svelte'

  export let value: Issue | AttachedData<Issue> | IssueDraft
  export let isEditable: boolean = true

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined
  export let focusIndex: number | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const handleestimationEditorOpened = (event: MouseEvent) => {
    event.stopPropagation()

    if (!isEditable) {
      return
    }

    if (kind === 'list') {
      showPopup(EstimationPopup, { value: value.estimation, format: 'number', object: value }, 'top')
    } else {
      showPopup(EditBoxPopup, { value: value.estimation, format: 'number' }, eventToHTMLElement(event), (res) => {
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
    if (newEstimation == null) {
      newEstimation = 0
    }

    dispatch('change', newEstimation)

    if ('_class' in value) {
      await client.update(value, { estimation: newEstimation })
    } else {
      value.estimation = newEstimation
    }
  }
</script>

{#if value}
  {#if kind === 'list' && '_class' in value}
    <FixedColumn key="estimation-editor-total">
      <EstimationStatsPresenter {value} {kind} on:click={handleestimationEditorOpened} />
    </FixedColumn>
  {:else}
    <Button
      {focusIndex}
      showTooltip={isEditable ? { label: tracker.string.Estimation } : undefined}
      label={tracker.string.TimeSpendValue}
      notSelected={value.estimation === 0}
      labelParams={{ value: value.estimation }}
      icon={tracker.icon.DueDate}
      {justify}
      {width}
      {size}
      {kind}
      disabled={!isEditable}
      on:click={handleestimationEditorOpened}
    />
  {/if}
{/if}
