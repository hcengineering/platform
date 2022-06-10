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
  import { createEventDispatcher } from 'svelte'
  import core, { AttachedData, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import presentation, { getClient } from '@anticrm/presentation'
  import { StyledTextArea } from '@anticrm/text-editor'
  import { IssueStatus, IssuePriority, Issue, Team, calcRank } from '@anticrm/tracker'
  import { Button, EditBox } from '@anticrm/ui'
  import tracker from '../../../plugin'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'
  import PriorityEditor from '../PriorityEditor.svelte'

  export let parentIssue: Issue
  export let issueStatuses: WithLookup<IssueStatus>[]
  export let currentTeam: Team

  const dispatch = createEventDispatcher()
  const client = getClient()

  let newIssue: AttachedData<Issue> = getIssueDefaults()
  let thisRef: HTMLDivElement
  let focusIssueTitle: () => void

  function getIssueDefaults (): AttachedData<Issue> {
    return {
      title: '',
      description: '',
      assignee: null,
      project: null,
      number: 0,
      rank: '',
      status: '' as Ref<IssueStatus>,
      priority: IssuePriority.NoPriority,
      dueDate: null,
      comments: 0,
      subIssues: 0
    }
  }

  function resetToDefaults () {
    newIssue = getIssueDefaults()
    focusIssueTitle?.()
  }

  function getTitle (value: string) {
    return value.trim()
  }

  function close () {
    dispatch('close')
  }

  async function createIssue () {
    if (!canSave) {
      return
    }

    const space = currentTeam._id
    const lastOne = await client.findOne<Issue>(
      tracker.class.Issue,
      { space },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.updateDoc(
      tracker.class.Team,
      core.space.Space,
      space,
      { $inc: { sequence: 1 } },
      true
    )

    const value: AttachedData<Issue> = {
      ...newIssue,
      title: getTitle(newIssue.title),
      number: (incResult as any).object.sequence,
      rank: calcRank(lastOne, undefined)
    }

    await client.addCollection(tracker.class.Issue, space, parentIssue._id, parentIssue._class, 'subIssues', value)
    resetToDefaults()
  }

  $: thisRef && thisRef.scrollIntoView({ behavior: 'smooth' })
  $: canSave = getTitle(newIssue.title ?? '').length > 0
  $: if (!newIssue.status && currentTeam?.defaultIssueStatus) {
    newIssue.status = currentTeam.defaultIssueStatus
  }
</script>

<div bind:this={thisRef} class="flex-col root">
  <div class="flex-row-top">
    <div id="status-editor">
      <StatusEditor
        value={newIssue}
        statuses={issueStatuses}
        kind="transparent"
        width="min-content"
        size="medium"
        tooltipAlignment="bottom"
        on:change={({ detail }) => (newIssue.status = detail)}
      />
    </div>
    <div class="w-full flex-col content">
      <EditBox
        bind:value={newIssue.title}
        bind:focusInput={focusIssueTitle}
        maxWidth="33rem"
        placeholder={tracker.string.IssueTitlePlaceholder}
        focus
      />
      <div class="mt-4">
        <StyledTextArea
          bind:content={newIssue.description}
          placeholder={tracker.string.IssueDescriptionPlaceholder}
          showButtons={false}
        />
      </div>
    </div>
  </div>
  <div class="mt-4 flex-between">
    <div class="buttons-group xsmall-gap">
      <!-- <SpaceSelector _class={tracker.class.Team} label={tracker.string.Team} bind:space /> -->
      <AssigneeEditor
        value={newIssue}
        size="small"
        kind="no-border"
        tooltipFill={false}
        on:change={({ detail }) => (newIssue.assignee = detail)}
      />
      <PriorityEditor
        value={newIssue}
        shouldShowLabel
        isEditable
        kind="no-border"
        size="small"
        justify="center"
        width=""
        on:change={({ detail }) => (newIssue.priority = detail)}
      />
    </div>
    <div class="buttons-group small-gap">
      <Button label={presentation.string.Cancel} size="small" kind="transparent" on:click={close} />
      <Button
        disabled={!canSave}
        label={presentation.string.Save}
        size="small"
        kind="no-border"
        on:click={createIssue}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .root {
    padding: 0.5rem 1.5rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.5rem;
    overflow: hidden;

    .content {
      padding-top: 0.3rem;
    }
  }
</style>
