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
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import chunter from '@hcengineering/chunter'
  import { Employee } from '@hcengineering/contact'
  import core, { Account, AttachedData, Doc, generateId, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { getResource, translate } from '@hcengineering/platform'
  import { Card, createQuery, getClient, KeyedAttribute, SpaceSelector } from '@hcengineering/presentation'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import { calcRank, Issue, IssuePriority, IssueStatus, Project, Sprint, Team } from '@hcengineering/tracker'
  import {
    ActionIcon,
    Button,
    Component,
    DatePresenter,
    EditBox,
    IconAttachment,
    IconMoreH,
    Label,
    Menu,
    showPopup,
    Spinner
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { activeProject, activeSprint } from '../issues'
  import tracker from '../plugin'
  import AssigneeEditor from './issues/AssigneeEditor.svelte'
  import ParentIssue from './issues/ParentIssue.svelte'
  import PriorityEditor from './issues/PriorityEditor.svelte'
  import StatusEditor from './issues/StatusEditor.svelte'
  import EstimationEditor from './issues/timereport/EstimationEditor.svelte'
  import ProjectSelector from './ProjectSelector.svelte'
  import SetDueDateActionPopup from './SetDueDateActionPopup.svelte'
  import SetParentIssueActionPopup from './SetParentIssueActionPopup.svelte'
  import SprintSelector from './sprints/SprintSelector.svelte'

  export let space: Ref<Team>
  export let status: Ref<IssueStatus> | undefined = undefined
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let project: Ref<Project> | null = $activeProject ?? null
  export let sprint: Ref<Sprint> | null = $activeSprint ?? null
  export let relatedTo: Doc | undefined

  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  export let parentIssue: Issue | undefined
  let labels: TagReference[] = []

  let objectId: Ref<Issue> = generateId()
  let object: AttachedData<Issue> = {
    title: '',
    description: '',
    assignee: assignee,
    project: project,
    sprint: sprint,
    number: 0,
    rank: '',
    status: '' as Ref<IssueStatus>,
    priority: priority,
    dueDate: null,
    comments: 0,
    subIssues: 0,
    parents: [],
    reportedTime: 0,
    estimation: 0,
    reports: 0,
    childInfo: []
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

  $: statusesQuery.query(tracker.class.IssueStatus, { attachedTo: _space }, (statuses) => (issueStatuses = statuses), {
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
      assignee: object.assignee,
      project: object.project,
      sprint: object.sprint,
      number: (incResult as any).object.sequence,
      status: object.status,
      priority: object.priority,
      rank: calcRank(lastOne, undefined),
      comments: 0,
      subIssues: 0,
      dueDate: object.dueDate,
      parents: parentIssue
        ? [{ parentId: parentIssue._id, parentTitle: parentIssue.title }, ...parentIssue.parents]
        : [],
      reportedTime: 0,
      estimation: object.estimation,
      reports: 0,
      relations: relatedTo !== undefined ? [{ _id: relatedTo._id, _class: relatedTo._class }] : [],
      childInfo: []
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

    const update = await getResource(chunter.backreference.Update)
    if (relatedTo !== undefined) {
      const doc = await client.findOne(tracker.class.Issue, { _id: objectId })
      await update(doc, 'relations', [relatedTo], await translate(tracker.string.AddedReference, {}))
    }

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
          { value: { ...object, space: _space, attachedTo: parentIssue?._id } },
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

  const handleSprintIdChanged = (sprintId: Ref<Sprint> | null | undefined) => {
    if (sprintId === undefined) {
      return
    }

    object = { ...object, sprint: sprintId }
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
    <div class="flex-row-center">
      <SpaceSelector _class={tracker.class.Team} label={tracker.string.Team} bind:space={_space} />
    </div>
    <!-- <Button
      icon={tracker.icon.Home}
      label={presentation.string.Save}
      size={'small'}
      kind={'no-border'}
      disabled
      on:click={() => {}}
    /> -->
  </svelte:fragment>
  <svelte:fragment slot="title" let:label>
    <div class="flex-row-center gap-1">
      <div class="mr-2">
        <Label {label} />
      </div>
      {#if relatedTo}
        <div class="mr-2">
          <Label label={tracker.string.RelatedTo} />
        </div>
        <Component
          is={view.component.ObjectPresenter}
          props={{ value: relatedTo, _class: relatedTo._class, objectId: relatedTo._id, inline: true }}
        />
      {/if}
    </div>
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
    maxHeight={'card'}
    bind:content={object.description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <svelte:fragment slot="pool">
    <div class="flex flex-wrap" style:gap={'0.2vw'}>
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
          width={'min-content'}
          on:change={({ detail }) => (object.assignee = detail)}
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
        <EstimationEditor kind={'no-border'} size={'small'} value={object} />
        <ProjectSelector value={object.project} onProjectIdChange={handleProjectIdChanged} />
        <SprintSelector value={object.sprint} onSprintIdChange={handleSprintIdChanged} />
        {#if object.dueDate !== null}
          <DatePresenter bind:value={object.dueDate} editable />
        {/if}
      {:else}
        <Spinner size="small" />
      {/if}
    </div>
    <ActionIcon icon={IconMoreH} size={'medium'} action={showMoreActions} />
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
