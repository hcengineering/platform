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
  import { Asset, IntlString } from '@anticrm/platform'
  import contact, { Employee } from '@anticrm/contact'
  import core, { Data, generateId, Ref, SortingOrder } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { getClient, UserBox } from '@anticrm/presentation'
  import { Issue, IssuePriority, IssueStatus, Team } from '@anticrm/tracker'
  import { StyledTextBox } from '@anticrm/text-editor'
  import ui, { EditBox, Grid, Status as StatusControl, Button, showPopup, DatePresenter, DateRangePresenter } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import { calcRank } from '../utils'
  import Card from './Card.svelte'
  import SelectPopup from './SelectPopup.svelte'

  export let space: Ref<Team>
  export let parent: Ref<Issue> | undefined
  
  $: _space = space
  $: _parent = parent
  const status: Status = OK

  let assignee: Ref<Employee> | null = null

  const object: Data<Issue> = {
    title: '',
    description: '',
    assignee: null,
    number: 0,
    rank: '',
    status: IssueStatus.Backlog,
    priority: IssuePriority.NoPriority,
    dueDate: null,
    comments: 0
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const taskId: Ref<Issue> = generateId()

  export function canClose (): boolean {
    return object.title !== ''
  }

  async function createIssue () {
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

    const value: Data<Issue> = {
      title: object.title,
      description: object.description,
      assignee,
      number: (incResult as any).object.sequence,
      status: object.status,
      priority: object.priority,
      rank: calcRank(lastOne, undefined),
      parentIssue: _parent,
      comments: 0,
      dueDate: object.dueDate
    }

    await client.createDoc(tracker.class.Issue, _space, value, taskId)
  }

  let startDate: number | null = null
  let targetDate: number | null = null
  interface IPair {
    icon: Asset
    label: IntlString
  }
  const statuses: Array<IPair> =
    [{ icon: tracker.icon.StatusBacklog, label: tracker.string.Backlog },
     { icon: tracker.icon.StatusTodo, label: tracker.string.Todo },
     { icon: tracker.icon.StatusInProgress, label: tracker.string.InProgress },
     { icon: tracker.icon.StatusDone, label: tracker.string.Done },
     { icon: tracker.icon.StatusCanceled, label: tracker.string.Canceled }]
  let selectStatus: IPair = statuses[0]
  const priorities: Array<IPair> =
    [{ icon: tracker.icon.PriorityNoPriority, label: tracker.string.NoPriority },
     { icon: tracker.icon.PriorityUrgent, label: tracker.string.Urgent },
     { icon: tracker.icon.PriorityHigh, label: tracker.string.High },
     { icon: tracker.icon.PriorityMedium, label: tracker.string.Medium },
     { icon: tracker.icon.PriorityLow, label: tracker.string.Low }]
  let selectPriority: IPair = priorities[0]
</script>

<!-- canSave: object.title.length > 0 && _space != null -->
<Card
  label={tracker.string.NewIssue}
  okAction={createIssue}
  icon={tracker.icon.Home}
  canSave={true}
  okLabel={tracker.string.SaveIssue}
  spaceClass={tracker.class.Team}
  spaceLabel={tracker.string.Team}
  spacePlaceholder={tracker.string.SelectTeam}
  createMore={false}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
>
  <EditBox
    bind:value={object.title}
    placeholder={tracker.string.IssueTitlePlaceholder}
    maxWidth={'37.5rem'}
    kind={'large-style'}
    focus
  />
  <!-- <StyledTextBox alwaysEdit bind:content={object.description} placeholder={tracker.string.IssueDescriptionPlaceholder}/> -->
  <!-- <UserBox
    _class={contact.class.Employee}
    title={tracker.string.Assignee}
    caption={tracker.string.Assignee}
    bind:value={assignee}
    allowDeselect
    titleDeselect={tracker.string.TaskUnAssign}
  /> -->
  <div style="height: 30px"></div>
  <div slot="pool" class="flex-row-center text-sm gap-1-5">
    <Button
      label={selectStatus.label}
      icon={selectStatus.icon}
      width={'min-content'}
      size={'small'}
      kind={'no-border'}
      on:click={(ev) => {
        showPopup(SelectPopup, { value: statuses, placeholder: tracker.string.SetStatus, searchable: true }, ev.currentTarget, (result) => {
          if (result !== undefined) { selectStatus = result }
        })
      }}
    />
    <Button
      label={selectPriority.label}
      icon={selectPriority.icon}
      width={'min-content'}
      size={'small'}
      kind={'no-border'}
      on:click={(ev) => {
        showPopup(SelectPopup, { value: priorities, placeholder: tracker.string.SetStatus }, ev.currentTarget, (result) => {
          if (result !== undefined) { selectPriority = result }
        })
      }}
    />
    <DateRangePresenter value={startDate} labelNull={ui.string.StartDate} editable />
    <DateRangePresenter value={targetDate} labelNull={ui.string.TargetDate} editable />
  </div>
</Card>
