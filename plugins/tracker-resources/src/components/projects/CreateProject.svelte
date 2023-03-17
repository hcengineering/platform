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
  import { Employee } from '@hcengineering/contact'
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import core, { Account, generateId, getCurrentAccount, Ref, SortingOrder } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import presentation, { AssigneeBox, Card, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { genRanks, IssueStatus, Project, TimeReportDayType, WorkDayLength } from '@hcengineering/tracker'
  import {
    Button,
    DropdownIntlItem,
    DropdownLabelsIntl,
    EditBox,
    eventToHTMLElement,
    Label,
    showPopup,
    ToggleWithLabel
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import TimeReportDayDropdown from '../issues/timereport/TimeReportDayDropdown.svelte'
  import ProjectIconChooser from './ProjectIconChooser.svelte'

  export let project: Project | undefined = undefined

  let name: string = project?.name ?? ''
  let description: string = project?.description ?? ''
  let isPrivate: boolean = project?.private ?? false
  let icon: Asset | undefined = project?.icon ?? undefined
  let selectedWorkDayType: TimeReportDayType | undefined =
    project?.defaultTimeReportDay ?? TimeReportDayType.PreviousWorkDay
  let selectedWorkDayLength: WorkDayLength | undefined = project?.workDayLength ?? WorkDayLength.EIGHT_HOURS
  let defaultAssignee: Ref<Employee> | null | undefined = null
  let members: Ref<Account>[] = project?.members ?? [getCurrentAccount()._id]

  const dispatch = createEventDispatcher()
  const client = getClient()
  const workDayLengthItems: DropdownIntlItem[] = [
    {
      id: WorkDayLength.SEVEN_HOURS,
      label: tracker.string.SevenHoursLength
    },
    {
      id: WorkDayLength.EIGHT_HOURS,
      label: tracker.string.EightHoursLength
    }
  ]

  $: isNew = !project

  async function handleSave () {
    isNew ? createProject() : updateProject()
  }

  let identifier: string = 'TSK'

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
      defaultTimeReportDay: selectedWorkDayType ?? TimeReportDayType.PreviousWorkDay,
      workDayLength: selectedWorkDayLength ?? WorkDayLength.EIGHT_HOURS
    }
  }

  async function updateProject () {
    const { sequence, issueStatuses, defaultIssueStatus, identifier, ...projectData } = getProjectData()
    await client.update(project!, projectData)
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
      tracker.class.IssueStatusCategory,
      {},
      { sort: { order: SortingOrder.Ascending } }
    )
    const issueStatusRanks = [...genRanks(categories.length)]

    for (const [i, statusCategory] of categories.entries()) {
      const { _id: category, defaultStatusName } = statusCategory
      const rank = issueStatusRanks[i]

      await client.addCollection(
        tracker.class.IssueStatus,
        projectId,
        projectId,
        tracker.class.Project,
        'issueStatuses',
        { name: defaultStatusName, category, rank },
        category === defaultCategoryId ? defaultStatusId : undefined
      )
    }
  }

  function chooseIcon (ev: MouseEvent) {
    showPopup(ProjectIconChooser, { icon }, eventToHTMLElement(ev), (result) => {
      if (result !== undefined && result !== null) {
        icon = result
      }
    })
  }
</script>

<Card
  label={isNew ? tracker.string.NewProject : tracker.string.EditProject}
  okLabel={isNew ? presentation.string.Create : presentation.string.Save}
  okAction={handleSave}
  canSave={name.length > 0 && !!selectedWorkDayType && !!selectedWorkDayLength}
  on:close={() => {
    dispatch('close')
  }}
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
    <EditBox
      bind:value={identifier}
      disabled={!isNew}
      placeholder={tracker.string.ProjectIdentifierPlaceholder}
      kind={'large-style'}
    />
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
  />
  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.ChooseIcon} />
    </div>
    <Button icon={icon ?? tracker.icon.Home} kind="no-border" size="medium" on:click={chooseIcon} />
  </div>

  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.DefaultTimeReportDay} />
    </div>
    <TimeReportDayDropdown bind:selected={selectedWorkDayType} label={tracker.string.DefaultTimeReportDay} />
  </div>

  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.WorkDayLength} />
    </div>
    <DropdownLabelsIntl
      kind="link-bordered"
      label={tracker.string.WorkDayLength}
      items={workDayLengthItems}
      shouldUpdateUndefined={false}
      bind:selected={selectedWorkDayLength}
    />
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
