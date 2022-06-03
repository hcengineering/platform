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
  import { AttachedData, Ref, WithLookup } from '@anticrm/core'
  import presentation, { SpaceSelector } from '@anticrm/presentation'
  import { StyledTextArea } from '@anticrm/text-editor'
  import { IssueStatus, Team, IssuePriority, Issue } from '@anticrm/tracker'
  import { Button, EditBox } from '@anticrm/ui'
  import tracker from '../../../plugin'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'

  export let teamId: Ref<Team>
  export let issueStatuses: WithLookup<IssueStatus>[]

  const dispatch = createEventDispatcher()
  const issue: AttachedData<Issue> = {
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

  let content: HTMLDivElement
  let space = teamId

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

    console.log('TODO: save')
  }

  $: content && content.scrollIntoView({ behavior: 'smooth' })
  $: canSave = getTitle(issue.title ?? '').length > 0
</script>

<div class="flex-col root">
  <div class="flex-row-top">
    <StatusEditor
      value={issue}
      statuses={issueStatuses}
      kind="transparent"
      width="min-content"
      size="medium"
      tooltipFill={false}
      tooltipAlignment="bottom"
      on:change={({ detail }) => (issue.status = detail)}
    />
    <div bind:this={content} class="w-full flex-col content">
      <EditBox bind:value={issue.title} maxWidth="33rem" placeholder={tracker.string.IssueTitlePlaceholder} />
      <div class="mt-4">
        <StyledTextArea
          bind:content={issue.description}
          placeholder={tracker.string.IssueDescriptionPlaceholder}
          showButtons={false}
        />
      </div>
    </div>
  </div>
  <div class="mt-4 flex-between">
    <div class="buttons-group xsmall-gap">
      <SpaceSelector _class={tracker.class.Team} label={tracker.string.Team} bind:space />
      <AssigneeEditor
        value={issue}
        size="small"
        kind="no-border"
        tooltipFill={false}
        on:change={({ detail }) => (issue.assignee = detail)}
      />
    </div>
    <div class="buttons-group">
      <Button
        label={presentation.string.Cancel}
        size="small"
        kind="transparent"
        on:click={close}
      />
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
