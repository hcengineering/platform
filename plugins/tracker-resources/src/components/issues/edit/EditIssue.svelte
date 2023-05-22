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
  import { Breadcrumbs, BreadcrumbsModel, createQuery, getClient } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import { Issue, Project } from '@hcengineering/tracker'
  import {
    Button,
    EditBox,
    FocusHandler,
    IconMixin,
    IconMoreH,
    Label,
    Spinner,
    createFocusManager,
    getCurrentResolvedLocation,
    locationToUrl,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import { ActionContext, ContextMenu, DocNavLink, UpDownNavigator, contextStore } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { generateIssueShortLink, getIssueId, issueLinkFragmentProvider } from '../../../issues'
  import tracker from '../../../plugin'
  import IssueStatusActivity from '../IssueStatusActivity.svelte'
  import ControlPanel from './ControlPanel.svelte'
  import CopyToClipboard from './CopyToClipboard.svelte'
  import SubIssueSelector from './SubIssueSelector.svelte'
  import SubIssues from './SubIssues.svelte'

  export let _id: Ref<Issue>
  export let _class: Ref<Class<Issue>>
  export let embedded = false

  let lastId: Ref<Doc> = _id
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
      lastId = _id
      notificationClient.then((client) => client.read(prev))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.read(_id))
  })

  $: _id &&
    _class &&
    queryClient.query(
      _class,
      { _id },
      async (result) => {
        if (saveTrigger !== undefined && lastId !== _id) {
          clearTimeout(saveTrigger)
          await save()
        }
        ;[issue] = result
        if (issue) {
          title = issue.title
          description = issue.description
          currentProject = issue.$lookup?.space
        }
      },
      { lookup: { attachedTo: tracker.class.Issue, space: tracker.class.Project } }
    )

  $: issueId = currentProject && issue && getIssueId(currentProject, issue)
  $: canSave = title.trim().length > 0
  $: parentIssue = issue?.$lookup?.attachedTo

  async function getBreadcrumbsModels (issue: Issue): Promise<BreadcrumbsModel[]> {
    const parentsMap = new Map(
      issue.parents.length > 0
        ? await client
          .findAll(tracker.class.Issue, { _id: { $in: issue.parents.map((p) => p.parentId) } })
          .then((issues) => issues.map((p) => [p._id, p]))
        : []
    )
    const parents = issue.parents.reduce((acc, curr) => {
      const parent = parentsMap.get(curr.parentId)
      if (parent) {
        acc.unshift(parent)
      }
      return acc
    }, [] as Issue[])

    return await Promise.all(
      [...parents, issue].map(async (issue) => {
        const loc = await issueLinkFragmentProvider(issue)

        return {
          title: issue.title,
          href: `${window.location.origin}${locationToUrl(loc)}`
        }
      })
    )
  }

  let saved = false
  async function save () {
    clearTimeout(saveTrigger)
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
      await client.update(issue, updates)
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

  const manager = createFocusManager()
  export function canClose (): boolean {
    if (descriptionBox.isFocused()) {
      return false
    }
    return true
  }

  // If it is embedded
  $: lastCtx = $contextStore.getLastContext()
  $: isContextEnabled = lastCtx?.mode === 'editor' || lastCtx?.mode === 'browser'
</script>

{#if !embedded}
  <FocusHandler {manager} isEnabled={isContextEnabled} />
  <ActionContext
    context={{
      mode: 'editor'
    }}
  />
{/if}

{#if issue !== undefined}
  <Panel
    object={issue}
    isHeader
    isAside={true}
    isSub={false}
    withoutActivity={false}
    {embedded}
    withoutTitle
    bind:innerWidth
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="navigator">
      <!-- TODO: add horizontal scroll -->
      <UpDownNavigator element={issue} />
      {#await getBreadcrumbsModels(issue) then models}
        <Breadcrumbs {models} gap="none" />
      {/await}
    </svelte:fragment>
    <svelte:fragment slot="header">
      <span class="fs-title select-text-i">
        {#if embedded}
          <DocNavLink object={issue}>
            {#if issueId}{issueId}{/if}
          </DocNavLink>
        {:else if issueId}{issueId}{/if}
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
    <EditBox
      focusIndex={1}
      bind:value={title}
      placeholder={tracker.string.IssueTitlePlaceholder}
      kind="large-style"
      on:blur={save}
      focus={!embedded}
    />
    <div class="w-full mt-6">
      {#key issue._id}
        <AttachmentStyledBox
          focusIndex={30}
          bind:this={descriptionBox}
          useAttachmentPreview={true}
          objectId={_id}
          _class={tracker.class.Issue}
          space={issue.space}
          alwaysEdit
          on:attached={(e) => descriptionBox.saveNewAttachment(e.detail)}
          on:detached={(e) => descriptionBox.removeAttachmentById(e.detail)}
          showButtons
          on:blur={save}
          on:changeContent={triggerSave}
          maxHeight={'card'}
          focusable
          bind:content={description}
          placeholder={tracker.string.IssueDescriptionPlaceholder}
        />
      {/key}
    </div>

    <div class="mt-6">
      {#key issue._id && currentProject !== undefined}
        {#if currentProject !== undefined}
          <SubIssues
            focusIndex={50}
            {issue}
            shouldSaveDraft
            projects={new Map([[currentProject?._id, currentProject]])}
          />
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
          const loc = getCurrentResolvedLocation()
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
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      >
        <svelte:fragment slot="icon">
          <IconMixin size={'small'} />
        </svelte:fragment>
      </Button>
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes">
      {#if issue && currentProject}
        <div class="space-divider" />
        <ControlPanel {issue} {showAllMixins} />
      {/if}

      <div class="popupPanel-body__aside-grid">
        <div class="divider" />
        <IssueStatusActivity {issue} />
      </div>
    </svelte:fragment>
  </Panel>
{/if}
