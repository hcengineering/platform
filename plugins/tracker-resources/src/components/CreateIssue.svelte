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
  import { AttachmentStyledBox } from '@anticrm/attachment-resources'
  import { Employee } from '@anticrm/contact'
  import core, { Account, AttachedData, Doc, generateId, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Card, createQuery, getClient, KeyedAttribute, SpaceSelector } from '@anticrm/presentation'
  import { calcRank, Issue, IssuePriority, IssueStatus, Project, Team } from '@anticrm/tracker'
  import tags, { TagElement, TagReference } from '@anticrm/tags'
  import {
    ActionIcon,
    Button,
    Component,
    DatePresenter,
    EditBox,
    IconAttachment,
    IconMoreH,
    Menu,
    showPopup,
    Spinner
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import AssigneeEditor from './issues/AssigneeEditor.svelte'
  import ParentIssue from './issues/ParentIssue.svelte'
  import PriorityEditor from './issues/PriorityEditor.svelte'
  import StatusEditor from './issues/StatusEditor.svelte'
  import ProjectSelector from './ProjectSelector.svelte'
  import SetDueDateActionPopup from './SetDueDateActionPopup.svelte'
  import SetParentIssueActionPopup from './SetParentIssueActionPopup.svelte'

  export let space: Ref<Team>
  export let status: Ref<IssueStatus> | undefined = undefined
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let project: Ref<Project> | null = null

  let currentAssignee: Ref<Employee> | null = assignee
  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  let parentIssue: Issue | undefined
  let labels: TagReference[] = []

  let objectId: Ref<Issue> = generateId()
  let object: AttachedData<Issue> = {
    title: '',
    description: '',
    assignee: null,
    project: project,
    number: 0,
    rank: '',
    status: '' as Ref<IssueStatus>,
    priority: priority,
    dueDate: null,
    comments: 0,
    subIssues: 0
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const statusesQuery = createQuery()

  let descriptionBox: AttachmentStyledBox

  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.Issue, 'labels')
  }

  $: _space = space
  $: updateIssueStatusId(space, status)
  $: canSave = getTitle(object.title ?? '').length > 0

  $: statusesQuery.query(tracker.class.IssueStatus, { attachedTo: space }, (statuses) => (issueStatuses = statuses), {
    lookup: { category: tracker.class.IssueStatusCategory },
    sort: { rank: SortingOrder.Ascending }
  })

  async function updateIssueStatusId (teamId: Ref<Team>, issueStatusId?: Ref<IssueStatus>) {
    if (issueStatusId !== undefined) {
      object.status = issueStatusId
      return
    }

    const team = await client.findOne(tracker.class.Team, { _id: teamId })

    if (team?.defaultIssueStatus) {
      object.status = team.defaultIssueStatus
    }
  }

  function clearParentIssue () {
    parentIssue = undefined
  }

  function getTitle (value: string) {
    return value.trim()
  }

  export function canClose (): boolean {
    return !canSave
  }

  async function createIssue () {
    if (!canSave) {
      return
    }

    const lastOne = await client.findOne<Issue>(
      tracker.class.Issue,
      { status: object.status },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.updateDoc(
      tracker.class.Team,
      core.space.Space,
      _space,
      {
        $inc: { sequence: 1 }
      },
      true
    )

    const value: AttachedData<Issue> = {
      title: getTitle(object.title),
      description: object.description,
      assignee: currentAssignee,
      project: object.project,
      number: (incResult as any).object.sequence,
      status: object.status,
      priority: object.priority,
      rank: calcRank(lastOne, undefined),
      comments: 0,
      subIssues: 0,
      dueDate: object.dueDate
    }

    await client.addCollection(
      tracker.class.Issue,
      _space,
      parentIssue?._id ?? tracker.ids.NoParent,
      parentIssue?._class ?? tracker.class.Issue,
      'subIssues',
      value,
      objectId
    )
    for (const label of labels) {
      await client.addCollection(label._class, label.space, objectId, tracker.class.Issue, 'labels', {
        title: label.title,
        color: label.color,
        tag: label.tag
      })
    }
    await descriptionBox.createAttachments()
    objectId = generateId()
  }

  async function showMoreActions (ev: Event) {
    ev.preventDefault()

    const selectDueDate = {
      label: object.dueDate === null ? tracker.string.SetDueDate : tracker.string.ChangeDueDate,
      icon: tracker.icon.DueDate,
      action: async () =>
        showPopup(
          SetDueDateActionPopup,
          { value: object },
          'top',
          undefined,
          (newDueDate) => newDueDate !== undefined && (object.dueDate = newDueDate)
        )
    }

    const setParentIssue = {
      label: parentIssue ? tracker.string.ChangeParent : tracker.string.SetParent,
      icon: tracker.icon.Parent,
      action: async () =>
        showPopup(
          SetParentIssueActionPopup,
          { value: { ...object, space, attachedTo: parentIssue?._id } },
          'top',
          (selectedIssue) => selectedIssue !== undefined && (parentIssue = selectedIssue)
        )
    }

    const removeParentIssue = parentIssue && {
      label: tracker.string.RemoveParent,
      icon: tracker.icon.Parent,
      action: clearParentIssue
    }

    showPopup(
      Menu,
      {
        actions: [selectDueDate, setParentIssue, ...(removeParentIssue ? [removeParentIssue] : [])]
      },
      ev.target as HTMLElement
    )
  }

  const handleProjectIdChanged = (projectId: Ref<Project> | null | undefined) => {
    if (projectId === undefined) {
      return
    }

    object = { ...object, project: projectId }
  }

  function addTagRef (tag: TagElement): void {
    labels = [
      ...labels,
      {
        _class: tags.class.TagReference,
        _id: generateId() as Ref<TagReference>,
        attachedTo: '' as Ref<Doc>,
        attachedToClass: tracker.class.Issue,
        collection: 'labels',
        space: tags.space.Tags,
        modifiedOn: 0,
        modifiedBy: '' as Ref<Account>,
        title: tag.title,
        tag: tag._id,
        color: tag.color
      }
    ]
  }
</script>

<Card
  label={tracker.string.NewIssue}
  okAction={createIssue}
  {canSave}
  okLabel={tracker.string.SaveIssue}
  on:close={() => {
    dispatch('close')
  }}
  createMore={false}
>
  <svelte:fragment slot="header">
    <SpaceSelector _class={tracker.class.Team} label={tracker.string.Team} bind:space={_space} />
    <!-- <Button
      icon={tracker.icon.Home}
      label={presentation.string.Save}
      size={'small'}
      kind={'no-border'}
      disabled
      on:click={() => {}}
    /> -->
  </svelte:fragment>
  {#if parentIssue}
    <ParentIssue issue={parentIssue} on:close={clearParentIssue} />
  {/if}
  <EditBox
    bind:value={object.title}
    placeholder={tracker.string.IssueTitlePlaceholder}
    maxWidth={'37.5rem'}
    kind={'large-style'}
    focus
  />
  <AttachmentStyledBox
    bind:this={descriptionBox}
    {objectId}
    _class={tracker.class.Issue}
    space={_space}
    alwaysEdit
    showButtons={false}
    bind:content={object.description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <svelte:fragment slot="pool">
    {#if issueStatuses}
      <div id="status-editor">
        <StatusEditor
          value={object}
          statuses={issueStatuses}
          kind="no-border"
          size="small"
          shouldShowLabel={true}
          on:change={({ detail }) => (object.status = detail)}
        />
      </div>
      <PriorityEditor
        value={object}
        shouldShowLabel
        isEditable
        kind="no-border"
        size="small"
        justify="center"
        on:change={({ detail }) => (object.priority = detail)}
      />
      <AssigneeEditor
        value={object}
        size="small"
        kind="no-border"
        on:change={({ detail }) => (currentAssignee = detail)}
      />
      <Component
        is={tags.component.TagsDropdownEditor}
        props={{
          items: labels,
          key,
          targetClass: tracker.class.Issue,
          countLabel: tracker.string.NumberLabels
        }}
        on:open={(evt) => {
          addTagRef(evt.detail)
        }}
        on:delete={(evt) => {
          labels = labels.filter((it) => it._id !== evt.detail)
        }}
      />
      <ProjectSelector value={object.project} onProjectIdChange={handleProjectIdChanged} />
      {#if object.dueDate !== null}
        <DatePresenter bind:value={object.dueDate} editable />
      {/if}
      <ActionIcon icon={IconMoreH} size={'medium'} action={showMoreActions} />
    {:else}
      <Spinner size="small" />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      kind={'transparent'}
      on:click={() => {
        descriptionBox.attach()
      }}
    />
  </svelte:fragment>
</Card>
