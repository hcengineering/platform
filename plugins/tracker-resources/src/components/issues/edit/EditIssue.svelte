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
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { Class, Data, Doc, Ref, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import type { Issue, Project } from '@hcengineering/tracker'
  import {
    Button,
    EditBox,
    getCurrentLocation,
    IconMixin,
    IconMoreH,
    Label,
    navigate,
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
  const dispatch = createEventDispatcher()
  const client = getClient()

  let issue: WithLookup<Issue> | undefined
  let currentProject: Project | undefined
  let title = ''
  let description = ''
  let innerWidth: number
  let descriptionBox: AttachmentStyledBox
  let showAllMixins: boolean

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
        currentProject = issue.$lookup?.space
      },
      { lookup: { attachedTo: tracker.class.Issue, space: tracker.class.Project } }
    )

  $: issueId = currentProject && issue && getIssueId(currentProject, issue)
  $: canSave = title.trim().length > 0
  $: parentIssue = issue?.$lookup?.attachedTo

  let saved = false
  async function save () {
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
      saved = true
      setTimeout(() => {
        saved = false
      }, 5000)
    }
    await descriptionBox.createAttachments()
  }

  let saveTrigger: any
  function triggerSave (): void {
    clearTimeout(saveTrigger)
    saveTrigger = setTimeout(save, 5000)
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
    withoutActivity={false}
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
      {#if saved}
        <Label label={tracker.string.Saved} />
      {/if}
      <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
    </svelte:fragment>

    {#if parentIssue}
      <div class="mb-6">
        {#if currentProject}
          <SubIssueSelector {issue} />
        {:else}
          <Spinner />
        {/if}
      </div>
    {/if}
    <EditBox bind:value={title} placeholder={tracker.string.IssueTitlePlaceholder} kind="large-style" on:blur={save} />
    <div class="w-full mt-6">
      <AttachmentStyledBox
        bind:this={descriptionBox}
        useAttachmentPreview={true}
        objectId={_id}
        _class={tracker.class.Issue}
        space={issue.space}
        alwaysEdit
        shouldSaveDraft={false}
        on:attached={save}
        on:detached={save}
        showButtons
        on:blur={save}
        on:changeContent={triggerSave}
        maxHeight={'card'}
        focusable
        bind:content={description}
        placeholder={tracker.string.IssueDescriptionPlaceholder}
      />
    </div>

    <div class="mt-6">
      {#key issue._id && currentProject !== undefined}
        {#if currentProject !== undefined}
          <SubIssues {issue} shouldSaveDraft projects={new Map([[currentProject?._id, currentProject]])} />
        {/if}
      {/key}
    </div>

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
      <Button
        kind={'transparent'}
        shape={'round'}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      >
        <svelte:fragment slot="content">
          <IconMixin size={'small'} />
        </svelte:fragment>
      </Button>
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes">
      {#if issue && currentProject}
        <ControlPanel {issue} {showAllMixins} />
      {/if}

      <div class="divider" />
      <IssueStatusActivity {issue} />
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .divider {
    margin-top: 1rem;
    margin-bottom: 1rem;
    grid-column: 1 / 3;
    height: 1px;
    background-color: var(--divider-color);
  }
</style>
