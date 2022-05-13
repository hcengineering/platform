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
  import { Class, Data, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import presentation, { createQuery, getClient } from '@anticrm/presentation'
  import { Panel } from '@anticrm/panel'
  import { StyledTextBox } from '@anticrm/text-editor'
  import type { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, EditBox, Label, showPanel } from '@anticrm/ui'
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
  let issueUpdates: Partial<Data<Issue>> = {}

  $: _id &&
    _class &&
    query.query(_class, { _id }, async (result) => {
      issue = result[0]
    })

  $: if (issue) {
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
  $: updatedIssue = issue && { ...issue, ...issueUpdates }
  $: canSave = updatedIssue && updatedIssue.title.trim().length > 0

  function updateTitle (event: Event) {
    update('title', (event.target as HTMLInputElement).value)
  }

  function update<K extends keyof Data<Issue>> (field: K, value: Issue[K]) {
    issueUpdates = { ...issueUpdates, [field]: value }
  }

  function cancel () {
    if (issue) {
      showPanel(tracker.component.PreviewIssue, issue._id, issue._class, 'content')
    }
  }

  async function save () {
    if (issue && canSave) {
      for (const [key, value] of Object.entries(issueUpdates)) {
        if (issue[key as keyof Issue] === value) {
          delete issueUpdates[key as keyof Data<Issue>]
        } else if (key === 'title') {
          issueUpdates[key] = issueUpdates[key]?.trim()
        }
      }

      if (Object.keys(issueUpdates).length > 0) {
        await client.update(issue, issueUpdates)
      }

      showPanel(tracker.component.PreviewIssue, issue._id, issue._class, 'content')
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })
</script>

{#if updatedIssue}
  <Panel
    object={updatedIssue}
    isHeader
    withoutActivity
    isAside={true}
    isSub={false}
    bind:innerWidth
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="header">
      <Label label={tracker.string.EditIssue} params={{ title: issueTitle }} />
    </svelte:fragment>
    <svelte:fragment slot="tools">
      <Button kind="transparent" label={presentation.string.Cancel} on:click={cancel} />
      <Button disabled={!canSave} label={presentation.string.Save} on:click={save} />
    </svelte:fragment>

    <div class="popupPanel-body__main-content py-10 clear-mins">
      <div class="mt-6">
        <EditBox
          value={updatedIssue.title}
          placeholder={tracker.string.IssueTitlePlaceholder}
          kind="large-style"
          focus
          on:change={updateTitle}
        />
      </div>
      <div class="mt-6 mb-6">
        <StyledTextBox
          alwaysEdit
          bind:content={updatedIssue.description}
          placeholder={tracker.string.IssueDescriptionPlaceholder}
          on:value={({ detail }) => update('description', detail)}
        />
      </div>
    </div>

    <span slot="actions-label">{issueTitle}</span>
    <svelte:fragment slot="actions">
      <CopyToClipboard issueUrl={window.location.href} issueId={issueTitle} />
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes" let:direction>
      {#if currentTeam && issueStatuses}
        <ControlPanel
          {issueStatuses}
          {direction}
          issue={updatedIssue}
          teamId={currentTeam._id}
          on:issueChange={({ detail }) => update(detail.field, detail.value)}
        />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}
