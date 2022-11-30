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
  import { deepEqual } from 'fast-equals'
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import chunter from '@hcengineering/chunter'
  import { Employee } from '@hcengineering/contact'
  import core, {
    Account,
    AttachedData,
    Data,
    Doc,
    generateId,
    Ref,
    SortingOrder,
    WithLookup
  } from '@hcengineering/core'
  import { getResource, translate } from '@hcengineering/platform'
  import { Card, createQuery, getClient, KeyedAttribute, MessageBox, SpaceSelector } from '@hcengineering/presentation'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import {
    calcRank,
    Issue,
    IssueDraft,
    IssuePriority,
    IssueStatus,
    IssueTemplate,
    IssueTemplateChild,
    Project,
    Sprint,
    Team,
    TimeReportDayType,
    WorkDayLength
  } from '@hcengineering/tracker'
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
    setMetadataLocalStorage,
    showPopup,
    Spinner,
    NotificationPosition,
    NotificationSeverity,
    Notification,
    notificationsStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { activeProject, activeSprint, updateIssueRelation } from '../issues'
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
  import IssueTemplateChilds from './templates/IssueTemplateChilds.svelte'
  import attachment from '@hcengineering/attachment-resources/src/plugin'
  import IssueNotification from './issues/IssueNotification.svelte'

  export let space: Ref<Team>
  export let status: Ref<IssueStatus> | undefined = undefined
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let project: Ref<Project> | null = $activeProject ?? null
  export let sprint: Ref<Sprint> | null = $activeSprint ?? null
  export let relatedTo: Doc | undefined
  export let shouldSaveDraft: boolean = false
  export let draft: IssueDraft | null
  export let parentIssue: Issue | undefined
  export let originalIssue: Issue | undefined
  export let onDraftChanged: (draft: Data<IssueDraft>) => void

  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  let labels: TagReference[] = draft?.labels || []
  let objectId: Ref<Issue> = draft?.issueId || generateId()
  let currentTeam: Team | undefined

  function toIssue (initials: AttachedData<Issue>, draft: IssueDraft | null): AttachedData<Issue> {
    if (draft == null) {
      return { ...initials }
    }
    const { labels, subIssues, ...issue } = draft
    return { ...initials, ...issue }
  }

  const defaultIssue = {
    title: '',
    description: '',
    assignee,
    project,
    sprint,
    number: 0,
    rank: '',
    status: '' as Ref<IssueStatus>,
    priority,
    dueDate: null,
    comments: 0,
    subIssues: 0,
    parents: [],
    reportedTime: 0,
    estimation: 0,
    reports: 0,
    childInfo: [],
    workDayLength: currentTeam?.workDayLength ?? WorkDayLength.EIGHT_HOURS,
    defaultTimeReportDay: currentTeam?.defaultTimeReportDay ?? TimeReportDayType.PreviousWorkDay
  }

  let object = originalIssue
    ? {
        ...originalIssue,
        title: `${originalIssue.title} (copy)`,
        subIssues: 0,
        attachments: 0,
        reportedTime: 0,
        reports: 0,
        childInfo: []
      }
    : toIssue(defaultIssue, draft)

  $: {
    defaultIssue.workDayLength = currentTeam?.workDayLength ?? WorkDayLength.EIGHT_HOURS
    defaultIssue.defaultTimeReportDay = currentTeam?.defaultTimeReportDay ?? TimeReportDayType.PreviousWorkDay
    object.workDayLength = defaultIssue.workDayLength
    object.defaultTimeReportDay = defaultIssue.defaultTimeReportDay
  }

  function resetObject (): void {
    templateId = undefined
    template = undefined
    object = defaultIssue
    subIssues = []
  }

  let templateId: Ref<IssueTemplate> | undefined = draft?.template?.template

  let template: IssueTemplate | undefined = undefined
  const templateQuery = createQuery()

  let subIssues: IssueTemplateChild[] = draft?.subIssues || []

  $: if (templateId !== undefined) {
    templateQuery.query(tracker.class.IssueTemplate, { _id: templateId }, (res) => {
      template = res.shift()
    })
  } else {
    template = undefined
    templateQuery.unsubscribe()
  }

  function tagAsRef (tag: TagElement): TagReference {
    return {
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
  }

  async function updateObject (template: IssueTemplate): Promise<void> {
    if (object.template?.template === template._id) {
      return
    }

    const { _class, _id, space, children, comments, attachments, labels: labels_, ...templBase } = template

    subIssues = template.children

    object = {
      ...object,
      ...templBase,
      template: {
        template: template._id
      }
    }
    const tagElements = await client.findAll(tags.class.TagElement, { _id: { $in: labels_ } })
    labels = tagElements.map(tagAsRef)
  }

  function updateTemplate (template?: IssueTemplate): void {
    if (template !== undefined) {
      updateObject(template)
    }
  }

  $: updateTemplate(template)

  const dispatch = createEventDispatcher()
  const client = getClient()
  const statusesQuery = createQuery()
  const spaceQuery = createQuery()

  let descriptionBox: AttachmentStyledBox

  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.Issue, 'labels')
  }

  $: _space = draft?.team || space
  $: !originalIssue && !draft && updateIssueStatusId(_space, status)
  $: canSave = getTitle(object.title ?? '').length > 0

  $: statusesQuery.query(
    tracker.class.IssueStatus,
    { attachedTo: _space },
    (statuses) => {
      issueStatuses = statuses
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )
  $: spaceQuery.query(tracker.class.Team, { _id: _space }, (res) => {
    currentTeam = res.shift()
  })

  async function setPropsFromOriginalIssue () {
    if (!originalIssue) {
      return
    }
    const { _id, relations, parents } = originalIssue

    if (relations?.[0]) {
      relatedTo = await client.findOne(tracker.class.Issue, { _id: relations[0]._id as Ref<Issue> })
    }
    if (parents?.[0]) {
      parentIssue = await client.findOne(tracker.class.Issue, { _id: parents[0].parentId })
    }
    if (originalIssue.labels) {
      labels = await client.findAll(tags.class.TagReference, { attachedTo: _id })
    }
  }

  async function setPropsFromDraft () {
    if (!draft?.parentIssue) {
      return
    }

    parentIssue = await client.findOne(tracker.class.Issue, { _id: draft.parentIssue as Ref<Issue> })
  }

  $: originalIssue && setPropsFromOriginalIssue()
  $: draft && setPropsFromDraft()

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

  async function isDraftEmpty (draft: Data<IssueDraft>): Promise<boolean> {
    const emptyDraft: Partial<IssueDraft> = {
      assignee: null,
      description: '',
      dueDate: null,
      estimation: 0,
      labels: [],
      parentIssue: undefined,
      priority: 0,
      project: null,
      sprint: null,
      subIssues: [],
      template: undefined,
      title: ''
    }

    for (const key of Object.keys(emptyDraft)) {
      if (!deepEqual((emptyDraft as any)[key], (draft as any)[key])) {
        return false
      }
    }

    const attachmentResult = await client.findOne(attachment.class.Attachment, { attachedTo: objectId })

    if (attachmentResult) {
      return false
    }

    const team = await client.findOne(tracker.class.Team, { _id: _space })

    if (team?.defaultIssueStatus) {
      return draft.status === team.defaultIssueStatus
    }

    return status === ''
  }

  export function canClose (): boolean {
    return true
  }

  function createDraftFromObject () {
    const newDraft: Data<IssueDraft> = {
      issueId: objectId,
      title: getTitle(object.title),
      description: object.description,
      assignee: object.assignee,
      project: object.project,
      sprint: object.sprint,
      status: object.status,
      priority: object.priority,
      dueDate: object.dueDate,
      estimation: object.estimation,
      template: object.template,
      labels,
      parentIssue: parentIssue?._id,
      team: _space,
      subIssues
    }

    return newDraft
  }

  export async function onOutsideClick () {
    if (!shouldSaveDraft) {
      return
    }

    await descriptionBox?.createAttachments()

    const newDraft = createDraftFromObject()
    const isEmpty = await isDraftEmpty(newDraft)

    if (isEmpty) {
      return
    }

    setMetadataLocalStorage(tracker.metadata.CreateIssueDraft, newDraft)

    if (onDraftChanged) {
      return onDraftChanged(newDraft)
    }
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
      childInfo: [],
      workDayLength: object.workDayLength,
      defaultTimeReportDay: object.defaultTimeReportDay
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

    if (relatedTo !== undefined) {
      const doc = await client.findOne(tracker.class.Issue, { _id: objectId })
      if (doc !== undefined) {
        if (client.getHierarchy().isDerived(relatedTo._class, tracker.class.Issue)) {
          await updateIssueRelation(client, relatedTo as Issue, doc, 'relations', '$push')
        } else {
          const update = await getResource(chunter.backreference.Update)
          await update(doc, 'relations', [relatedTo], tracker.string.AddedReference)
        }
      }
    }
    for (const subIssue of subIssues) {
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
      const childId: Ref<Issue> = generateId()
      const cvalue: AttachedData<Issue> = {
        title: getTitle(subIssue.title),
        description: subIssue.description,
        assignee: subIssue.assignee,
        project: subIssue.project,
        sprint: subIssue.sprint,
        number: (incResult as any).object.sequence,
        status: object.status,
        priority: subIssue.priority,
        rank: calcRank(lastOne, undefined),
        comments: 0,
        subIssues: 0,
        dueDate: null,
        parents: parentIssue
          ? [
              { parentId: objectId, parentTitle: value.title },
              { parentId: parentIssue._id, parentTitle: parentIssue.title },
              ...parentIssue.parents
            ]
          : [{ parentId: objectId, parentTitle: value.title }],
        reportedTime: 0,
        estimation: subIssue.estimation,
        reports: 0,
        relations: [],
        childInfo: [],
        workDayLength: object.workDayLength,
        defaultTimeReportDay: object.defaultTimeReportDay
      }

      await client.addCollection(
        tracker.class.Issue,
        _space,
        objectId,
        tracker.class.Issue,
        'subIssues',
        cvalue,
        childId
      )

      if ((subIssue.labels?.length ?? 0) > 0) {
        const tagElements = await client.findAll(tags.class.TagElement, { _id: { $in: subIssue.labels } })
        for (const label of tagElements) {
          await client.addCollection(tags.class.TagReference, _space, childId, tracker.class.Issue, 'labels', {
            title: label.title,
            color: label.color,
            tag: label._id
          })
        }
      }
    }

    const notification: Notification = {
      id: generateId(),
      title: tracker.string.IssueCreated,
      subTitle: getTitle(object.title),
      severity: NotificationSeverity.Success,
      position: NotificationPosition.BottomRight,
      component: IssueNotification,
      closeTimeout: 10000,
      params: {
        issueId: objectId,
        subTitlePostfix: (await translate(tracker.string.Created, { value: 1 })).toLowerCase()
      }
    }

    notificationsStore.addNotification(notification)

    objectId = generateId()
    resetObject()
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
    labels = [...labels, tagAsRef(tag)]
  }
  function handleTemplateChange (evt: CustomEvent<Ref<IssueTemplate>>): void {
    if (templateId == null) {
      templateId = evt.detail
      return
    }
    // Template is already specified, ask to replace.
    showPopup(
      MessageBox,
      {
        label: tracker.string.TemplateReplace,
        message: tracker.string.TemplateReplaceConfirm
      },
      'top',
      (result?: boolean) => {
        if (result === true) {
          templateId = evt.detail ?? undefined

          if (templateId === undefined) {
            subIssues = []
            resetObject()
          }
        }
      }
    )
  }

  async function showConfirmationDialog () {
    const newDraft = createDraftFromObject()
    const isFormEmpty = await isDraftEmpty(newDraft)

    if (isFormEmpty) {
      console.log('isFormEmpty')
      dispatch('close')
    } else {
      showPopup(
        MessageBox,
        {
          label: tracker.string.NewIssueDialogClose,
          message: tracker.string.NewIssueDialogCloseNote
        },
        'top',
        (result?: boolean) => {
          if (result === true) {
            dispatch('close')
          }
        }
      )
    }
  }
</script>

<Card
  label={tracker.string.NewIssue}
  okAction={createIssue}
  {canSave}
  okLabel={tracker.string.SaveIssue}
  on:close={() => dispatch('close')}
  createMore={false}
  onCancel={showConfirmationDialog}
  on:changeContent
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
    <ObjectBox
      _class={tracker.class.IssueTemplate}
      value={templateId}
      on:change={handleTemplateChange}
      size={'small'}
      label={tracker.string.NoIssueTemplate}
      icon={tracker.icon.Issues}
      searchField={'title'}
      allowDeselect={true}
      showNavigate={false}
      docProps={{ disableClick: true }}
    />
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
  <EditBox bind:value={object.title} placeholder={tracker.string.IssueTitlePlaceholder} kind={'large-style'} focus />
  <AttachmentStyledBox
    bind:this={descriptionBox}
    {objectId}
    _class={tracker.class.Issue}
    space={_space}
    alwaysEdit
    showButtons={false}
    maxHeight={'20vh'}
    bind:content={object.description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
    on:changeSize={() => dispatch('changeContent')}
  />
  <IssueTemplateChilds
    bind:children={subIssues}
    sprint={object.sprint}
    project={object.project}
    isScrollable
    maxHeight={'20vh'}
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
        <ProjectSelector value={object.project} onChange={handleProjectIdChanged} />
        <SprintSelector
          value={object.sprint}
          onChange={handleSprintIdChanged}
          useProject={(!originalIssue && object.project) || undefined}
        />
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
