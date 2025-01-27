<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import { AttachmentStyleBoxCollabEditor } from '@hcengineering/attachment-resources'
  import { Class, Doc, Ref, WithLookup } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import presentation, {
    ActionContext,
    ComponentExtensions,
    contextStore,
    createQuery,
    getClient
  } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import { taskTypeStore, typeStore } from '@hcengineering/task-resources'
  import { Issue, TrackerEvents } from '@hcengineering/tracker'
  import {
    AnyComponent,
    Button,
    Component,
    EditBox,
    FocusHandler,
    IconMixin,
    IconMoreH,
    Label,
    createFocusManager,
    getCurrentResolvedLocation,
    navigate
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocNavLink, ParentsNavigator, showMenu, RelationsEditor } from '@hcengineering/view-resources'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { Analytics } from '@hcengineering/analytics'

  import { createEventDispatcher, onDestroy } from 'svelte'
  import { generateIssueShortLink, getIssueIdByIdentifier } from '../../../issues'
  import tracker from '../../../plugin'
  import IssueStatusActivity from '../IssueStatusActivity.svelte'
  import ControlPanel from './ControlPanel.svelte'
  import CopyToClipboard from './CopyToClipboard.svelte'
  import SubIssueSelector from './SubIssueSelector.svelte'
  import SubIssues from './SubIssues.svelte'

  export let _id: Ref<Issue> | string
  export let _class: Ref<Class<Issue>>
  export let embedded: boolean = false
  export let readonly: boolean = false

  let lastId: Ref<Issue> | undefined

  const queryClient = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let issue: WithLookup<Issue> | undefined
  let title = ''
  let innerWidth: number
  let descriptionBox: AttachmentStyleBoxCollabEditor
  let showAllMixins: boolean

  const inboxClient = InboxNotificationsClientImpl.getClient()

  let issueId: Ref<Issue> | undefined

  $: void getIssueIdByIdentifier(_id).then((res) => {
    issueId = res ?? (_id as Ref<Issue>)

    if (lastId === undefined) {
      lastId = issueId
    }
  })

  $: read(issueId)

  function read (_id?: Ref<Issue>): void {
    if (_id && lastId && lastId !== _id) {
      const prev = lastId
      lastId = _id
      void inboxClient.readDoc(prev)
    }
  }

  onDestroy(async () => {
    if (issueId === undefined) return
    void inboxClient.readDoc(issueId)
  })

  $: if (issueId !== undefined && _class !== undefined) {
    queryClient.query<Issue>(
      _class,
      { _id: issueId },
      async (result) => {
        if (lastId !== issueId) {
          await save()
        }
        ;[issue] = result
        if (issue !== undefined) {
          title = issue.title
        }
      },
      {
        limit: 1
      }
    )
  }

  $: canSave = title.trim().length > 0
  $: hasParentIssue = issue?.attachedTo !== tracker.ids.NoParent

  let saved = false
  async function save (): Promise<void> {
    if (issue === undefined || !canSave) {
      return
    }

    const trimmedTitle = title.trim()

    if (trimmedTitle.length > 0 && trimmedTitle !== issue.title?.trim()) {
      await client.update(issue, { title: trimmedTitle })
      Analytics.handleEvent(TrackerEvents.IssueTitleUpdated, { issue: issue.identifier ?? issue._id })
    }
  }

  function showContextMenu (ev: MouseEvent): void {
    if (issue !== undefined) {
      showMenu(ev, { object: issue, excludedActions: [view.action.Open] })
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

  $: descriptionKey = hierarchy.getAttribute(tracker.class.Issue, 'description')

  function getEditorFooter (
    _class?: Ref<Class<Doc>>
  ): { footer: AnyComponent, props?: Record<string, any> } | undefined {
    if (_class === undefined) {
      return
    }
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditorFooter)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditorFooter(clazz.extends)
    if (editorMixin.editor !== undefined) {
      return { footer: editorMixin.editor, props: editorMixin?.props }
    }
    return undefined
  }
  $: editorFooter = getEditorFooter(issue?._class)

  let content: HTMLElement

  $: taskType = issue?.kind !== undefined ? $taskTypeStore.get(issue?.kind) : undefined

  $: projectType = taskType?.parent !== undefined ? $typeStore.get(taskType.parent) : undefined

  async function unsetParentIssue (): Promise<void> {
    if (issue === undefined || readonly) return

    await client.update(issue, { attachedTo: tracker.ids.NoParent })
    Analytics.handleEvent(TrackerEvents.IssueParentUnset, { issue: issue.identifier ?? issue._id })
  }
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
    isHeader={false}
    withoutInput={readonly}
    allowClose={!embedded}
    isAside={true}
    isSub={false}
    {embedded}
    withoutActivity={false}
    printAside={true}
    adaptive={'default'}
    bind:content
    bind:innerWidth
    on:open
    on:close={() => dispatch('close')}
    on:select
  >
    <svelte:fragment slot="title">
      {#if !embedded && issue.attachedTo !== tracker.ids.NoParent}
        <ParentsNavigator element={issue} />
      {/if}
      {#if embedded}
        <DocNavLink noUnderline object={issue}>
          <div class="title">{issue.identifier}</div>
        </DocNavLink>
      {:else}
        <div class="title not-active">{issue.identifier}</div>
      {/if}

      {#if (projectType?.tasks.length ?? 0) > 1 && taskType !== undefined}
        ({taskType.name})
      {/if}
      <ComponentExtensions
        extension={tracker.extensions.EditIssueTitle}
        props={{ size: 'medium', kind: 'ghost', space: issue.space, value: issue, readonly }}
      />
    </svelte:fragment>
    <svelte:fragment slot="pre-utils">
      <ComponentExtensions
        extension={tracker.extensions.EditIssueHeader}
        props={{ size: 'medium', kind: 'ghost', space: issue.space, readonly, value: issue }}
      />
      {#if saved}
        <Label label={presentation.string.Saved} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if !readonly}
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          dataId={'btnMoreActions'}
          on:click={showContextMenu}
        />
        <CopyToClipboard issueUrl={generateIssueShortLink(issue.identifier)} />
        <Button
          icon={setting.icon.Setting}
          kind={'icon'}
          iconProps={{ size: 'medium' }}
          showTooltip={{ label: setting.string.ClassSetting }}
          dataId={'btnClassSetting'}
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
      {/if}
      <Button
        icon={IconMixin}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        selected={showAllMixins}
        dataId={'btnMixin'}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    {#if hasParentIssue}
      <div class="mb-6 flex-row-center">
        <SubIssueSelector {issue} />
        {#if !readonly}
          <div class="ml-2">
            <Button
              icon={tracker.icon.UnsetParent}
              iconProps={{ size: 'medium' }}
              kind={'regular'}
              showTooltip={{ label: tracker.string.UnsetParentIssue }}
              dataId={'btnUnsetParent'}
              on:click={() => {
                void unsetParentIssue()
              }}
            />
          </div>
        {/if}
      </div>
    {/if}
    <EditBox
      focusIndex={1}
      bind:value={title}
      disabled={readonly}
      placeholder={tracker.string.IssueTitlePlaceholder}
      kind="large-style"
      on:blur={save}
    />
    <div class="w-full mt-6">
      <AttachmentStyleBoxCollabEditor
        focusIndex={30}
        object={issue}
        {readonly}
        key={{ key: 'description', attr: descriptionKey }}
        bind:this={descriptionBox}
        identifier={issue?.identifier}
        placeholder={tracker.string.IssueDescriptionPlaceholder}
        boundary={content}
        on:saved={(evt) => {
          saved = evt.detail
        }}
      />
    </div>
    <div class="mt-6">
      {#key issue._id}
        <SubIssues focusIndex={50} {issue} shouldSaveDraft />
      {/key}
    </div>

    <RelationsEditor object={issue} {readonly} />

    {#if editorFooter}
      <div class="step-tb-6">
        <Component is={editorFooter.footer} props={{ object: issue, _class, ...editorFooter.props, readonly }} />
      </div>
    {/if}

    <span slot="actions-label" class="select-text">
      {issue.identifier}
    </span>

    <svelte:fragment slot="custom-attributes">
      {#if issue !== undefined}
        <div class="space-divider" />
        <ControlPanel {issue} {showAllMixins} {readonly} />
      {/if}

      <div class="popupPanel-body__aside-grid">
        <div class="divider" />
        <IssueStatusActivity {issue} />
      </div>
    </svelte:fragment>
  </Panel>
{/if}
