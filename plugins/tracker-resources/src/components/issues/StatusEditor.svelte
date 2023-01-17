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
  import { AttachedData, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { Button, eventToHTMLElement, SelectPopup, showPopup, TooltipAlignment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import IssueStatusIcon from './IssueStatusIcon.svelte'
  import StatusPresenter from './StatusPresenter.svelte'

  export let value: Issue | AttachedData<Issue>
  export let statuses: WithLookup<IssueStatus>[] | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let tooltipAlignment: TooltipAlignment | undefined = undefined

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined

  // Extra properties
  export let issueStatuses: Map<Ref<Team>, WithLookup<IssueStatus>[]> | undefined = undefined

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
  $: selectedStatusLabel = shouldShowLabel ? selectedStatus?.name : undefined
  $: statusesInfo = statuses?.map((s) => {
    return {
      id: s._id,
      component: StatusPresenter,
      props: { value: s, size: 'small' },
      isSelected: selectedStatus?._id === s._id ?? false
    }
  })
  $: if (!statuses) {
    statuses = '_id' in value ? issueStatuses?.get(value.space) : undefined
    if (statuses === undefined) {
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
    } else {
      statusesQuery.unsubscribe()
    }
  }
  $: smallgap = size === 'inline' || size === 'small'
</script>

{#if value && statuses}
  {#if kind === 'list' || kind === 'list-header'}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="flex-row-center flex-no-shrink" class:cursor-pointer={isEditable} on:click={handleStatusEditorOpened}>
      <div class="flex-center flex-no-shrink square-4">
        {#if selectedStatus}<IssueStatusIcon
            value={selectedStatus}
            issueStatuses={statuses}
            size={kind === 'list' ? 'inline' : 'medium'}
          />{/if}
      </div>
      {#if selectedStatusLabel}
        <span
          class="{kind === 'list'
            ? 'ml-1 text-md'
            : 'ml-2 text-base'} overflow-label disabled fs-bold content-accent-color"
        >
          {selectedStatusLabel}
        </span>
      {/if}
    </div>
  {:else}
    <Button
      showTooltip={isEditable ? { label: tracker.string.SetStatus, direction: tooltipAlignment } : undefined}
      disabled={!isEditable}
      {justify}
      {size}
      {kind}
      {width}
      on:click={handleStatusEditorOpened}
    >
      <span slot="content" class="flex-row-center pointer-events-none">
        {#if selectedStatus}
          <IssueStatusIcon value={selectedStatus} size="inline" />
        {/if}
        {#if selectedStatusLabel}
          <span
            class="overflow-label disabled"
            class:ml-1={selectedStatus && smallgap}
            class:ml-2={selectedStatus && !smallgap}
          >
            {selectedStatusLabel}
          </span>
        {/if}
      </span>
    </Button>
  {/if}
{/if}
