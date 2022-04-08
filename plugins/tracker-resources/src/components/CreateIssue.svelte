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
  import contact, { Employee } from '@anticrm/contact'
  import core, { Data, generateId, Ref, SortingOrder } from '@anticrm/core'
  import { Asset, IntlString } from '@anticrm/platform'
  import { getClient, UserBox } from '@anticrm/presentation'
  import { Issue, IssuePriority, IssueStatus, Team } from '@anticrm/tracker'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { EditBox, Button, showPopup, DatePresenter } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import { calcRank } from '../utils'
  import Card from './Card.svelte'
  import SelectPopup from './SelectPopup.svelte'
  import StatusSelector from './StatusSelector.svelte'
  import PrioritySelector from './PrioritySelector.svelte'

  export let space: Ref<Team>
  export let parent: Ref<Issue> | undefined
  export let issueStatus = IssueStatus.Backlog
  $: _space = space
  $: _parent = parent

  let assignee: Ref<Employee> | null = null

  const object: Data<Issue> = {
    title: '',
    description: '',
    assignee: null,
    number: 0,
    rank: '',
    status: issueStatus,
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

  const moreActions: Array<{ icon: Asset; label: IntlString }> = [
    { icon: tracker.icon.DueDate, label: tracker.string.DueDate },
    { icon: tracker.icon.Parent, label: tracker.string.Parent }
  ]
  let issueDate: number | null = null
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
  <div class="mt-4">
    <StyledTextBox
      alwaysEdit
      showButtons={false}
      bind:content={object.description}
      placeholder={tracker.string.IssueDescriptionPlaceholder}
    />
  </div>
  <div slot="pool" class="flex-row-center text-sm gap-1-5">
    <StatusSelector bind:status={object.status} />
    <PrioritySelector bind:priority={object.priority} />
    <UserBox
      _class={contact.class.Employee}
      title={tracker.string.Assignee}
      caption={tracker.string.Assignee}
      bind:value={assignee}
      allowDeselect
      titleDeselect={tracker.string.TaskUnAssign}
    />
    <Button
      label={tracker.string.Labels}
      icon={tracker.icon.Labels}
      width="min-content"
      size="small"
      kind="no-border"
    />
    <Button
      label={tracker.string.Project}
      icon={tracker.icon.Projects}
      width="min-content"
      size="small"
      kind="no-border"
    />
    <DatePresenter value={issueDate} editable />
    <Button
      icon={tracker.icon.MoreActions}
      width="min-content"
      size="small"
      kind="transparent"
      on:click={(ev) => {
        showPopup(SelectPopup, { value: moreActions }, ev.currentTarget)
      }}
    />
  </div>
</Card>
