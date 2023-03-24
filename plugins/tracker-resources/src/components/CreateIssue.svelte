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
  import core, { Account, AttachedData, Doc, fillDefaults, generateId, Ref, SortingOrder } from '@hcengineering/core'
  import { getResource, translate } from '@hcengineering/platform'
  import {
    Card,
    createQuery,
    DraftController,
    draftsStore,
    getClient,
    KeyedAttribute,
    MessageBox,
    SpaceSelector
  } from '@hcengineering/presentation'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import {
    calcRank,
    Component as ComponentType,
    Issue,
    IssueDraft,
    IssuePriority,
    IssueStatus,
    IssueTemplate,
    Project,
    Sprint
  } from '@hcengineering/tracker'
  import {
    ActionIcon,
    addNotification,
    Button,
    Component,
    DatePresenter,
    EditBox,
    IconAttachment,
    IconMoreH,
    Label,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import { activeComponent, activeSprint, generateIssueShortLink, getIssueId, updateIssueRelation } from '../issues'
  import tracker from '../plugin'
  import ComponentSelector from './ComponentSelector.svelte'
  import AssigneeEditor from './issues/AssigneeEditor.svelte'
  import IssueNotification from './issues/IssueNotification.svelte'
  import ParentIssue from './issues/ParentIssue.svelte'
  import PriorityEditor from './issues/PriorityEditor.svelte'
  import StatusEditor from './issues/StatusEditor.svelte'
  import EstimationEditor from './issues/timereport/EstimationEditor.svelte'
  import SetDueDateActionPopup from './SetDueDateActionPopup.svelte'
  import SetParentIssueActionPopup from './SetParentIssueActionPopup.svelte'
  import SprintSelector from './sprints/SprintSelector.svelte'
  import SubIssues from './SubIssues.svelte'

  export let space: Ref<Project>
  export let status: Ref<IssueStatus> | undefined = undefined
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let component: Ref<ComponentType> | null = $activeComponent ?? null
  export let sprint: Ref<Sprint> | null = $activeSprint ?? null
  export let relatedTo: Doc | undefined
  export let shouldSaveDraft: boolean = false
  export let parentIssue: Issue | undefined
  export let originalIssue: Issue | undefined

  const draftController = new DraftController<any>(tracker.ids.IssueDraft)

  const draft: IssueDraft | undefined = shouldSaveDraft ? draftController.get() : undefined
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parentQuery = createQuery()
  let _space = space

  let object = draft ?? getDefaultObject()

  $: if (object.parentIssue) {
    parentQuery.query(
      tracker.class.Issue,
      {
        _id: object.parentIssue
      },
      (res) => {
        ;[parentIssue] = res
      }
    )
  } else {
    parentQuery.unsubscribe()
    parentIssue = undefined
  }

  function getDefaultObject (ignoreOriginal = false): IssueDraft {
    const base: IssueDraft = {
      _id: generateId(),
      title: '',
      description: '',
      priority,
      space: _space,
      component,
      dueDate: null,
      attachments: 0,
      estimation: 0,
      sprint,
      status,
      assignee,
      labels: [],
      parentIssue: parentIssue?._id,
      subIssues: []
    }
    if (originalIssue && !ignoreOriginal) {
      const res: IssueDraft = {
        ...base,
        description: originalIssue.description,
        status: originalIssue.status,
        priority: originalIssue.priority,
        component: originalIssue.component,
        dueDate: originalIssue.dueDate,
        assignee: originalIssue.assignee,
        estimation: originalIssue.estimation,
        parentIssue: originalIssue.parents[0]?.parentId,
        title: `${originalIssue.title} (copy)`
      }
      client.findAll(tags.class.TagReference, { attachedTo: originalIssue._id }).then((p) => {
        object.labels = p
      })
      if (originalIssue.relations?.[0]) {
        client.findOne(tracker.class.Issue, { _id: originalIssue.relations[0]._id as Ref<Issue> }).then((p) => {
          relatedTo = p
        })
      }

      return res
    }
    return base
  }
  fillDefaults(hierarchy, object, tracker.class.Issue)

  let subIssuesComponent: SubIssues

  let currentProject: Project | undefined

  $: updateIssueStatusId(object, currentProject)
  $: updateAssigneeId(object, currentProject)
  $: canSave = getTitle(object.title ?? '').length > 0 && object.status !== undefined

  $: empty = {
    assignee: assignee ?? currentProject?.defaultAssignee,
    status: status ?? currentProject?.defaultIssueStatus,
    parentIssue: parentIssue?._id,
    description: '<p></p>',
    component,
    sprint,
    priority,
    space
  }

  $: if (object.space !== _space) {
    object.space = _space
  }

  function resetObject (): void {
    templateId = undefined
    template = undefined
    object = getDefaultObject(true)
    fillDefaults(hierarchy, object, tracker.class.Issue)
  }

  let templateId: Ref<IssueTemplate> | undefined = draft?.template?.template
  let appliedTemplateId: Ref<IssueTemplate> | undefined = draft?.template?.template

  let template: IssueTemplate | undefined = undefined
  const templateQuery = createQuery()

  $: if (templateId !== undefined) {
    templateQuery.query(tracker.class.IssueTemplate, { _id: templateId }, (res) => {
      template = res[0]
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

  async function updateTemplate (template: IssueTemplate): Promise<void> {
    if (object.template?.template === template._id) {
      return
    }
    const { _class, _id, space, children, comments, attachments, labels, description, ...templBase } = template

    object.subIssues = template.children.map((p) => {
      return {
        ...p,
        _id: p.id,
        space: _space,
        subIssues: [],
        dueDate: null,
        labels: [],
        status: currentProject?.defaultIssueStatus
      }
    })

    object = {
      ...object,
      description: description ?? '',
      ...templBase,
      template: {
        template: template._id
      }
    }
    appliedTemplateId = templateId
    const tagElements = await client.findAll(tags.class.TagElement, { _id: { $in: labels } })
    object.labels = tagElements.map(tagAsRef)
  }

  $: template && updateTemplate(template)

  const dispatch = createEventDispatcher()
  const spaceQuery = createQuery()

  let descriptionBox: AttachmentStyledBox

  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.Issue, 'labels')
  }

  $: spaceQuery.query(tracker.class.Project, { _id: _space }, (res) => {
    currentProject = res.shift()
  })

  async function updateIssueStatusId (object: IssueDraft, currentProject: Project | undefined) {
    if (currentProject?.defaultIssueStatus && object.status === undefined) {
      object.status = currentProject.defaultIssueStatus
    }
  }

  function updateAssigneeId (object: IssueDraft, currentProject: Project | undefined) {
    if (object.assignee === undefined && currentProject !== undefined) {
      if (currentProject.defaultAssignee !== undefined) {
        object.assignee = currentProject.defaultAssignee
      } else {
        object.assignee = null
      }
    }
  }
  function clearParentIssue () {
    object.parentIssue = undefined
    parentQuery.unsubscribe()
    parentIssue = undefined
  }

  function getTitle (value: string) {
    return value.trim()
  }

  export function canClose (): boolean {
    return true
  }

  export async function onOutsideClick () {
    if (shouldSaveDraft) {
      draftController.save(object, empty)
    }
  }

  $: watch(empty)
  function watch (empty: Record<string, any>): void {
    if (!shouldSaveDraft) return
    draftController.watch(object, empty)
  }

  async function createIssue () {
    if (!canSave || object.status === undefined) {
      return
    }

    const lastOne = await client.findOne<Issue>(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.updateDoc(
      tracker.class.Project,
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
      component: object.component,
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
      createOn: Date.now()
    }

    await client.addCollection(
      tracker.class.Issue,
      _space,
      parentIssue?._id ?? tracker.ids.NoParent,
      parentIssue?._class ?? tracker.class.Issue,
      'subIssues',
      value,
      object._id
    )
    for (const label of object.labels) {
      await client.addCollection(label._class, label.space, object._id, tracker.class.Issue, 'labels', {
        title: label.title,
        color: label.color,
        tag: label.tag
      })
    }
    await descriptionBox.createAttachments()

    if (relatedTo !== undefined) {
      const doc = await client.findOne(tracker.class.Issue, { _id: object._id })
      if (doc !== undefined) {
        if (client.getHierarchy().isDerived(relatedTo._class, tracker.class.Issue)) {
          await updateIssueRelation(client, relatedTo as Issue, doc, 'relations', '$push')
        } else {
          const update = await getResource(chunter.backreference.Update)
          await update(doc, 'relations', [relatedTo], tracker.string.AddedReference)
        }
      }
    }
    const parents = parentIssue
      ? [
          { parentId: object._id, parentTitle: value.title },
          { parentId: parentIssue._id, parentTitle: parentIssue.title },
          ...parentIssue.parents
        ]
      : [{ parentId: object._id, parentTitle: value.title }]
    await subIssuesComponent.save(parents)
    addNotification(await translate(tracker.string.IssueCreated, {}), getTitle(object.title), IssueNotification, {
      issueId: object._id,
      subTitlePostfix: (await translate(tracker.string.Created, { value: 1 })).toLowerCase(),
      issueUrl: currentProject && generateIssueShortLink(getIssueId(currentProject, value as Issue))
    })

    draftController.remove()
    resetObject()
    descriptionBox?.removeDraft(false)
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
          (selectedIssue) => {
            if (selectedIssue !== undefined) {
              parentIssue = selectedIssue
              object.parentIssue = parentIssue?._id
            }
          }
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

  const handleComponentIdChanged = (componentId: Ref<ComponentType> | null | undefined) => {
    if (componentId === undefined) {
      return
    }

    object.component = componentId
  }

  const handleSprintIdChanged = async (sprintId: Ref<Sprint> | null | undefined) => {
    if (sprintId === undefined) {
      return
    }
    let componentSprintId: Ref<ComponentType> | null
    if (sprintId != null) {
      const sprint = await client.findOne(tracker.class.Sprint, { _id: sprintId })
      componentSprintId = sprint && sprint.component ? sprint.component : null
    } else componentSprintId = null

    object.sprint = sprintId
    object.component = componentSprintId
  }

  function addTagRef (tag: TagElement): void {
    object.labels = [...object.labels, tagAsRef(tag)]
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
            object.subIssues = []
            resetObject()
          }
        }
      }
    )
  }

  async function showConfirmationDialog () {
    draftController.save(object, empty)
    const isFormEmpty = $draftsStore[tracker.ids.IssueDraft] === undefined

    if (isFormEmpty) {
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
            resetObject()
            draftController.remove()
            descriptionBox?.removeDraft(true)
          }
        }
      )
    }
  }

  onDestroy(() => draftController.unsubscribe())

  $: objectId = object._id
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
      <SpaceSelector _class={tracker.class.Project} label={tracker.string.Project} bind:space={_space} />
    </div>
    <ObjectBox
      _class={tracker.class.IssueTemplate}
      value={templateId}
      docQuery={{
        space: _space
      }}
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
  <div id="issue-name">
    <EditBox bind:value={object.title} placeholder={tracker.string.IssueTitlePlaceholder} kind={'large-style'} focus />
  </div>
  <div id="issue-description">
    {#key [objectId, appliedTemplateId]}
      <AttachmentStyledBox
        bind:this={descriptionBox}
        objectId={object._id}
        {shouldSaveDraft}
        _class={tracker.class.Issue}
        space={_space}
        alwaysEdit
        showButtons={false}
        emphasized
        bind:content={object.description}
        placeholder={tracker.string.IssueDescriptionPlaceholder}
        on:changeSize={() => dispatch('changeContent')}
        on:attach={(ev) => {
          if (ev.detail.action === 'saved') {
            object.attachments = ev.detail.value
          }
        }}
      />
    {/key}
  </div>
  <SubIssues
    bind:this={subIssuesComponent}
    projectId={_space}
    parent={object._id}
    project={currentProject}
    sprint={object.sprint}
    component={object.component}
    {shouldSaveDraft}
    bind:subIssues={object.subIssues}
  />
  <svelte:fragment slot="pool">
    <div id="status-editor">
      <StatusEditor
        value={object}
        kind="no-border"
        size="small"
        shouldShowLabel={true}
        on:change={({ detail }) => (object.status = detail)}
      />
    </div>
    <div id="priority-editor">
      <PriorityEditor
        value={object}
        shouldShowLabel
        isEditable
        kind="no-border"
        size="small"
        justify="center"
        on:change={({ detail }) => (object.priority = detail)}
      />
    </div>
    <div id="assignee-editor">
      <AssigneeEditor
        value={object}
        size="small"
        kind="no-border"
        width={'min-content'}
        on:change={({ detail }) => (object.assignee = detail)}
      />
    </div>
    <Component
      is={tags.component.TagsDropdownEditor}
      props={{
        items: object.labels,
        key,
        targetClass: tracker.class.Issue,
        countLabel: tracker.string.NumberLabels
      }}
      on:open={(evt) => {
        addTagRef(evt.detail)
      }}
      on:delete={(evt) => {
        object.labels = object.labels.filter((it) => it._id !== evt.detail)
      }}
    />
    <div id="estimation-editor">
      <EstimationEditor kind={'no-border'} size={'small'} value={object} />
    </div>
    <ComponentSelector value={object.component} onChange={handleComponentIdChanged} isEditable={true} />
    <SprintSelector
      value={object.sprint}
      onChange={handleSprintIdChanged}
      useComponent={(!originalIssue && object.component) || undefined}
    />
    {#if object.dueDate !== null}
      <DatePresenter bind:value={object.dueDate} editable />
    {/if}
    <div id="more-actions"><ActionIcon icon={IconMoreH} size={'medium'} action={showMoreActions} /></div>
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
