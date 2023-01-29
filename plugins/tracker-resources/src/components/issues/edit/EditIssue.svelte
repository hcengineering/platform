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
  import { AttachmentDocList, AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { Class, Data, Doc, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import presentation, { createQuery, getClient, MessageViewer } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import type { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import {
    Button,
    EditBox,
    getCurrentLocation,
    IconEdit,
    IconMoreH,
    Label,
    navigate,
    Scroller,
    showPopup,
    Spinner
  } from '@hcengineering/ui'
  import { ContextMenu, UpDownNavigator } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { generateIssueShortLink, getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import IssueStatusActivity from '../IssueStatusActivity.svelte'
  import ControlPanel from './ControlPanel.svelte'
  import CopyToClipboard from './CopyToClipboard.svelte'
  import SubIssues from './SubIssues.svelte'
  import SubIssueSelector from './SubIssueSelector.svelte'

  export let _id: Ref<Issue>
  export let _class: Ref<Class<Issue>>

  let lastId: Ref<Doc> = _id
  let lastClass: Ref<Class<Doc>> = _class
  const queryClient = createQuery()
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
  let descriptionBox: AttachmentStyledBox

  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      const prevClass = lastClass
      lastId = _id
      lastClass = _class
      notificationClient.then((client) => client.updateLastView(prev, prevClass))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.updateLastView(_id, _class))
  })

  $: _id &&
    _class &&
    queryClient.query(
      _class,
      { _id },
      async (result) => {
        ;[issue] = result
        title = issue.title
        description = issue.description
        currentTeam = issue.$lookup?.space
      },
      { lookup: { attachedTo: tracker.class.Issue, space: tracker.class.Team } }
    )

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

  $: issueId = currentTeam && issue && getIssueId(currentTeam, issue)
  $: canSave = title.trim().length > 0
  $: isDescriptionEmpty = !new DOMParser().parseFromString(description, 'text/html').documentElement.innerText?.trim()
  $: parentIssue = issue?.$lookup?.attachedTo

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
    await descriptionBox.createAttachments()
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
    withoutTitle
    bind:innerWidth
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={issue} />
    </svelte:fragment>
    <svelte:fragment slot="header">
      <span class="fs-title select-text-i">
        {#if issueId}{issueId}{/if}
      </span>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      {#if isEditing}
        <Button kind={'transparent'} label={presentation.string.Cancel} on:click={cancelEditing} />
        <Button disabled={!canSave} label={presentation.string.Save} on:click={save} />
      {:else}
        <Button icon={IconEdit} kind={'transparent'} size={'medium'} on:click={edit} />
        <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
      {/if}
    </svelte:fragment>

    {#if isEditing}
      <Scroller>
        <div class="popupPanel-body__main-content py-10 clear-mins content">
          {#if parentIssue}
            <div class="mb-6">
              {#if currentTeam && issueStatuses}
                <SubIssueSelector {issue} />
              {:else}
                <Spinner />
              {/if}
            </div>
          {/if}
          <EditBox bind:value={title} placeholder={tracker.string.IssueTitlePlaceholder} kind="large-style" />
          <div class="w-full mt-6">
            <AttachmentStyledBox
              bind:this={descriptionBox}
              objectId={_id}
              _class={tracker.class.Issue}
              space={issue.space}
              alwaysEdit
              showButtons
              maxHeight={'card'}
              focusable
              bind:content={description}
              placeholder={tracker.string.IssueDescriptionPlaceholder}
            />
          </div>
        </div>
      </Scroller>
    {:else}
      {#if parentIssue}
        <div class="mb-6">
          {#if currentTeam && issueStatuses}
            <SubIssueSelector {issue} />
          {:else}
            <Spinner />
          {/if}
        </div>
      {/if}
      <span class="title select-text">{title}</span>
      <div class="mt-6 description-preview select-text">
        {#if isDescriptionEmpty}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="placeholder" on:click={edit}>
            <Label label={tracker.string.IssueDescriptionPlaceholder} />
          </div>
        {:else}
          <MessageViewer message={description} />
        {/if}
      </div>
      <div class="mt-6">
        {#key issue._id && currentTeam !== undefined}
          {#if currentTeam !== undefined && issueStatuses !== undefined}
            <SubIssues
              {issue}
              issueStatuses={new Map([[currentTeam._id, issueStatuses]])}
              teams={new Map([[currentTeam?._id, currentTeam]])}
            />
          {/if}
        {/key}
      </div>
      <div class="mt-6">
        <AttachmentDocList value={issue} />
      </div>
    {/if}

    <span slot="actions-label" class="select-text">
      {#if issueId}{issueId}{/if}
    </span>
    <svelte:fragment slot="actions">
      <div class="flex-grow" />
      {#if issueId}
        <CopyToClipboard issueUrl={generateIssueShortLink(issueId)} {issueId} />
      {/if}
      <Button
        icon={setting.icon.Setting}
        kind={'transparent'}
        showTooltip={{ label: setting.string.ClassSetting }}
        on:click={(ev) => {
          ev.stopPropagation()
          const loc = getCurrentLocation()
          loc.path[2] = settingId
          loc.path[3] = 'setting'
          loc.path[4] = 'classes'
          loc.path.length = 5
          loc.query = { _class }
          loc.fragment = undefined
          navigate(loc)
        }}
      />
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes">
      {#if issue && currentTeam && issueStatuses}
        <ControlPanel {issue} {issueStatuses} />
      {/if}

      <div class="divider" />
      <IssueStatusActivity {issue} />
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
  .divider {
    margin-top: 1rem;
    margin-bottom: 1rem;
    grid-column: 1 / 3;
    height: 1px;
    background-color: var(--divider-color);
  }
</style>
