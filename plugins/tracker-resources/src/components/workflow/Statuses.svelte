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
  import { AttachedData, Class, FindResult, Ref, SortingOrder } from '@anticrm/core'
  import { Button, Icon, Label, Panel, Scroller, IconAdd, Loading, closeTooltip } from '@anticrm/ui'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { calcRank, IssueStatus, IssueStatusCategory, Team } from '@anticrm/tracker'
  import view from '@anticrm/view'
  import tracker from '../../plugin'
  import StatusEditor from './StatusEditor.svelte'
  import StatusPresenter from './StatusPresenter.svelte'
  import ExpandCollapse from '@anticrm/ui/src/components/ExpandCollapse.svelte'
  import { getResource } from '@anticrm/platform'

  export let teamId: Ref<Team>
  export let teamClass: Ref<Class<Team>>

  const client = getClient()
  const dispatch = createEventDispatcher()
  const teamQuery = createQuery()
  const statusesQuery = createQuery()

  let team: Team | undefined
  let statusCategories: IssueStatusCategory[] | undefined
  let statusesByCategoryId: Map<Ref<IssueStatusCategory>, IssueStatus[]> | undefined
  let editingStatus: IssueStatus | Partial<AttachedData<IssueStatus>> | null = null
  let isSaving = false

  function updateStatusesByCategoryId (queryResult: FindResult<IssueStatus>) {
    statusesByCategoryId = queryResult.reduce(
      (acc, status) => acc.set(status.category, [...(acc.get(status.category) ?? []), status]),
      new Map<Ref<IssueStatusCategory>, IssueStatus[]>()
    )
    cancelEditing()
  }

  async function updateStatusCategories () {
    statusCategories = await client.findAll(
      tracker.class.IssueStatusCategory,
      {},
      { sort: { order: SortingOrder.Ascending } }
    )
  }

  async function updateDefaultStatus ({ detail: statusId }: CustomEvent<Ref<IssueStatus>>) {
    if (team) {
      await client.update(team, { defaultIssueStatus: statusId })
    }
  }

  async function addStatus () {
    if (editingStatus?.name && editingStatus?.category && statusesByCategoryId) {
      const categoryStatuses = statusesByCategoryId.get(editingStatus.category) ?? []
      const sortedStatuses = [...statusesByCategoryId.values()].flat().sort((a, b) => a.rank.localeCompare(b.rank))
      const prevStatus = categoryStatuses[categoryStatuses.length - 1]
      const nextStatus = sortedStatuses[sortedStatuses.findIndex(({ _id }) => _id === prevStatus._id) + 1]

      isSaving = true
      await client.addCollection(tracker.class.IssueStatus, teamId, teamId, tracker.class.Team, 'issueStatuses', {
        name: editingStatus.name,
        description: editingStatus.description,
        color: editingStatus.color,
        category: editingStatus.category,
        rank: calcRank(prevStatus, nextStatus)
      })
      isSaving = false
    }
  }

  async function editStatus () {
    if (editingStatus?.name && editingStatus?.category && statusesByCategoryId && '_id' in editingStatus) {
      const statusId = '_id' in editingStatus ? editingStatus._id : undefined
      const status = statusId && statusesByCategoryId.get(editingStatus.category)?.find(({ _id }) => _id === statusId)

      if (!status) {
        return
      }

      const updates: Partial<AttachedData<IssueStatus>> = {}
      if (status.name !== editingStatus.name) {
        updates.name = editingStatus.name
      }
      if (status.description !== editingStatus.description) {
        updates.description = editingStatus.description
      }
      if (status.color !== editingStatus.color) {
        updates.color = editingStatus.color
      }

      if (Object.keys(updates).length > 0) {
        isSaving = true
        await client.update(status, updates)
        isSaving = false
      } else {
        cancelEditing()
      }
    }
  }

  async function deleteStatus (event: CustomEvent<IssueStatus>) {
    closeTooltip()

    const deleteAction = await client.findOne(view.class.Action, { _id: view.action.Delete })
    if (deleteAction) {
      const { detail: status } = event
      const impl = await getResource(deleteAction.action)
      impl(status, event, { ...deleteAction.actionProps, action: deleteAction })
    }
  }

  function cancelEditing () {
    editingStatus = null
  }

  $: teamQuery.query(teamClass, { _id: teamId }, (result) => ([team] = result), { limit: 1 })
  $: statusesQuery.query(tracker.class.IssueStatus, { attachedTo: teamId }, updateStatusesByCategoryId, {
    sort: { rank: SortingOrder.Ascending }
  })
  $: updateStatusCategories()
</script>

<Panel isHeader={false} isAside={false} isFullSize on:fullsize on:close={() => dispatch('close')}>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      <div class="wrapped-icon">
        <Icon icon={tracker.icon.Issue} size="small" />
      </div>
      <div class="title-wrapper">
        <span class="wrapped-title">
          <Label label={tracker.string.ManageWorkflowStatuses} />
        </span>
        {#if team}
          <span class="wrapped-subtitle">{team.name}</span>
        {/if}
      </div>
    </div>
  </svelte:fragment>

  {#if team === undefined || statusCategories === undefined || statusesByCategoryId === undefined}
    <Loading />
  {:else}
    <Scroller>
      <div class="popupPanel-body__main-content py-10 clear-mins">
        {#each statusCategories as category}
          {@const statuses = statusesByCategoryId?.get(category._id) ?? []}
          <div class="flex-between category-name">
            <Label label={category.label} />
            <Button
              showTooltip={{ label: tracker.string.AddWorkflowStatus }}
              width="min-content"
              icon={IconAdd}
              size="small"
              kind="transparent"
              on:click={() => {
                closeTooltip()
                editingStatus = { category: category._id, color: category.color }
              }}
            />
          </div>
          <div class="flex-col">
            {#each statuses as status}
              <div class="row">
                {#if editingStatus && '_id' in editingStatus && editingStatus._id === status._id}
                  <StatusEditor value={editingStatus} on:cancel={cancelEditing} on:save={editStatus} />
                {:else}
                  <StatusPresenter
                    value={status}
                    icon={category.icon}
                    isDefault={status._id === team.defaultIssueStatus}
                    canDelete={statuses.length > 1}
                    on:default-update={updateDefaultStatus}
                    on:edit={({ detail }) => {
                      closeTooltip()
                      editingStatus = { ...detail }
                    }}
                    on:delete={deleteStatus}
                  />
                {/if}
              </div>
            {/each}
            <ExpandCollapse duration={400} isExpanded>
              {#if editingStatus && !('_id' in editingStatus) && editingStatus.category === category._id}
                <StatusEditor value={editingStatus} on:cancel={cancelEditing} on:save={addStatus} {isSaving} />
              {/if}
            </ExpandCollapse>
          </div>
        {/each}
      </div>
    </Scroller>
  {/if}
</Panel>

<style lang="scss">
  .row {
    margin-bottom: 0.25rem;
  }

  .category-name {
    margin: 1rem 0 0.5rem 0;

    &:first-child {
      margin: 0 0 0.5rem 0;
    }
  }
</style>
