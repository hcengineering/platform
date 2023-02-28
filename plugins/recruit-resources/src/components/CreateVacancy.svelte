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
  import core, { FindResult, generateId, getCurrentAccount, Ref, SortingOrder } from '@hcengineering/core'
  import { Card, createQuery, getClient, UserBox } from '@hcengineering/presentation'
  import { Vacancy as VacancyClass } from '@hcengineering/recruit'
  import tags from '@hcengineering/tags'
  import task, { createKanban, KanbanTemplate } from '@hcengineering/task'
  import tracker, { calcRank, Issue, IssueStatus, IssueTemplate, IssueTemplateData, Team } from '@hcengineering/tracker'
  import { Button, Component, createFocusManager, EditBox, FocusHandler, IconAttachment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import Company from './icons/Company.svelte'
  import Vacancy from './icons/Vacancy.svelte'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let template: KanbanTemplate | undefined
  let templateId: Ref<KanbanTemplate> | undefined
  let objectId: Ref<VacancyClass> = generateId()
  let issueTemplates: FindResult<IssueTemplate>

  let fullDescription: string = template?.description ?? ''

  export let company: Ref<Organization> | undefined
  export let preserveCompany: boolean = false

  export function canClose (): boolean {
    return name === '' && templateId !== undefined
  }

  let changed = false

  const client = getClient()
  const templateQ = createQuery()
  $: templateQ.query(task.class.KanbanTemplate, { _id: templateId }, (result) => {
    template = result[0]
    if (!changed || descriptionBox?.isEmptyContent()) {
      changed = false
      fullDescription = template.description ?? fullDescription
    }
  })

  const issueTemplatesQ = createQuery()
  $: issueTemplatesQ.query(tracker.class.IssueTemplate, { 'relations._id': templateId }, async (result) => {
    issueTemplates = result
  })

  async function saveIssue (
    id: Ref<VacancyClass>,
    space: Ref<Team>,
    template: IssueTemplateData,
    parent: Ref<Issue> = tracker.ids.NoParent
  ): Promise<Ref<Issue>> {
    const lastOne = await client.findOne<Issue>(
      tracker.class.Issue,
      { space },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.updateDoc(
      tracker.class.Team,
      core.space.Space,
      space,
      {
        $inc: { sequence: 1 }
      },
      true
    )
    const team = await client.findOne(tracker.class.Team, { _id: space })
    const rank = calcRank(lastOne, undefined)
    const resId = await client.addCollection(tracker.class.Issue, space, parent, tracker.class.Issue, 'subIssues', {
      title: template.title + ` (${name})`,
      description: template.description,
      assignee: template.assignee,
      project: template.project,
      sprint: template.sprint,
      number: (incResult as any).object.sequence,
      status: team?.defaultIssueStatus as Ref<IssueStatus>,
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
      childInfo: []
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

    const id = await client.createDoc(
      recruit.class.Vacancy,
      core.space.Space,
      {
        ...template,
        name,
        description: template?.shortDescription ?? '',
        fullDescription,
        private: false,
        archived: false,
        company,
        createdBy: getCurrentAccount()._id,
        members: [getCurrentAccount()._id]
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

    await createKanban(client, id, templateId)

    await descriptionBox.createAttachments()
    objectId = generateId()

    dispatch('close', id)
  }
  const manager = createFocusManager()

  let descriptionBox: AttachmentStyledBox
</script>

<FocusHandler {manager} />
<Card
  label={recruit.string.CreateVacancy}
  okAction={createVacancy}
  canSave={!!name}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={Vacancy} size={'medium'} kind={'link-bordered'} disabled />
    </div>
    <div class="clear-mins flex-grow">
      <EditBox
        focusIndex={2}
        bind:value={name}
        placeholder={recruit.string.VacancyPlaceholder}
        kind={'large-style'}
        focus
      />
    </div>
  </div>
  {#key template?.description}
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
      emphasized
      on:changeContent={() => {
        changed = true
      }}
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
      kind={'no-border'}
      size={'small'}
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
        focusIndex: 4
      }}
      on:change={(evt) => {
        templateId = evt.detail
      }}
    />
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
