<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { Employee } from '@hcengineering/contact'
  import { AccountArrayEditor, AssigneeBox } from '@hcengineering/contact-resources'
  import core, { Account, DocumentUpdate, Ref, SortingOrder, generateId, getCurrentAccount } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { IssueStatus, Project, TimeReportDayType, genRanks } from '@hcengineering/tracker'
  import {
    Button,
    EditBox,
    IconEdit,
    IconWithEmojii,
    Label,
    ToggleWithLabel,
    eventToHTMLElement,
    getColorNumberByText,
    getPlatformColor,
    getPlatformColorForText,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import TimeReportDayDropdown from '../issues/timereport/TimeReportDayDropdown.svelte'
  import ChangeIdentity from './ChangeIdentity.svelte'
  import ProjectIconChooser from './ProjectIconChooser.svelte'

  export let project: Project | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let name: string = project?.name ?? ''
  let description: string = project?.description ?? ''
  let isPrivate: boolean = project?.private ?? false
  let icon: Asset | undefined = project?.icon ?? undefined
  let color: number | undefined = project?.color ?? undefined
  let selectedWorkDayType: TimeReportDayType | undefined =
    project?.defaultTimeReportDay ?? TimeReportDayType.PreviousWorkDay
  let defaultAssignee: Ref<Employee> | null | undefined = project?.defaultAssignee ?? null
  let members: Ref<Account>[] =
    project?.members !== undefined ? hierarchy.clone(project.members) : [getCurrentAccount()._id]

  const dispatch = createEventDispatcher()

  $: isNew = !project

  async function handleSave () {
    isNew ? createProject() : updateProject()
  }

  let identifier: string = project?.identifier ?? 'TSK'

  const defaultStatusId: Ref<IssueStatus> = generateId()

  function getProjectData () {
    return {
      name,
      description,
      private: isPrivate,
      members,
      archived: false,
      identifier,
      sequence: 0,
      issueStatuses: 0,
      defaultIssueStatus: defaultStatusId,
      defaultAssignee: defaultAssignee ?? undefined,
      icon,
      color,
      defaultTimeReportDay: selectedWorkDayType ?? TimeReportDayType.PreviousWorkDay
    }
  }

  async function updateProject () {
    const { sequence, issueStatuses, defaultIssueStatus, ...projectData } = getProjectData()
    const update: DocumentUpdate<Project> = {}
    if (projectData.name !== project?.name) {
      update.name = projectData.name
    }
    if (projectData.description !== project?.description) {
      update.description = projectData.description
    }
    if (projectData.private !== project?.private) {
      update.private = projectData.private
    }
    if (projectData.defaultAssignee !== project?.defaultAssignee) {
      update.defaultAssignee = projectData.defaultAssignee
    }
    if (projectData.icon !== project?.icon) {
      update.icon = projectData.icon
    }
    if (projectData.color !== project?.color) {
      update.color = projectData.color
    }
    if (projectData.defaultTimeReportDay !== project?.defaultTimeReportDay) {
      update.defaultTimeReportDay = projectData.defaultTimeReportDay
    }
    if (projectData.identifier !== project?.identifier) {
      update.identifier = projectData.identifier
    }
    if (projectData.members.length !== project?.members.length) {
      update.members = projectData.members
    } else {
      for (const member of projectData.members) {
        if (project.members.findIndex((p) => p === member) === -1) {
          update.members = projectData.members
          break
        }
      }
    }
    if (Object.keys(update).length > 0) {
      await client.update(project!, update)
    }
  }

  async function createProject () {
    const id = await client.createDoc(tracker.class.Project, core.space.Space, getProjectData())
    await createProjectIssueStatuses(id, defaultStatusId)
  }

  async function createProjectIssueStatuses (
    projectId: Ref<Project>,
    defaultStatusId: Ref<IssueStatus>,
    defaultCategoryId = tracker.issueStatusCategory.Backlog
  ): Promise<void> {
    const categories = await client.findAll(
      core.class.StatusCategory,
      { ofAttribute: tracker.attribute.IssueStatus },
      { sort: { order: SortingOrder.Ascending } }
    )
    const issueStatusRanks = [...genRanks(categories.length)]

    for (const [i, statusCategory] of categories.entries()) {
      const { _id: category, defaultStatusName } = statusCategory
      const rank = issueStatusRanks[i]

      if (defaultStatusName !== undefined) {
        await client.createDoc(
          tracker.class.IssueStatus,
          projectId,
          {
            ofAttribute: tracker.attribute.IssueStatus,
            name: defaultStatusName,
            category,
            rank
          },
          category === defaultCategoryId ? defaultStatusId : undefined
        )
      }
    }
  }

  function chooseIcon (ev: MouseEvent) {
    showPopup(ProjectIconChooser, { icon, color: color ?? getColorNumberByText(name) }, 'top', (result) => {
      if (result !== undefined && result !== null) {
        icon = result.icon
        color = result.color
      }
    })
  }
  function changeIdentity (ev: MouseEvent) {
    showPopup(ChangeIdentity, { project }, eventToHTMLElement(ev), (result) => {
      if (result != null) {
        identifier = result
      }
    })
  }
</script>

<Card
  label={isNew ? tracker.string.NewProject : tracker.string.EditProject}
  okLabel={isNew ? presentation.string.Create : presentation.string.Save}
  okAction={handleSave}
  canSave={name.length > 0 && !!selectedWorkDayType && !(members.length === 0 && isPrivate)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center flex-between">
    <EditBox
      bind:value={name}
      placeholder={tracker.string.ProjectTitlePlaceholder}
      kind={'large-style'}
      focus
      on:input={() => {
        if (isNew) {
          identifier = name.toLocaleUpperCase().replaceAll(' ', '_').substring(0, 5)
        }
      }}
    />
    <div class="flex-row-center">
      <EditBox
        bind:value={identifier}
        disabled={!isNew}
        placeholder={tracker.string.ProjectIdentifierPlaceholder}
        kind={'large-style'}
      />
      {#if !isNew}
        <Button size={'small'} icon={IconEdit} on:click={changeIdentity} />
      {/if}
    </div>
  </div>
  <StyledTextBox
    alwaysEdit
    showButtons={false}
    bind:content={description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <ToggleWithLabel
    label={presentation.string.MakePrivate}
    description={presentation.string.MakePrivateDescription}
    bind:on={isPrivate}
    disabled={!isPrivate && members.length === 0}
  />
  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.ChooseIcon} />
    </div>
    <Button
      icon={icon === tracker.component.IconWithEmojii ? IconWithEmojii : icon ?? tracker.icon.Home}
      iconProps={icon === tracker.component.IconWithEmojii
        ? { icon: color }
        : { fill: color !== undefined ? getPlatformColor(color) : getPlatformColorForText(name) }}
      kind="no-border"
      size="medium"
      on:click={chooseIcon}
    />
  </div>

  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.DefaultTimeReportDay} />
    </div>
    <TimeReportDayDropdown bind:selected={selectedWorkDayType} label={tracker.string.DefaultTimeReportDay} />
  </div>

  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.Members} />
    </div>
    <AccountArrayEditor
      value={members}
      label={tracker.string.Members}
      onChange={(refs) => (members = refs)}
      kind="link-bordered"
    />
  </div>

  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.DefaultAssignee} />
    </div>
    <AssigneeBox
      label={tracker.string.Assignee}
      placeholder={tracker.string.Assignee}
      kind="link-bordered"
      bind:value={defaultAssignee}
      titleDeselect={tracker.string.Unassigned}
      showNavigate={false}
      showTooltip={{ label: tracker.string.DefaultAssignee }}
    />
  </div>
</Card>
