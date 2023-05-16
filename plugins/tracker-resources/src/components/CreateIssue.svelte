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
    getClient,
    KeyedAttribute,
    MessageBox,
    MultipleDraftController,
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
    createFocusManager,
    DatePresenter,
    EditBox,
    FocusHandler,
    IconAttachment,
    IconMoreH,
    Label,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'
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

  const mDraftController = new MultipleDraftController(tracker.ids.IssueDraft)
  const id: Ref<Issue> = generateId()
  const draftController = new DraftController<IssueDraft>(
    shouldSaveDraft ? mDraftController.getNext() ?? id : undefined,
    tracker.ids.IssueDraft
  )

  let draft = shouldSaveDraft ? draftController.get() : undefined

  onDestroy(
    draftController.subscribe((val) => {
      draft = shouldSaveDraft ? val : undefined
    })
  )
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parentQuery = createQuery()
  let _space = space

  let object = draft ?? getDefaultObject(id)

  function objectChange (object: IssueDraft, empty: any) {
    if (shouldSaveDraft) {
      draftController.save(object, empty)
    }
  }

  $: objectChange(object, empty)

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

  function getDefaultObject (id: Ref<Issue> | undefined = undefined, ignoreOriginal = false): IssueDraft {
    const base: IssueDraft = {
      _id: id ?? generateId(),
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
    object = getDefaultObject(undefined, true)
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
    fillDefaults(hierarchy, object, tracker.class.Issue)
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
    if (object.assignee == null && currentProject !== undefined) {
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

  async function createIssue () {
    const _id: Ref<Issue> = generateId()
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
      _id
    )
    for (const label of object.labels) {
      await client.addCollection(label._class, label.space, _id, tracker.class.Issue, 'labels', {
        title: label.title,
        color: label.color,
        tag: label.tag
      })
    }
    await descriptionBox.createAttachments(_id)

    if (relatedTo !== undefined) {
      const doc = await client.findOne(tracker.class.Issue, { _id })
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
          { parentId: _id, parentTitle: value.title },
          { parentId: parentIssue._id, parentTitle: parentIssue.title },
          ...parentIssue.parents
        ]
      : [{ parentId: _id, parentTitle: value.title }]
    await subIssuesComponent.save(parents, _id)
    addNotification(await translate(tracker.string.IssueCreated, {}), getTitle(object.title), IssueNotification, {
      issueId: _id,
      subTitlePostfix: (await translate(tracker.string.Created, { value: 1 })).toLowerCase(),
      issueUrl: currentProject && generateIssueShortLink(getIssueId(currentProject, value as Issue))
    })

    draftController.remove()
    resetObject()
    descriptionBox?.removeDraft(false)
    subIssuesComponent.removeChildDraft()
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

    object.sprint = sprintId
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
    const isFormEmpty = draft === undefined

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
            subIssuesComponent.removeChildDraft()
            draftController.remove()
            descriptionBox?.removeDraft(true)
          }
        }
      )
    }
  }

  $: objectId = object._id
  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

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
    <SpaceSelector
      _class={tracker.class.Project}
      label={tracker.string.Project}
      bind:space={_space}
      kind={'secondary'}
      size={'large'}
    />
    <ObjectBox
      _class={tracker.class.IssueTemplate}
      value={templateId}
      docQuery={{
        space: _space
      }}
      on:change={handleTemplateChange}
      kind={'secondary'}
      size={'large'}
      label={tracker.string.NoIssueTemplate}
      icon={tracker.icon.IssueTemplates}
      searchField={'title'}
      allowDeselect={true}
      showNavigate={false}
      docProps={{ disabled: true }}
      focusIndex={20000}
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
    <EditBox
      focusIndex={1}
      bind:value={object.title}
      placeholder={tracker.string.IssueTitlePlaceholder}
      kind={'large-style'}
      focus
      fullSize
    />
  </div>
  <div id="issue-description">
    {#key [objectId, appliedTemplateId]}
      <AttachmentStyledBox
        bind:this={descriptionBox}
        focusIndex={2}
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
    parendIssueId={object._id}
    project={currentProject}
    sprint={object.sprint}
    component={object.component}
    {shouldSaveDraft}
    bind:subIssues={object.subIssues}
  />
  <svelte:fragment slot="pool">
    <div id="status-editor">
      <StatusEditor
        focusIndex={3}
        value={object}
        kind={'secondary'}
        size={'large'}
        defaultIssueStatus={currentProject?.defaultIssueStatus}
        shouldShowLabel={true}
        on:refocus={() => {
          manager.setFocusPos(3)
        }}
        on:change={({ detail }) => {
          if (object.status !== detail) {
            object.status = detail
          }
        }}
      />
    </div>
    <div id="priority-editor">
      <PriorityEditor
        focusIndex={4}
        value={object}
        shouldShowLabel
        isEditable
        kind={'secondary'}
        size={'large'}
        justify="center"
        on:change={({ detail }) => {
          object.priority = detail
          manager.setFocusPos(4)
        }}
      />
    </div>
    <div id="assignee-editor">
      <AssigneeEditor
        focusIndex={5}
        value={object}
        kind={'secondary'}
        size={'large'}
        width={'min-content'}
        on:change={({ detail }) => {
          object.assignee = detail
          manager.setFocusPos(5)
        }}
      />
    </div>
    <Component
      is={tags.component.TagsDropdownEditor}
      props={{
        focusIndex: 6,
        items: object.labels,
        key,
        targetClass: tracker.class.Issue,
        countLabel: tracker.string.NumberLabels,
        kind: 'secondary',
        size: 'large'
      }}
      on:open={(evt) => {
        addTagRef(evt.detail)
      }}
      on:delete={(evt) => {
        object.labels = object.labels.filter((it) => it._id !== evt.detail)
      }}
    />
    <div id="estimation-editor">
      <EstimationEditor focusIndex={7} kind={'secondary'} size={'large'} value={object} />
    </div>
    <ComponentSelector
      focusIndex={8}
      value={object.component}
      onChange={handleComponentIdChanged}
      isEditable={true}
      kind={'secondary'}
      size={'large'}
    />
    <SprintSelector
      focusIndex={9}
      value={object.sprint}
      onChange={handleSprintIdChanged}
      useComponent={(!originalIssue && object.component) || undefined}
      kind={'secondary'}
      size={'large'}
    />
    {#if object.dueDate !== null}
      <DatePresenter bind:value={object.dueDate} kind={'secondary'} size={'large'} editable />
    {/if}
    <div id="more-actions"><ActionIcon icon={IconMoreH} size={'medium'} action={showMoreActions} /></div>
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button
      focusIndex={10}
      icon={IconAttachment}
      size={'large'}
      on:click={() => {
        descriptionBox.attach()
      }}
    />
  </svelte:fragment>
</Card>
