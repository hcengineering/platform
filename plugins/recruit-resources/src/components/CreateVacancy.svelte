<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import contact, { Organization } from '@hcengineering/contact'
  import { UserBox } from '@hcengineering/contact-resources'
  import core, {
    Data,
    fillDefaults,
    FindResult,
    generateId,
    getCurrentAccount,
    Ref,
    SortingOrder
  } from '@hcengineering/core'
  import { Card, createQuery, getClient, InlineAttributeBar, MessageBox } from '@hcengineering/presentation'
  import { Vacancy as VacancyClass } from '@hcengineering/recruit'
  import tags from '@hcengineering/tags'
  import task, { createStates, KanbanTemplate } from '@hcengineering/task'
  import tracker, {
    calcRank,
    Issue,
    IssueStatus,
    IssueTemplate,
    IssueTemplateData,
    Project
  } from '@hcengineering/tracker'
  import {
    Button,
    Component,
    createFocusManager,
    EditBox,
    FocusHandler,
    IconAttachment,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import Company from './icons/Company.svelte'
  import Vacancy from './icons/Vacancy.svelte'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let template: KanbanTemplate | undefined
  let templateId: Ref<KanbanTemplate> | undefined
  let appliedTemplateId: Ref<KanbanTemplate> | undefined
  let objectId: Ref<VacancyClass> = generateId()
  let issueTemplates: FindResult<IssueTemplate>

  let fullDescription: string = ''

  export let company: Ref<Organization> | undefined
  export let preserveCompany: boolean = false

  let vacancyData: Data<VacancyClass> = {
    archived: false,
    description: '',
    members: [],
    name: '',
    number: 0,
    private: false,
    attachments: 0,
    comments: 0,
    company: '' as Ref<Organization>,
    fullDescription: '',
    location: '',
    states: []
  }
  export function canClose (): boolean {
    return name === '' && templateId !== undefined
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const templateQ = createQuery()
  fillDefaults(hierarchy, vacancyData, recruit.class.Vacancy)
  $: templateId &&
    templateQ.query(task.class.KanbanTemplate, { _id: templateId }, (result) => {
      const { _class, _id, description, ...templateData } = result[0]
      vacancyData = { ...(templateData as unknown as Data<VacancyClass>), fullDescription: description }
      if (appliedTemplateId !== templateId) {
        fullDescription = description ?? ''
        appliedTemplateId = templateId
      }
      fillDefaults(hierarchy, vacancyData, recruit.class.Vacancy)
    })

  const issueTemplatesQ = createQuery()
  $: issueTemplatesQ.query(tracker.class.IssueTemplate, { 'relations._id': templateId }, async (result) => {
    issueTemplates = result
  })

  async function saveIssue (
    id: Ref<VacancyClass>,
    space: Ref<Project>,
    template: IssueTemplateData,
    parent: Ref<Issue> = tracker.ids.NoParent
  ): Promise<Ref<Issue>> {
    const lastOne = await client.findOne<Issue>(
      tracker.class.Issue,
      { space },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      space,
      {
        $inc: { sequence: 1 }
      },
      true
    )
    const project = await client.findOne(tracker.class.Project, { _id: space })
    const rank = calcRank(lastOne, undefined)
    const resId = await client.addCollection(tracker.class.Issue, space, parent, tracker.class.Issue, 'subIssues', {
      title: template.title + ` (${name})`,
      description: template.description,
      assignee: template.assignee,
      component: template.component,
      milestone: template.milestone,
      number: (incResult as any).object.sequence,
      status: project?.defaultIssueStatus as Ref<IssueStatus>,
      priority: template.priority,
      rank,
      comments: 0,
      subIssues: 0,
      dueDate: null,
      parents: [],
      reportedTime: 0,
      estimation: template.estimation,
      reports: 0,
      relations: [{ _id: id, _class: recruit.class.Vacancy }],
      childInfo: [],
      doneState: null
    })
    if ((template.labels?.length ?? 0) > 0) {
      const tagElements = await client.findAll(tags.class.TagElement, { _id: { $in: template.labels } })
      for (const label of tagElements) {
        await client.addCollection(tags.class.TagReference, space, resId, tracker.class.Issue, 'labels', {
          title: label.title,
          color: label.color,
          tag: label._id
        })
      }
    }
    return resId
  }

  async function createVacancy () {
    if (
      templateId !== undefined &&
      (await client.findOne(task.class.KanbanTemplate, { _id: templateId })) === undefined
    ) {
      throw Error(`Failed to find target kanban template: ${templateId}`)
    }

    const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Vacancy })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const [states, doneStates] = await createStates(
      client,
      recruit.attribute.State,
      recruit.attribute.DoneState,
      templateId
    )

    const id = await client.createDoc(
      recruit.class.Vacancy,
      core.space.Space,
      {
        ...vacancyData,
        name,
        description: template?.shortDescription ?? '',
        fullDescription,
        private: false,
        archived: false,
        number: (incResult as any).object.sequence,
        company,
        members: [getCurrentAccount()._id],
        templateId,
        states,
        doneStates
      },
      objectId
    )

    if (issueTemplates.length > 0) {
      for (const issueTemplate of issueTemplates) {
        const issue = await saveIssue(id, issueTemplate.space, issueTemplate)
        for (const sub of issueTemplate.children) {
          await saveIssue(id, issueTemplate.space, sub, issue)
        }
      }
    }

    await descriptionBox.createAttachments()
    objectId = generateId()

    dispatch('close', id)
  }
  const manager = createFocusManager()

  let descriptionBox: AttachmentStyledBox

  function handleTemplateChange (evt: CustomEvent<Ref<KanbanTemplate>>): void {
    if (templateId == null) {
      templateId = evt.detail
      return
    }
    // Template is already specified, ask to replace.
    showPopup(
      MessageBox,
      {
        label: recruit.string.TemplateReplace,
        message: recruit.string.TemplateReplaceConfirm,
        okLabel: recruit.string.Apply
      },
      'top',
      (result?: boolean) => {
        if (result === true) {
          templateId = evt.detail ?? undefined
        }
      }
    )
  }
</script>

<FocusHandler {manager} />
<Card
  label={recruit.string.CreateVacancy}
  okAction={createVacancy}
  canSave={!!name}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={Vacancy} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <div class="clear-mins flex-grow">
      <EditBox
        focusIndex={2}
        bind:value={name}
        placeholder={recruit.string.VacancyPlaceholder}
        kind={'large-style'}
        autoFocus
      />
    </div>
  </div>
  {#key appliedTemplateId}
    <AttachmentStyledBox
      bind:this={descriptionBox}
      {objectId}
      _class={recruit.class.Vacancy}
      space={objectId}
      alwaysEdit
      showButtons={false}
      maxHeight={'card'}
      bind:content={fullDescription}
      placeholder={recruit.string.FullDescription}
      kind={'emphasized'}
    />
  {/key}

  <svelte:fragment slot="header">
    <UserBox
      focusIndex={3}
      _class={contact.class.Organization}
      label={recruit.string.Company}
      placeholder={recruit.string.Company}
      justify={'left'}
      bind:value={company}
      allowDeselect
      titleDeselect={recruit.string.UnAssignCompany}
      kind={'regular'}
      size={'large'}
      icon={Company}
      readonly={preserveCompany}
      showNavigate={false}
      create={{ component: contact.component.CreateOrganization, label: contact.string.CreateOrganization }}
    />
    <Component
      is={task.component.KanbanTemplateSelector}
      props={{
        folders: [recruit.space.VacancyTemplates],
        template: templateId,
        focusIndex: 4,
        kind: 'regular',
        size: 'large'
      }}
      on:change={handleTemplateChange}
    />
  </svelte:fragment>

  <svelte:fragment slot="pool">
    <InlineAttributeBar
      _class={recruit.class.Vacancy}
      object={vacancyData}
      toClass={core.class.Space}
      ignoreKeys={['fullDescription', 'company']}
      extraProps={{ showNavigate: false }}
    />
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      size={'large'}
      on:click={() => {
        descriptionBox.attach()
      }}
    />
  </svelte:fragment>
</Card>
