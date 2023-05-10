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
  import { Data } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { IssueDraft, IssueTemplate, IssueTemplateChild } from '@hcengineering/tracker'
  import { Button, ButtonKind, ButtonSize, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { EditBoxPopup } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  export let value: IssueTemplateChild | IssueTemplate | Data<IssueTemplate> | IssueDraft
  export let isEditable: boolean = true

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  const handleestimationEditorOpened = (event: MouseEvent) => {
    event.stopPropagation()

    if (!isEditable) {
      return
    }

    showPopup(EditBoxPopup, { value: value.estimation, format: 'number' }, eventToHTMLElement(event), (res) => {
      if (res !== undefined) {
        changeEstimation(res)
      }
    })
  }

  const changeEstimation = async (newEstimation: number | undefined) => {
    if (!isEditable || newEstimation === undefined || value.estimation === newEstimation) {
      return
    }

    if ('_class' in value) {
      await client.update(value, { estimation: newEstimation })
    }
    dispatch('change', newEstimation)
    value.estimation = newEstimation
  }
</script>

{#if value}
  <Button
    showTooltip={isEditable ? { label: tracker.string.Estimation } : undefined}
    label={tracker.string.TimeSpendValue}
    labelParams={{ value: value.estimation }}
    icon={tracker.icon.Estimation}
    notSelected={value.estimation === 0}
    {justify}
    {width}
    {size}
    {kind}
    disabled={!isEditable}
    on:click={handleestimationEditorOpened}
  />
{/if}
