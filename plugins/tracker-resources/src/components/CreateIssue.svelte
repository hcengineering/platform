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
  import contact, { Employee } from '@anticrm/contact'
  import core, { Data, generateId, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import presentation, { Card, createQuery, getClient, SpaceSelector, UserBox } from '@anticrm/presentation'
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
    DatePopup,
    Menu
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import PrioritySelector from './PrioritySelector.svelte'
  import ProjectSelector from './ProjectSelector.svelte'
  import StatusSelector from './StatusSelector.svelte'

  export let space: Ref<Team>
  export let parent: Ref<Issue> | undefined
  export let status: Ref<IssueStatus> | undefined = undefined
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let project: Ref<Project> | null = null

  let currentAssignee: Ref<Employee> | null = assignee
  let issueStatuses: WithLookup<IssueStatus>[] | undefined

  let object: Data<Issue> = {
    title: '',
    description: '',
    assignee: null,
    project: project,
    number: 0,
    rank: '',
    status: '' as Ref<IssueStatus>,
    priority: priority,
    dueDate: null,
    comments: 0
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const statusesQuery = createQuery()
  const taskId: Ref<Issue> = generateId()

  $: _space = space
  $: _parent = parent
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

    const team = await client.findOne(
      tracker.class.Team,
      { _id: teamId },
      { lookup: { defaultIssueStatus: tracker.class.IssueStatus } }
    )
    const teamDefaultIssueStatusId = team?.$lookup?.defaultIssueStatus?._id

    if (teamDefaultIssueStatusId) {
      object.status = teamDefaultIssueStatusId
    }
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

    const value: Data<Issue> = {
      title: getTitle(object.title),
      description: object.description,
      assignee: currentAssignee,
      project: object.project,
      number: (incResult as any).object.sequence,
      status: object.status,
      priority: object.priority,
      rank: calcRank(lastOne, undefined),
      parentIssue: _parent,
      comments: 0,
      dueDate: object.dueDate
    }

    await client.createDoc(tracker.class.Issue, _space, value, taskId)
  }

  async function showMoreActions (ev: Event) {
    ev.preventDefault()

    const selectDueDate = {
      label: object.dueDate === null ? tracker.string.SetDueDate : tracker.string.ChangeDueDate,
      icon: tracker.icon.DueDate,
      action: async () => {
        showPopup(
          DatePopup,
          { mondayStart: true, withTime: false, currentDate: object.dueDate },
          undefined,
          undefined,
          (newDueDate) => newDueDate !== undefined && (object.dueDate = newDueDate)
        )
      }
    }

    showPopup(
      Menu,
      {
        actions: [selectDueDate]
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

  const handleStatusChanged = (statusId: Ref<IssueStatus> | undefined) => {
    if (statusId === undefined) {
      return
    }

    object.status = statusId
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
      <StatusSelector selectedStatusId={object.status} statuses={issueStatuses} onStatusChange={handleStatusChanged} />
      <PrioritySelector priority={object.priority} onPriorityChange={handlePriorityChanged} />
      <UserBox
        _class={contact.class.Employee}
        label={tracker.string.Assignee}
        placeholder={tracker.string.AssignTo}
        bind:value={currentAssignee}
        allowDeselect
        titleDeselect={tracker.string.Unassigned}
      />
      <Button
        label={tracker.string.Labels}
        icon={tracker.icon.Labels}
        width="min-content"
        size="small"
        kind="no-border"
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
    <Button icon={IconAttachment} kind={'transparent'} on:click={() => {}} />
  </svelte:fragment>
</Card>
