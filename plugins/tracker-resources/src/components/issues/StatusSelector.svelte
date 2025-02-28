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
  import { IdMap, Ref, Status, WithLookup } from '@hcengineering/core'
  import { ProjectType, TaskType } from '@hcengineering/task'
  import { typeStore } from '@hcengineering/task-resources'
  import { IssueStatus } from '@hcengineering/tracker'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    IconSize,
    SelectPopup,
    SelectPopupValueType,
    TooltipAlignment,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import IssueStatusIcon from './IssueStatusIcon.svelte'
  import StatusPresenter from './StatusPresenter.svelte'

  export let value: Ref<IssueStatus> | undefined
  export let type: Ref<ProjectType> | undefined
  export let taskType: Ref<TaskType> | undefined = undefined

  let statuses: WithLookup<IssueStatus>[] | undefined = undefined

  export let isEditable: boolean = true
  export let tooltipAlignment: TooltipAlignment | undefined = undefined

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let iconSize: IconSize = 'inline'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined
  export let focusIndex: number | undefined = undefined
  export let short: boolean = false

  const dispatch = createEventDispatcher()

  const changeStatus = async (newStatus: Ref<IssueStatus> | undefined) => {
    if (!isEditable || newStatus === undefined || value === newStatus) {
      return
    }
    value = newStatus
    dispatch('change', newStatus)
  }

  $: statuses = getStatuses($statusStore.byId, $typeStore, type)

  function getStatuses (
    statuses: IdMap<Status>,
    types: IdMap<ProjectType>,
    typeId: Ref<ProjectType> | undefined
  ): IssueStatus[] {
    if (typeId === undefined) return []
    const type = types.get(typeId)
    if (type === undefined) return []
    let vals = type.statuses
    if (taskType !== undefined) {
      vals = vals.filter((it) => it.taskType === taskType)
    }
    return vals
      .filter((it, idx, arr) => arr.findIndex((q) => q._id === it._id) === idx)
      .map((p) => statuses.get(p._id))
      .filter((p) => p !== undefined) as IssueStatus[]
  }

  function getSelectedStatus (
    statuses: WithLookup<IssueStatus>[] | undefined,
    val: Ref<IssueStatus> | undefined
  ): WithLookup<IssueStatus> | undefined {
    if (val === undefined) {
      const st = statuses?.[0]
      if (st) {
        value = st._id
        return st
      }
    }
    const current = statuses?.find((status) => status._id === val)
    return current
  }

  let statusesInfo: SelectPopupValueType[]

  $: selectedStatus = getSelectedStatus(statuses, value)
  $: selectedStatusLabel = selectedStatus?.name
  $: statusesInfo =
    statuses?.map((s) => {
      return {
        id: s._id,
        component: StatusPresenter,
        props: { value: s, size: 'small' },
        isSelected: selectedStatus?._id === s._id
      }
    }) ?? []
  const handleStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }

    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus },
      eventToHTMLElement(event),
      changeStatus
    )
  }

  $: smallgap = size === 'inline' || size === 'small'
</script>

{#if value && statuses}
  <Button
    showTooltip={isEditable ? { label: tracker.string.SetStatus, direction: tooltipAlignment } : undefined}
    disabled={!isEditable}
    {justify}
    {size}
    {kind}
    {width}
    {focusIndex}
    {short}
    on:click={handleStatusEditorOpened}
  >
    <svelte:fragment slot="icon">
      {#if selectedStatus}
        <IssueStatusIcon value={selectedStatus} size={iconSize} space={undefined} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="content">
      {#if selectedStatusLabel}
        <span
          class="overflow-label disabled"
          class:ml-1-5={selectedStatus && smallgap}
          class:ml-2={selectedStatus && !smallgap}
        >
          {selectedStatusLabel}
        </span>
      {/if}
    </svelte:fragment>
  </Button>
{/if}
