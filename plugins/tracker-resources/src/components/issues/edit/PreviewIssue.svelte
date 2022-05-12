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
  import { Class, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { AttachmentDocList } from '@anticrm/attachment-resources'
  import { Panel } from '@anticrm/panel'
  import { createQuery, getClient, MessageViewer } from '@anticrm/presentation'
  import type { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, IconDownOutline, IconEdit, IconMoreH, IconUpOutline, Label, showPanel } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../../plugin'
  import ControlPanel from './ControlPanel.svelte'
  import CopyToClipboard from './CopyToClipboard.svelte'

  export let _id: Ref<Issue>
  export let _class: Ref<Class<Issue>>

  const query = createQuery()
  const statusesQuery = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let issue: Issue | undefined
  let currentTeam: Team | undefined
  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  let innerWidth: number

  $: _id &&
    _class &&
    query.query(_class, { _id }, async (result) => {
      issue = result[0]
    })

  $: if (issue !== undefined) {
    client.findOne(tracker.class.Team, { _id: issue.space }).then((r) => {
      currentTeam = r
    })
  }

  $: currentTeam &&
    statusesQuery.query(
      tracker.class.IssueStatus,
      { attachedTo: currentTeam._id },
      (statuses) => {
        issueStatuses = statuses
      },
      {
        lookup: { category: tracker.class.IssueStatusCategory },
        sort: { rank: SortingOrder.Ascending }
      }
    )

  $: issueTitle = currentTeam && issue && `${currentTeam.identifier}-${issue.number}`

  function change (field: string, value: any) {
    if (issue !== undefined) {
      client.update(issue, { [field]: value })
    }
  }

  function handleIssueEditorOpened () {
    if (issue !== undefined) {
      showPanel(tracker.component.EditIssue, issue._id, issue._class, 'content')
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })
</script>

{#if issue !== undefined}
  <Panel
    object={issue}
    isHeader
    isAside={true}
    isSub={false}
    bind:innerWidth
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="subtitle">
      <div class="flex-between flex-grow">
        <div class="buttons-group xsmall-gap">
          <Button icon={IconEdit} kind={'transparent'} size="medium" on:click={handleIssueEditorOpened} />
          {#if innerWidth < 900}
            <Button icon={IconMoreH} kind={'transparent'} size="medium" />
          {/if}
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="navigator">
      <Button icon={IconDownOutline} kind="secondary" size="medium" />
      <Button icon={IconUpOutline} kind="secondary" size="medium" />
    </svelte:fragment>
    <svelte:fragment slot="header">
      <span class="fs-title">
        {#if issueTitle !== undefined}
          {issueTitle}
        {/if}
      </span>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      <Button icon={IconEdit} kind="transparent" size="medium" on:click={handleIssueEditorOpened} />
      <Button icon={IconMoreH} kind="transparent" size="medium" />
    </svelte:fragment>

    <span class="mt-6 title">{issue.title}</span>
    <div class="mt-6 mb-6">
      {#if issue.description}
        <MessageViewer message={issue.description} />
      {:else}
        <div on:click={handleIssueEditorOpened}>
          <Label label={tracker.string.IssueDescriptionPlaceholder} />
        </div>
      {/if}
      <AttachmentDocList value={issue} />
    </div>

    <span slot="actions-label">
      {#if issueTitle !== undefined}
        {issueTitle}
      {/if}
    </span>
    <svelte:fragment slot="actions">
      <CopyToClipboard issueUrl={window.location.href} issueId={issueTitle} />
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes" let:direction>
      {#if issue && currentTeam && issueStatuses}
        <ControlPanel
          {issue}
          {issueStatuses}
          {direction}
          teamId={currentTeam._id}
          on:issueChange={({ detail }) => change(detail.field, detail.value)}
        />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
</style>
