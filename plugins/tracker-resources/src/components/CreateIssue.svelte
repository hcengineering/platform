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
  import { Asset, IntlString } from '@anticrm/platform'
  import presentation, { getClient, UserBox, Card, createQuery } from '@anticrm/presentation'
  import { Issue, IssuePriority, IssueStatus, Team, calcRank, Project } from '@anticrm/tracker'
  import { StyledTextBox } from '@anticrm/text-editor'
  import {
    EditBox,
    Button,
    showPopup,
    DatePresenter,
    SelectPopup,
    IconAttachment,
    eventToHTMLElement
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import StatusSelector from './StatusSelector.svelte'
  import PrioritySelector from './PrioritySelector.svelte'
  import ProjectSelector from './ProjectSelector.svelte'

  export let space: Ref<Team>
  export let parent: Ref<Issue> | undefined
  export let status: Ref<IssueStatus> | undefined = undefined
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let project: Ref<Project> | null = null

  let currentAssignee: Ref<Employee> | null = assignee
  let currentProject: Ref<Project> | null = project
  let issueStatuses: WithLookup<IssueStatus>[] = []
  let availableProjects: WithLookup<Project>[] = []

  const object: Data<Issue> = {
    title: '',
    description: '',
    assignee: null,
    project: null,
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
  const projectsQuery = createQuery()
  const taskId: Ref<Issue> = generateId()

  $: _space = space
  $: _parent = parent
  $: updateIssueStatusId(space, status)

  $: statusesQuery.query(
    tracker.class.IssueStatus,
    { attachedTo: space },
    (statuses) => {
      issueStatuses = statuses
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )

  $: projectsQuery.query(
    tracker.class.Project,
    {},
    (projects) => {
      availableProjects = projects
    },
    {
      sort: { modifiedOn: SortingOrder.Ascending }
    }
  )

  $: canSave = getTitle(object.title ?? '').length > 0

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
      project: currentProject,
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

  const moreActions: Array<{ icon: Asset; label: IntlString }> = [
    { icon: tracker.icon.DueDate, label: tracker.string.SetDueDate },
    { icon: tracker.icon.Parent, label: tracker.string.Parent }
  ]

  const handlePriorityChanged = (newPriority: IssuePriority | undefined) => {
    if (newPriority === undefined) {
      return
    }

    object.priority = newPriority
  }

  const handleStatusChanged = (statusId: Ref<IssueStatus> | undefined) => {
    if (statusId !== undefined) {
      object.status = statusId
    }
  }
</script>

<Card
  label={tracker.string.NewIssue}
  okAction={createIssue}
  {canSave}
  okLabel={tracker.string.SaveIssue}
  spaceClass={tracker.class.Team}
  spaceLabel={tracker.string.Team}
  spacePlaceholder={tracker.string.SelectTeam}
  createMore={false}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
>
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
    <ProjectSelector bind:value={currentProject} projects={availableProjects} />
    <DatePresenter bind:value={object.dueDate} editable />
    <Button
      icon={tracker.icon.MoreActions}
      width="min-content"
      size="small"
      kind="transparent"
      on:click={(ev) => {
        showPopup(SelectPopup, { value: moreActions }, eventToHTMLElement(ev))
      }}
    />
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button icon={IconAttachment} kind={'transparent'} on:click={() => {}} />
  </svelte:fragment>
</Card>
