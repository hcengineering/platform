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
  import { genRanks, IssueStatus, Team, TimeReportDayType, WorkDayLength } from '@hcengineering/tracker'
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
  import TeamIconChooser from './TeamIconChooser.svelte'

  export let team: Team | undefined = undefined

  let name: string = team?.name ?? ''
  let description: string = team?.description ?? ''
  let isPrivate: boolean = team?.private ?? false
  let icon: Asset | undefined = team?.icon ?? undefined
  let selectedWorkDayType: TimeReportDayType | undefined =
    team?.defaultTimeReportDay ?? TimeReportDayType.PreviousWorkDay
  let selectedWorkDayLength: WorkDayLength | undefined = team?.workDayLength ?? WorkDayLength.EIGHT_HOURS
  let defaultAssignee: Ref<Employee> | null | undefined = null
  let members: Ref<Account>[] = team?.members ?? [getCurrentAccount()._id]

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

  $: isNew = !team

  async function handleSave () {
    isNew ? createTeam() : updateTeam()
  }

  let identifier: string = 'TSK'

  const defaultStatusId: Ref<IssueStatus> = generateId()

  function getTeamData () {
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

  async function updateTeam () {
    const { sequence, issueStatuses, defaultIssueStatus, identifier, ...teamData } = getTeamData()
    // update team doc
    await client.update(team!, teamData)
  }

  async function createTeam () {
    const id = await client.createDoc(tracker.class.Team, core.space.Space, getTeamData())
    await createTeamIssueStatuses(id, defaultStatusId)
  }

  async function createTeamIssueStatuses (
    teamId: Ref<Team>,
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
        teamId,
        teamId,
        tracker.class.Team,
        'issueStatuses',
        { name: defaultStatusName, category, rank },
        category === defaultCategoryId ? defaultStatusId : undefined
      )
    }
  }

  function chooseIcon (ev: MouseEvent) {
    showPopup(TeamIconChooser, { icon }, eventToHTMLElement(ev), (result) => {
      if (result !== undefined && result !== null) {
        icon = result
      }
    })
  }
</script>

<Card
  label={isNew ? tracker.string.NewTeam : tracker.string.EditTeam}
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
      placeholder={tracker.string.TeamTitlePlaceholder}
      kind={'large-style'}
      focus
      on:input={() => {
        identifier = name.toLocaleUpperCase().replaceAll(' ', '_').substring(0, 5)
      }}
    />
    <EditBox
      bind:value={identifier}
      disabled={!isNew}
      placeholder={tracker.string.TeamIdentifierPlaceholder}
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
      showTooltip={{ label: tracker.string.DefaultAssignee }}
    />
  </div>
</Card>
