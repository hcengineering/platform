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
  import { AccountArrayEditor, UserBox } from '@hcengineering/contact-resources'
  import core, {
    AttachedData,
    Data,
    Ref,
    Role,
    RolesAssignment,
    SortingOrder,
    fillDefaults,
    generateId,
    getCurrentAccount,
    makeCollabId,
    AccountUuid
  } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import {
    Card,
    InlineAttributeBar,
    MessageBox,
    createMarkup,
    createQuery,
    getClient
  } from '@hcengineering/presentation'
  import { RecruitEvents, Vacancy, Vacancy as VacancyClass } from '@hcengineering/recruit'
  import tags from '@hcengineering/tags'
  import task, { ProjectType, makeRank } from '@hcengineering/task'
  import { selectedTypeStore, typeStore } from '@hcengineering/task-resources'
  import tracker, { Issue, IssueStatus, IssueTemplate, IssueTemplateData, Project } from '@hcengineering/tracker'
  import {
    Button,
    Component,
    EditBox,
    FocusHandler,
    IconAttachment,
    createFocusManager,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import Company from './icons/Company.svelte'
  import VacancyIcon from './icons/Vacancy.svelte'
  import { Analytics } from '@hcengineering/analytics'
  import { getSequenceId } from '../utils'
  import { isEmptyMarkup } from '@hcengineering/text'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let template: ProjectType | undefined
  let typeId: Ref<ProjectType> | undefined = $selectedTypeStore

  $: typeType = typeId !== undefined ? $typeStore.get(typeId) : undefined

  let appliedTemplateId: Ref<ProjectType> | undefined
  let objectId: Ref<VacancyClass> = generateId()
  let issueTemplates: IssueTemplate[] = []
  let fullDescription: string = ''

  let members = [getCurrentAccount().uuid]
  let membersChanged: boolean = false

  $: setDefaultMembers(typeType)

  function setDefaultMembers (typeType: ProjectType | undefined): void {
    if (typeType === undefined) return
    if (membersChanged) return
    if (typeType.members === undefined || typeType.members.length === 0) return
    members = typeType.members
  }

  export let company: Ref<Organization> | undefined
  export let preserveCompany: boolean = false

  let vacancyData: Data<VacancyClass> = {
    archived: false,
    description: '',
    members,
    name: '',
    number: 0,
    private: false,
    attachments: 0,
    comments: 0,
    company: '' as Ref<Organization>,
    fullDescription: null,
    location: '',
    type: typeId as Ref<ProjectType>
  }
  export function canClose (): boolean {
    return name.trim() === '' && typeId !== undefined
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const templateQ = createQuery()
  fillDefaults(hierarchy, vacancyData, recruit.class.Vacancy)
  $: typeId &&
    templateQ.query(task.class.ProjectType, { _id: typeId }, (result) => {
      const { _class, _id, description, targetClass, ...templateData } = result[0]
      vacancyData = { ...(templateData as unknown as Data<VacancyClass>) }
      if (appliedTemplateId !== typeId) {
        fullDescription = description ?? ''
        appliedTemplateId = typeId
      }
      fillDefaults(hierarchy, vacancyData, recruit.class.Vacancy)
    })

  const issueTemplatesQ = createQuery()
  $: issueTemplatesQ.query(tracker.class.IssueTemplate, { 'relations._id': typeId }, async (result) => {
    issueTemplates = result
  })

  let rolesAssignment: RolesAssignment | undefined
  let roles: Role[] = []
  const rolesQuery = createQuery()
  $: if (typeType !== undefined) {
    rolesQuery.query(
      core.class.Role,
      { attachedTo: typeType._id },
      (res) => {
        roles = res

        if (rolesAssignment === undefined) {
          rolesAssignment = roles.reduce<RolesAssignment>((prev, { _id }) => {
            prev[_id] = []

            return prev
          }, {})
        }
      },
      {
        sort: {
          name: SortingOrder.Ascending
        }
      }
    )
  } else {
    rolesQuery.unsubscribe()
  }

  async function saveIssue (
    id: Ref<VacancyClass>,
    space: Ref<Project>,
    template: IssueTemplateData,
    parent: Ref<Issue> = tracker.ids.NoParent
  ): Promise<Ref<Issue> | undefined> {
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
    const rank = makeRank(lastOne?.rank, undefined)
    const taskType = await client.findOne(task.class.TaskType, { ofClass: tracker.class.Issue })
    if (taskType === undefined) {
      return
    }
    const number = (incResult as any).object.sequence

    const resId: Ref<Issue> = generateId()
    const identifier = `${project?.identifier}-${number}`
    const data: AttachedData<Issue> = {
      title: template.title + ` (${name.trim()})`,
      description: null,
      assignee: template.assignee,
      component: template.component,
      milestone: template.milestone,
      number,
      status: project?.defaultIssueStatus as Ref<IssueStatus>,
      priority: template.priority,
      rank,
      comments: 0,
      subIssues: 0,
      dueDate: null,
      parents: [],
      reportedTime: 0,
      remainingTime: 0,
      estimation: template.estimation,
      reports: 0,
      relations: [{ _id: id, _class: recruit.class.Vacancy }],
      childInfo: [],
      kind: taskType._id,
      identifier
    }

    if (!isEmptyMarkup(template.description)) {
      const collabId = makeCollabId(tracker.class.Issue, resId, 'description')
      data.description = await createMarkup(collabId, template.description)
    }

    await client.addCollection(tracker.class.Issue, space, parent, tracker.class.Issue, 'subIssues', data, resId)
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

  async function createVacancy (): Promise<void> {
    if (typeId === undefined || typeType === undefined) {
      throw Error(`Failed to find target project type: ${typeId}`)
    }

    const sequence = await client.findOne(core.class.Sequence, { attachedTo: recruit.class.Vacancy })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)
    const data: Data<Vacancy> = {
      ...vacancyData,
      name: name.trim(),
      description: template?.shortDescription ?? '',
      fullDescription: null,
      private: false,
      archived: false,
      number: (incResult as any).object.sequence,
      company,
      members,
      autoJoin: typeType.autoJoin ?? false,
      owners: [getCurrentAccount().uuid],
      type: typeId
    }

    if (!isEmptyMarkup(fullDescription)) {
      const collabId = makeCollabId(recruit.class.Vacancy, objectId, 'fullDescription')
      data.fullDescription = await createMarkup(collabId, fullDescription)
    }

    const ops = client.apply()
    const id = await ops.createDoc(recruit.class.Vacancy, core.space.Space, data, objectId)
    await descriptionBox.createAttachments(undefined, ops)
    await ops.commit()
    Analytics.handleEvent(RecruitEvents.VacancyCreated, {
      id: getSequenceId({
        ...data,
        _id: id,
        _class: recruit.class.Vacancy,
        space: core.space.Space,
        modifiedOn: 0,
        modifiedBy: getCurrentAccount().primarySocialId
      })
    })

    if (issueTemplates.length > 0) {
      for (const issueTemplate of issueTemplates) {
        const issue = await saveIssue(id, issueTemplate.space, issueTemplate)
        if (issue !== undefined) {
          for (const sub of issueTemplate.children) {
            await saveIssue(id, issueTemplate.space, sub, issue)
          }
        }
      }
    }

    // Add vacancy mixin with roles assignment
    await client.createMixin(
      objectId,
      recruit.class.Vacancy,
      core.space.Space,
      typeType.targetClass,
      rolesAssignment ?? {}
    )

    objectId = generateId()

    dispatch('close', id)
  }
  const manager = createFocusManager()

  let descriptionBox: AttachmentStyledBox

  function handleTypeChange (evt: CustomEvent<Ref<ProjectType>>): void {
    if (typeId == null) {
      typeId = evt.detail
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
          typeId = evt.detail ?? undefined
        }
      }
    )
  }

  function handleRoleAssignmentChanged (roleId: Ref<Role>, newMembers: AccountUuid[]): void {
    if (rolesAssignment === undefined) {
      rolesAssignment = {}
    }

    rolesAssignment[roleId] = newMembers
  }
</script>

<FocusHandler {manager} />
<Card
  label={recruit.string.CreateVacancy}
  okAction={createVacancy}
  canSave={name.trim() !== ''}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <span>{typeType?.name}</span>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={VacancyIcon} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <EditBox
      focusIndex={2}
      bind:value={name}
      placeholder={recruit.string.VacancyPlaceholder}
      kind={'large-style'}
      autoFocus
    />
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
      is={task.component.ProjectTypeSelector}
      props={{
        descriptors: [recruit.descriptors.VacancyType],
        type: typeId,
        focusIndex: 4,
        kind: 'regular',
        size: 'large'
      }}
      on:change={handleTypeChange}
    />
  </svelte:fragment>

  <svelte:fragment slot="pool">
    <InlineAttributeBar
      _class={recruit.class.Vacancy}
      object={vacancyData}
      toClass={core.class.Space}
      ignoreKeys={['fullDescription', 'company', 'type']}
      extraProps={{ showNavigate: false }}
    />

    <AccountArrayEditor
      bind:value={members}
      label={contact.string.Members}
      onChange={() => {
        membersChanged = true
      }}
      kind={'regular'}
      size={'large'}
    />

    {#each roles as role}
      <AccountArrayEditor
        value={rolesAssignment?.[role._id] ?? []}
        label={getEmbeddedLabel(role.name)}
        emptyLabel={getEmbeddedLabel(role.name)}
        onChange={(refs) => {
          handleRoleAssignmentChanged(role._id, refs)
        }}
        kind={'regular'}
        size={'large'}
      />
    {/each}
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      size={'large'}
      on:click={() => {
        descriptionBox.handleAttach()
      }}
    />
  </svelte:fragment>
</Card>
