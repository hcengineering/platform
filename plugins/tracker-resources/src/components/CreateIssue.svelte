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
  import presentation, { getClient, UserBox, Card, MessageBox } from '@anticrm/presentation'
  import { Issue, IssuePriority, IssueStatus, Team } from '@anticrm/tracker'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { EditBox, Button, showPopup, DatePresenter, SelectPopup, IconAttachment, eventToHTMLElement } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import { calcRank } from '../utils'
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
    // if (object.title !== undefined) {
    //   showPopup(
    //     MessageBox,
    //     {
    //       label: 'Close create dialog',
    //       message: 'Do you sure to cloase create dialog'
    //     },
    //     undefined,
    //     (result?: boolean) => {
    //       if (result === true) {
    //       }
    //     }
    //   )
    // }
    return object.title === ''
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

  const handlePriorityChanged = (newPriority: IssuePriority | undefined) => {
    if (newPriority === undefined) {
      return
    }

    object.priority = newPriority
  }

  const handleStatusChanged = (newStatus: IssueStatus | undefined) => {
    if (newStatus === undefined) {
      return
    }

    object.status = newStatus
  }
</script>

<!-- canSave: object.title.length > 0 && _space != null -->
<Card
  label={tracker.string.NewIssue}
  okAction={createIssue}
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
  <svelte:fragment slot="space">
    <Button icon={tracker.icon.Home} label={presentation.string.Save} size={'small'} kind={'no-border'} disabled on:click={() => { }} />
  </svelte:fragment>
  <EditBox
    bind:value={object.title}
    placeholder={tracker.string.IssueTitlePlaceholder}
    maxWidth={'37.5rem'}
    kind={'large-style'}
    focus
  />
  <StyledTextBox
    alwaysEdit
    showButtons={false}
    bind:content={object.description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <svelte:fragment slot="pool">
    <StatusSelector bind:status={object.status} onStatusChange={handleStatusChanged} />
    <PrioritySelector bind:priority={object.priority} onPriorityChange={handlePriorityChanged} />
    <UserBox
      _class={contact.class.Employee}
      label={tracker.string.Assignee}
      placeholder={tracker.string.AssignTo}
      bind:value={assignee}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
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
    <DatePresenter bind:value={object.dueDate} editable />
    <Button
      icon={tracker.icon.MoreActions}
      width="min-content"
      size="small"
      kind="transparent"
      on:click={(ev) => {
        showPopup(SelectPopup, { value: moreActions }, eventToHTMLElement(ev))
      }}
    />
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button icon={IconAttachment} kind={'transparent'} on:click={() => { }} />
  </svelte:fragment>
</Card>
