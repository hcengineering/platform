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
  import { Employee } from '@anticrm/contact'
  import core, { AttachedData, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import presentation, { Card, createQuery, getClient, SpaceSelector } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { calcRank, Issue, IssuePriority, IssueStatus, Project, Team } from '@anticrm/tracker'
  import {
    Button,
    DatePresenter,
    EditBox,
    IconAttachment,
    showPopup,
    Spinner,
    IconMoreH,
    ActionIcon,
    Menu
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import ParentIssue from './issues/ParentIssue.svelte'
  import SetParentIssueActionPopup from './SetParentIssueActionPopup.svelte'
  import PrioritySelector from './PrioritySelector.svelte'
  import ProjectSelector from './ProjectSelector.svelte'
  import SetDueDateActionPopup from './SetDueDateActionPopup.svelte'
  import AssigneeEditor from './issues/AssigneeEditor.svelte'
  import StatusEditor from './issues/StatusEditor.svelte'

  export let space: Ref<Team>
  export let status: Ref<IssueStatus> | undefined = undefined
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let project: Ref<Project> | null = null

  let currentAssignee: Ref<Employee> | null = assignee
  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  let parentIssue: Issue | undefined

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
      value
    )
  }

  async function showMoreActions (ev: Event) {
    ev.preventDefault()

    const selectDueDate = {
      label: object.dueDate === null ? tracker.string.SetDueDate : tracker.string.ChangeDueDate,
      icon: tracker.icon.DueDate,
      action: async () =>
        showPopup(
          SetDueDateActionPopup,
          { value: object, shouldSaveOnChange: false },
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
          { value: { ...object, space, attachedTo: parentIssue?._id }, shouldSaveOnChange: false },
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

  const handlePriorityChanged = (newPriority: IssuePriority | undefined) => {
    if (newPriority === undefined) {
      return
    }

    object.priority = newPriority
  }

  const handleProjectIdChanged = (projectId: Ref<Project> | null | undefined) => {
    if (projectId === undefined) {
      return
    }

    object = { ...object, project: projectId }
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
  </svelte:fragment>
  <svelte:fragment slot="space">
    <Button
      icon={tracker.icon.Home}
      label={presentation.string.Save}
      size={'small'}
      kind={'no-border'}
      disabled
      on:click={() => {}}
    />
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
  <StyledTextBox
    alwaysEdit
    showButtons={false}
    bind:content={object.description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <svelte:fragment slot="pool">
    {#if issueStatuses}
      <StatusEditor
        value={object}
        statuses={issueStatuses}
        kind="no-border"
        width="min-content"
        size="small"
        shouldShowLabel={true}
        on:change={({ detail }) => (object.status = detail)}
      />
      <PrioritySelector priority={object.priority} onPriorityChange={handlePriorityChanged} />
      <AssigneeEditor
        value={object}
        size="small"
        kind="no-border"
        tooltipFill={false}
        on:change={({ detail }) => (currentAssignee = detail)}
      />
      <!-- <Button
        label={tracker.string.Labels}
        icon={tracker.icon.Labels}
        width="min-content"
        size="small"
        kind="no-border"
      /> -->
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
    <Button icon={IconAttachment} kind={'transparent'} on:click={() => {}} />
  </svelte:fragment>
</Card>
