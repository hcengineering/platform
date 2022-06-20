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
  import { createEventDispatcher } from 'svelte'
  import { AttachedData, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Issue, IssueStatus } from '@anticrm/tracker'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Button, showPopup, SelectPopup, TooltipAlignment, eventToHTMLElement } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import tracker from '../../plugin'

  export let value: Issue | AttachedData<Issue>
  export let statuses: WithLookup<IssueStatus>[] | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let tooltipAlignment: TooltipAlignment | undefined = undefined

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined

  const client = getClient()
  const statusesQuery = createQuery()
  const dispatch = createEventDispatcher()

  const changeStatus = async (newStatus: Ref<IssueStatus> | undefined) => {
    if (!isEditable || newStatus === undefined || value.status === newStatus) {
      return
    }

    dispatch('change', newStatus)

    if ('_id' in value) {
      await client.update(value, { status: newStatus })
    }
  }

  const handleStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }

    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      eventToHTMLElement(event),
      changeStatus
    )
  }

  $: selectedStatus = statuses?.find((status) => status._id === value.status) ?? statuses?.[0]
  $: selectedStatusIcon = selectedStatus?.$lookup?.category?.icon
  $: selectedStatusLabel = shouldShowLabel ? selectedStatus?.name : undefined
  $: statusesInfo = statuses?.map((s) => ({ id: s._id, text: s.name, color: s.color, icon: s.$lookup?.category?.icon }))
  $: if (!statuses) {
    const query = '_id' in value ? { attachedTo: value.space } : {}
    statusesQuery.query(
      tracker.class.IssueStatus,
      query,
      (result) => {
        statuses = result
      },
      {
        lookup: { category: tracker.class.IssueStatusCategory },
        sort: { rank: SortingOrder.Ascending }
      }
    )
  }
</script>

{#if value && statuses}
  {#if selectedStatusLabel}
    <Button
      showTooltip={isEditable ? { label: tracker.string.SetStatus, direction: tooltipAlignment } : undefined}
      icon={selectedStatusIcon}
      disabled={!isEditable}
      {justify}
      {size}
      {kind}
      {width}
      on:click={handleStatusEditorOpened}
    >
      <span slot="content" class="overflow-label disabled">{selectedStatusLabel}</span>
    </Button>
  {:else}
    <Button
      showTooltip={isEditable ? { label: tracker.string.SetStatus, direction: tooltipAlignment } : undefined}
      icon={selectedStatusIcon}
      disabled={!isEditable}
      {justify}
      {size}
      {kind}
      {width}
      on:click={handleStatusEditorOpened}
    />
  {/if}
{/if}
