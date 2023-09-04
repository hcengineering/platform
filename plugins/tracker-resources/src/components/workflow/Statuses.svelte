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
  import core, { Class, Data, Ref, SortingOrder, StatusCategory } from '@hcengineering/core'
  import { Card, MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import { createState, getStates } from '@hcengineering/task'
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import { Button, ExpandCollapse, IconAdd, Label, Loading, Scroller, closeTooltip, showPopup } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { flip } from 'svelte/animate'
  import tracker from '../../plugin'
  import RemoveStatus from './RemoveStatus.svelte'
  import StatusEditor from './StatusEditor.svelte'
  import StatusPresenter from './StatusPresenter.svelte'

  export let projectId: Ref<Project>
  export let projectClass: Ref<Class<Project>>

  const client = getClient()
  const dispatch = createEventDispatcher()
  const projectQuery = createQuery()

  let project: Project | undefined
  let statusCategories: StatusCategory[] | undefined

  let editingStatus: IssueStatus | Partial<Data<IssueStatus>> | null = null
  let draggingStatus: IssueStatus | null = null
  let hoveringStatus: IssueStatus | null = null

  let isSaving = false

  async function updateStatusCategories () {
    statusCategories = await client.findAll(
      core.class.StatusCategory,
      { ofAttribute: tracker.attribute.IssueStatus },
      { sort: { order: SortingOrder.Ascending } }
    )
  }

  async function updateProjectDefaultStatus (statusId: Ref<IssueStatus>) {
    if (project) {
      await client.update(project, { defaultIssueStatus: statusId })
    }
  }

  async function addStatus () {
    if (editingStatus?.name && editingStatus?.category && project) {
      isSaving = true
      const id = await createState(client, tracker.class.IssueStatus, {
        ofAttribute: tracker.attribute.IssueStatus,
        name: editingStatus.name,
        description: editingStatus.description,
        color: editingStatus.color,
        category: editingStatus.category
      })
      await client.update(project, { $push: { states: id } })
      isSaving = false
    }

    cancelEditing()
  }

  async function editStatus () {
    if (statusCategories && editingStatus?.name && editingStatus?.category && '_id' in editingStatus) {
      const statusId = '_id' in editingStatus ? editingStatus._id : undefined
      const status = statusId && $statusStore.get(statusId)

      if (!status) {
        return
      }

      const updates: Partial<Data<IssueStatus>> = {}
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
      if (status.name !== editingStatus.name) {
        isSaving = true
        const newId = await createState(client, tracker.class.IssueStatus, {
          ofAttribute: tracker.attribute.IssueStatus,
          name: editingStatus.name,
          description: editingStatus.description,
          color: editingStatus.color,
          category: editingStatus.category
        })
        projectStatuses = projectStatuses.map((s) => (s._id === statusId ? { ...s, _id: newId } : s))
        if (project) {
          const issues = await client.findAll(tracker.class.Issue, { status: status._id, space: projectId })
          await Promise.all(
            issues.map(async (p) => {
              await client.update(p, {
                status: newId
              })
            })
          )
          await client.update(project, { states: projectStatuses.map((s) => s._id) })
        }
        isSaving = false
      } else if (Object.keys(updates).length > 0) {
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
    const issuesWithDeletingStatus = await client.findAll(tracker.class.Issue, { status: status._id, space: projectId })

    if (issuesWithDeletingStatus.length > 0) {
      showPopup(RemoveStatus, {
        issues: issuesWithDeletingStatus,
        projectId,
        status
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
          if (result && project) {
            isSaving = true
            await client.update(project, { $pull: { states: status._id } })

            if (project.defaultIssueStatus === status._id) {
              const newDefaultStatus = projectStatuses.find(
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
    if (status.category === draggingStatus?.category) {
      hoveringStatus = status
      ev.preventDefault()
    }
  }

  async function handleDrop (toItem: IssueStatus) {
    if (draggingStatus != null && draggingStatus?._id !== toItem._id) {
      const fromIndex = getStatusIndex(draggingStatus)
      const toIndex = getStatusIndex(toItem)
      const item = projectStatuses.splice(fromIndex, 1)
      isSaving = true
      projectStatuses = [...projectStatuses.slice(0, toIndex), ...item, ...projectStatuses.slice(toIndex)]
      if (project) {
        await client.update(project, { states: projectStatuses.map((s) => s._id) })
      }
      isSaving = false
    }

    resetDrag()
  }

  function getStatusIndex (status: IssueStatus) {
    return projectStatuses.findIndex(({ _id }) => _id === status._id) ?? -1
  }

  function resetDrag () {
    draggingStatus = null
    hoveringStatus = null
  }

  $: projectQuery.query(projectClass, { _id: projectId }, (result) => ([project] = result), { limit: 1 })
  $: updateStatusCategories()
  $: projectStatuses = getStates(project, $statusStore)
</script>

<Card
  label={tracker.string.ManageWorkflowStatuses}
  onCancel={() => dispatch('close')}
  okAction={() => {}}
  accentHeader
  hideAttachments
  hideFooter
>
  <svelte:fragment slot="subheader">
    {#if project}
      <span class="content-halfcontent-color overflow-label" style:margin-top={'-.5rem'}>{project.name}</span>
    {/if}
  </svelte:fragment>

  {#if project === undefined || statusCategories === undefined || projectStatuses.length === 0}
    <Loading />
  {:else}
    <Scroller>
      <div class="content">
        {#each statusCategories as category}
          {@const statuses = projectStatuses.filter((s) => s.category === category._id) ?? []}
          {@const isSingle = statuses.length === 1}
          <div class="flex-between category-name">
            <Label label={category.label} />
            <Button
              showTooltip={{ label: tracker.string.AddWorkflowStatus }}
              icon={IconAdd}
              size={'medium'}
              kind={'ghost'}
              on:click={() => {
                closeTooltip()
                editingStatus = { category: category._id, color: category.color }
              }}
            />
          </div>
          <div class="flex-col">
            {#each statuses as status (status._id)}
              <div
                class="row"
                class:is-dragged-over-up={draggingStatus &&
                  status._id === hoveringStatus?._id &&
                  draggingStatus.category === status.category &&
                  getStatusIndex(status) < getStatusIndex(draggingStatus)}
                class:is-dragged-over-down={draggingStatus &&
                  status._id === hoveringStatus?._id &&
                  draggingStatus.category === status.category &&
                  getStatusIndex(status) > getStatusIndex(draggingStatus)}
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
                    space={projectId}
                    value={status}
                    isDefault={status._id === project.defaultIssueStatus}
                    {isSingle}
                    on:default-update={({ detail }) => updateProjectDefaultStatus(detail)}
                    on:edit={({ detail }) => {
                      closeTooltip()
                      editingStatus = { ...detail, color: detail.color ?? category.color }
                    }}
                    on:delete={deleteStatus}
                  />
                {/if}
              </div>
            {/each}
            {#if editingStatus && !('_id' in editingStatus) && editingStatus.category === category._id}
              <ExpandCollapse isExpanded>
                <StatusEditor value={editingStatus} on:cancel={cancelEditing} on:save={addStatus} {isSaving} isSingle />
              </ExpandCollapse>
            {/if}
          </div>
        {/each}
      </div>
    </Scroller>
  {/if}
</Card>

<style lang="scss">
  .content {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
    max-width: 54rem;
    min-width: 0;
    min-height: 0;

    .category-name {
      margin: 1rem 0 0.25rem 0;
      text-transform: uppercase;
      font-weight: 500;
      font-size: 0.625rem;
      letter-spacing: 1px;
      color: var(--theme-dark-color);

      &:first-child {
        margin: 0 0 0.25rem 0;
      }
    }
    .row {
      position: relative;

      &.is-dragged-over-up::before {
        position: absolute;
        content: '';
        inset: 0;
        border-top: 1px solid var(--theme-caret-color);
      }
      &.is-dragged-over-down::before {
        position: absolute;
        content: '';
        inset: 0;
        border-bottom: 1px solid var(--theme-caret-color);
      }
    }
    .row + .row {
      margin-top: 0.25rem;
    }
  }
</style>
