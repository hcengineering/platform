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
  import { flip } from 'svelte/animate'
  import { AttachedData, Class, Ref, SortingOrder } from '@hcengineering/core'
  import { Button, Icon, Label, Panel, Scroller, IconAdd, Loading, closeTooltip, showPopup } from '@hcengineering/ui'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import { calcRank, IssueStatus, IssueStatusCategory, Project } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import StatusEditor from './StatusEditor.svelte'
  import StatusPresenter from './StatusPresenter.svelte'
  import ExpandCollapse from '@hcengineering/ui/src/components/ExpandCollapse.svelte'

  export let projectId: Ref<Project>
  export let projectClass: Ref<Class<Project>>

  const client = getClient()
  const dispatch = createEventDispatcher()
  const projectQuery = createQuery()
  const statusesQuery = createQuery()

  let project: Project | undefined
  let statusCategories: IssueStatusCategory[] | undefined
  let workflowStatuses: IssueStatus[] | undefined

  let editingStatus: IssueStatus | Partial<AttachedData<IssueStatus>> | null = null
  let draggingStatus: IssueStatus | null = null
  let hoveringStatus: IssueStatus | null = null

  let isSaving = false

  async function updateStatusCategories () {
    statusCategories = await client.findAll(
      tracker.class.IssueStatusCategory,
      {},
      { sort: { order: SortingOrder.Ascending } }
    )
  }

  async function updateProjectDefaultStatus (statusId: Ref<IssueStatus>) {
    if (project) {
      await client.update(project, { defaultIssueStatus: statusId })
    }
  }

  async function addStatus () {
    if (editingStatus?.name && editingStatus?.category && workflowStatuses) {
      const categoryStatuses = workflowStatuses.filter((s) => s.category === editingStatus!.category)
      const prevStatus = categoryStatuses[categoryStatuses.length - 1]
      const nextStatus = workflowStatuses[workflowStatuses.findIndex(({ _id }) => _id === prevStatus._id) + 1]

      isSaving = true
      await client.addCollection(
        tracker.class.IssueStatus,
        projectId,
        projectId,
        tracker.class.Project,
        'issueStatuses',
        {
          name: editingStatus.name,
          description: editingStatus.description,
          color: editingStatus.color,
          category: editingStatus.category,
          rank: calcRank(prevStatus, nextStatus)
        }
      )
      isSaving = false
    }

    cancelEditing()
  }

  async function editStatus () {
    if (
      workflowStatuses &&
      statusCategories &&
      editingStatus?.name &&
      editingStatus?.category &&
      '_id' in editingStatus
    ) {
      const statusId = '_id' in editingStatus ? editingStatus._id : undefined
      const status = statusId && workflowStatuses.find(({ _id }) => _id === statusId)

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
        if (status.color === undefined) {
          const category = statusCategories.find((c) => c._id === editingStatus?.category)

          if (category && editingStatus.color !== category.color) {
            updates.color = editingStatus.color
          }
        } else {
          updates.color = editingStatus.color
        }
      }

      if (Object.keys(updates).length > 0) {
        isSaving = true
        await client.update(status, updates)
        isSaving = false
      }

      cancelEditing()
    }
  }

  async function deleteStatus (event: CustomEvent<IssueStatus>) {
    closeTooltip()

    const { detail: status } = event
    const issuesWithDeletingStatus = await client.findAll(
      tracker.class.Issue,
      { status: status._id },
      { projection: { _id: 1 } }
    )

    if (issuesWithDeletingStatus.length > 0) {
      showPopup(MessageBox, {
        label: tracker.string.DeleteWorkflowStatusError,
        message: tracker.string.DeleteWorkflowStatusErrorDescription,
        params: { status: status.name, count: issuesWithDeletingStatus.length },
        canSubmit: false
      })
    } else {
      showPopup(
        MessageBox,
        {
          label: tracker.string.DeleteWorkflowStatus,
          message: tracker.string.DeleteWorkflowStatusConfirm,
          params: { status: status.name }
        },
        undefined,
        async (result) => {
          if (result && project && workflowStatuses) {
            isSaving = true
            await client.removeDoc(status._class, status.space, status._id)

            if (project.defaultIssueStatus === status._id) {
              const newDefaultStatus = workflowStatuses.find(
                (s) => s._id !== status._id && s.category === status.category
              )
              if (newDefaultStatus?._id) {
                await updateProjectDefaultStatus(newDefaultStatus._id)
              }
            }
            isSaving = false
          }
        }
      )
    }
  }

  function cancelEditing () {
    editingStatus = null
  }

  function handleDragStart (ev: DragEvent, status: IssueStatus) {
    if (ev.dataTransfer && ev.target) {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
      draggingStatus = status
    }
  }

  function handleDragOver (ev: DragEvent, status: IssueStatus) {
    if (draggingStatus?.category === status.category) {
      hoveringStatus = status
      ev.preventDefault()
    } else {
      hoveringStatus = null
    }
  }

  async function handleDrop (toItem: IssueStatus) {
    if (workflowStatuses && draggingStatus?._id !== toItem._id && draggingStatus?.category === toItem.category) {
      const fromIndex = getStatusIndex(draggingStatus)
      const toIndex = getStatusIndex(toItem)
      const [prev, next] = [
        workflowStatuses[fromIndex < toIndex ? toIndex : toIndex - 1],
        workflowStatuses[fromIndex < toIndex ? toIndex + 1 : toIndex]
      ]

      isSaving = true
      await client.update(draggingStatus, { rank: calcRank(prev, next) })
      isSaving = false
    }

    resetDrag()
  }

  function getStatusIndex (status: IssueStatus) {
    return workflowStatuses?.findIndex(({ _id }) => _id === status._id) ?? -1
  }

  function resetDrag () {
    draggingStatus = null
    hoveringStatus = null
  }

  $: projectQuery.query(projectClass, { _id: projectId }, (result) => ([project] = result), { limit: 1 })
  $: statusesQuery.query(tracker.class.IssueStatus, { attachedTo: projectId }, (res) => (workflowStatuses = res), {
    sort: { rank: SortingOrder.Ascending }
  })
  $: updateStatusCategories()
</script>

<Panel isHeader={false} isAside={false} on:fullsize on:close={() => dispatch('close')}>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      <div class="wrapped-icon">
        <Icon icon={tracker.icon.Issue} size="small" />
      </div>
      <div class="title-wrapper">
        <span class="wrapped-title">
          <Label label={tracker.string.ManageWorkflowStatuses} />
        </span>
        {#if project}
          <span class="wrapped-subtitle">{project.name}</span>
        {/if}
      </div>
    </div>
  </svelte:fragment>

  {#if project === undefined || statusCategories === undefined || workflowStatuses === undefined}
    <Loading />
  {:else}
    <Scroller>
      <div class="popupPanel-body__main-content py-10 clear-mins">
        {#each statusCategories as category}
          {@const statuses = workflowStatuses?.filter((s) => s.category === category._id) ?? []}
          {@const isSingle = statuses.length === 1}
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
            {#each statuses as status, _ (status._id)}
              <div
                class="row"
                class:is-dragged-over-up={draggingStatus &&
                  status._id === hoveringStatus?._id &&
                  status.rank < draggingStatus.rank}
                class:is-dragged-over-down={draggingStatus &&
                  status._id === hoveringStatus?._id &&
                  status.rank > draggingStatus.rank}
                draggable={!isSingle}
                animate:flip={{ duration: 200 }}
                on:dragstart={(ev) => handleDragStart(ev, status)}
                on:dragover={(ev) => handleDragOver(ev, status)}
                on:drop={() => handleDrop(status)}
                on:dragend={resetDrag}
              >
                {#if editingStatus && '_id' in editingStatus && editingStatus._id === status._id}
                  <StatusEditor
                    value={editingStatus}
                    on:cancel={cancelEditing}
                    on:save={editStatus}
                    {isSingle}
                    {isSaving}
                  />
                {:else}
                  <StatusPresenter
                    value={status}
                    isDefault={status._id === project.defaultIssueStatus}
                    {isSingle}
                    on:default-update={({ detail }) => updateProjectDefaultStatus(detail)}
                    on:edit={({ detail }) => {
                      closeTooltip()
                      editingStatus = { ...detail, color: detail.color ?? category.color }
                    }}
                    on:delete={deleteStatus}
                    issueStatuses={workflowStatuses}
                  />
                {/if}
              </div>
            {/each}
            <ExpandCollapse duration={200} isExpanded>
              {#if editingStatus && !('_id' in editingStatus) && editingStatus.category === category._id}
                <StatusEditor value={editingStatus} on:cancel={cancelEditing} on:save={addStatus} {isSaving} isSingle />
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
    position: relative;
    margin-bottom: 0.25rem;

    &.is-dragged-over-up::before {
      position: absolute;
      content: '';
      inset: 0;
      border-top: 1px solid var(--caret-color);
    }

    &.is-dragged-over-down::before {
      position: absolute;
      content: '';
      inset: 0;
      border-bottom: 1px solid var(--caret-color);
    }
  }

  .category-name {
    margin: 1rem 0 0.5rem 0;

    &:first-child {
      margin: 0 0 0.5rem 0;
    }
  }
</style>
