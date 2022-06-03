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
  import { AttachmentDocList } from '@anticrm/attachment-resources'
  import { Panel } from '@anticrm/panel'
  import presentation, { createQuery, getClient, MessageViewer } from '@anticrm/presentation'
  import type { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import {
    ActionIcon,
    Button,
    EditBox,
    IconDownOutline,
    IconEdit,
    IconMoreH,
    IconUpOutline,
    Label,
    Scroller,
    showPopup,
    Spinner
  } from '@anticrm/ui'
  import { ContextMenu } from '@anticrm/view-resources'
  import { StyledTextArea } from '@anticrm/text-editor'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../../plugin'
  import ControlPanel from './ControlPanel.svelte'
  import CopyToClipboard from './CopyToClipboard.svelte'
  import SubIssueSelector from './SubIssueSelector.svelte'
  import SubIssues from './SubIssues.svelte'

  export let _id: Ref<Issue>
  export let _class: Ref<Class<Issue>>

  const query = createQuery()
  const statusesQuery = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let issue: WithLookup<Issue> | undefined
  let currentTeam: Team | undefined
  let issueStatuses: WithLookup<IssueStatus>[] | undefined
  let title = ''
  let description = ''
  let innerWidth: number
  let isEditing = false

  $: _id &&
    _class &&
    query.query(
      _class,
      { _id },
      async (result) => {
        ;[issue] = result
        title = issue.title
        description = issue.description
      },
      { lookup: { attachedTo: tracker.class.Issue } }
    )

  $: if (issue) {
    client.findOne(tracker.class.Team, { _id: issue.space }).then((r) => (currentTeam = r))
  }

  $: currentTeam &&
    statusesQuery.query(
      tracker.class.IssueStatus,
      { attachedTo: currentTeam._id },
      (statuses) => (issueStatuses = statuses),
      {
        lookup: { category: tracker.class.IssueStatusCategory },
        sort: { rank: SortingOrder.Ascending }
      }
    )

  $: issueId = currentTeam && issue && `${currentTeam.identifier}-${issue.number}`
  $: canSave = title.trim().length > 0
  $: isDescriptionEmpty = !new DOMParser().parseFromString(description, 'text/html').documentElement.innerText?.trim()

  function edit (ev: MouseEvent) {
    ev.preventDefault()

    isEditing = true
  }

  function cancelEditing (ev: MouseEvent) {
    ev.preventDefault()

    isEditing = false

    if (issue) {
      title = issue.title
      description = issue.description
    }
  }

  async function save (ev: MouseEvent) {
    ev.preventDefault()

    if (!issue || !canSave) {
      return
    }

    const updates: Partial<Data<Issue>> = {}
    const trimmedTitle = title.trim()

    if (trimmedTitle.length > 0 && trimmedTitle !== issue.title) {
      updates.title = trimmedTitle
    }

    if (description !== issue.description) {
      updates.description = description
    }

    if (Object.keys(updates).length > 0) {
      await client.updateCollection(
        issue._class,
        issue.space,
        issue._id,
        issue.attachedTo,
        issue.attachedToClass,
        issue.collection,
        updates
      )
    }

    isEditing = false
  }

  function showMenu (ev?: Event): void {
    if (issue) {
      showPopup(ContextMenu, { object: issue }, (ev as MouseEvent).target as HTMLElement)
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
    withoutActivity={isEditing}
    bind:innerWidth
    isFullSize
    on:fullsize
    on:close={() => dispatch('close')}
  >
    {@const { attachedTo: parentIssue } = issue?.$lookup ?? {}}
    <svelte:fragment slot="subtitle">
      <div class="flex-between flex-grow">
        <div class="buttons-group xsmall-gap">
          <Button icon={IconEdit} kind={'transparent'} size="medium" on:click={edit} />
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
        {#if issueId}{issueId}{/if}
      </span>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      {#if isEditing}
        <Button kind="transparent" label={presentation.string.Cancel} on:click={cancelEditing} />
        <Button disabled={!canSave} label={presentation.string.Save} on:click={save} />
      {:else}
        <Button icon={IconEdit} kind="transparent" size="medium" on:click={edit} />
        <ActionIcon icon={IconMoreH} size={'medium'} action={showMenu} />
      {/if}
    </svelte:fragment>

    {#if isEditing}
      <Scroller>
        <div class="popupPanel-body__main-content py-10 clear-mins content">
          {#if parentIssue}
            <div class="mb-6">
              {#if currentTeam && issueStatuses}
                <SubIssueSelector {issue} {issueStatuses} team={currentTeam} />
              {:else}
                <Spinner />
              {/if}
            </div>
          {/if}
          <EditBox
            bind:value={title}
            maxWidth="53.75rem"
            placeholder={tracker.string.IssueTitlePlaceholder}
            kind="large-style"
          />
          <div class="mt-6">
            {#key description}
              <StyledTextArea
                bind:content={description}
                placeholder={tracker.string.IssueDescriptionPlaceholder}
                focus
              />
            {/key}
          </div>
        </div>
      </Scroller>
    {:else}
      {#if parentIssue}
        <div class="mb-6">
          {#if currentTeam && issueStatuses}
            <SubIssueSelector {issue} {issueStatuses} team={currentTeam} />
          {:else}
            <Spinner />
          {/if}
        </div>
      {/if}
      <span class="title">{title}</span>
      <div class="mt-6 description-preview">
        {#if isDescriptionEmpty}
          <div class="placeholder" on:click={edit}>
            <Label label={tracker.string.IssueDescriptionPlaceholder} />
          </div>
        {:else}
          <MessageViewer message={description} />
        {/if}
      </div>
      <div class="mt-6">
        <SubIssues {issue} {issueStatuses} />
      </div>
    {/if}
    <AttachmentDocList value={issue} />

    <span slot="actions-label">
      {#if issueId}{issueId}{/if}
    </span>
    <svelte:fragment slot="actions">
      <CopyToClipboard issueUrl={window.location.href} {issueId} />
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes">
      {#if issue && currentTeam && issueStatuses}
        <ControlPanel {issue} {issueStatuses} />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1.125rem;
    color: var(--theme-caption-color);
  }

  .content {
    height: auto;
  }

  .description-preview {
    color: var(--theme-content-color);
    line-height: 150%;

    .placeholder {
      color: var(--theme-content-trans-color);
    }
  }
</style>
