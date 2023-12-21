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
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import presentation, {
    createQuery,
    getClient,
    ActionContext,
    contextStore,
    ComponentExtensions
  } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import { Issue, Project } from '@hcengineering/tracker'
  import {
    AnyComponent,
    Button,
    Component,
    EditBox,
    FocusHandler,
    IconMixin,
    IconMoreH,
    Label,
    Spinner,
    createFocusManager,
    getCurrentResolvedLocation,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu, DocNavLink, ParentsNavigator } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { generateIssueShortLink, getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import IssueStatusActivity from '../IssueStatusActivity.svelte'
  import ControlPanel from './ControlPanel.svelte'
  import CopyToClipboard from './CopyToClipboard.svelte'
  import SubIssueSelector from './SubIssueSelector.svelte'
  import SubIssues from './SubIssues.svelte'

  export let _id: Ref<Issue>
  export let _class: Ref<Class<Issue>>
  export let embedded: boolean = false

  let lastId: Ref<Doc> = _id
  const queryClient = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let issue: WithLookup<Issue> | undefined
  let currentProject: Project | undefined
  let title = ''
  let innerWidth: number
  let descriptionBox: AttachmentStyleBoxCollabEditor
  let showAllMixins: boolean

  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      void notificationClient.then((client) => client.read(prev))
    }
  }

  onDestroy(async () => {
    void notificationClient.then((client) => client.read(_id))
  })

  $: _id !== undefined &&
    _class !== undefined &&
    queryClient.query<Issue>(
      _class,
      { _id },
      async (result) => {
        if (lastId !== _id) {
          await save()
        }
        ;[issue] = result
        if (issue !== undefined) {
          title = issue.title
          currentProject = issue.$lookup?.space
        }
      },
      { lookup: { attachedTo: tracker.class.Issue, space: tracker.class.Project } }
    )

  $: issueId = currentProject !== undefined && issue !== undefined && getIssueId(currentProject, issue)
  $: canSave = title.trim().length > 0
  $: parentIssue = issue?.$lookup?.attachedTo

  let saved = false
  async function save (): Promise<void> {
    if (issue === undefined || !canSave) {
      return
    }

    const trimmedTitle = title.trim()

    if (trimmedTitle.length > 0 && trimmedTitle !== issue.title?.trim()) {
      await client.update(issue, { title: trimmedTitle })
    }
  }

  function showMenu (ev?: Event): void {
    if (issue !== undefined) {
      showPopup(
        ContextMenu,
        { object: issue, excludedActions: [view.action.Open] },
        (ev as MouseEvent).target as HTMLElement
      )
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
    isAside={true}
    isSub={false}
    {embedded}
    withoutActivity={false}
    bind:content
    bind:innerWidth
    on:open
    on:close={() => dispatch('close')}
    on:select
  >
    <svelte:fragment slot="title">
      {#if !embedded}<ParentsNavigator element={issue} />{/if}
      {#if embedded && issueId}
        <DocNavLink noUnderline object={issue}>
          <div class="title">{issueId}</div>
        </DocNavLink>
      {:else if issueId}<div class="title not-active">{issueId}</div>{/if}
    </svelte:fragment>
    <svelte:fragment slot="pre-utils">
      <ComponentExtensions
        extension={tracker.extensions.EditIssueHeader}
        props={{ size: 'medium', kind: 'ghost', space: issue.space }}
      />
      {#if saved}
        <Label label={presentation.string.Saved} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <Button icon={IconMoreH} iconProps={{ size: 'medium' }} kind={'icon'} on:click={showMenu} />
      {#if issueId}
        <CopyToClipboard issueUrl={generateIssueShortLink(issueId)} />
      {/if}
      <Button
        icon={setting.icon.Setting}
        kind={'icon'}
        iconProps={{ size: 'medium' }}
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
        icon={IconMixin}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
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
    />
    <div class="w-full mt-6">
      <AttachmentStyleBoxCollabEditor
        focusIndex={30}
        object={issue}
        key={{ key: 'description', attr: descriptionKey }}
        bind:this={descriptionBox}
        placeholder={tracker.string.IssueDescriptionPlaceholder}
        boundary={content}
        on:saved={(evt) => {
          saved = evt.detail
        }}
      />
    </div>
    <div class="mt-6">
      {#key issue._id !== undefined && currentProject !== undefined}
        {#if currentProject !== undefined}
          <SubIssues focusIndex={50} {issue} shouldSaveDraft />
        {/if}
      {/key}
    </div>

    {#if editorFooter}
      <div class="step-tb-6">
        <Component is={editorFooter.footer} props={{ object: issue, _class, ...editorFooter.props }} />
      </div>
    {/if}

    <span slot="actions-label" class="select-text">
      {#if issueId}{issueId}{/if}
    </span>

    <svelte:fragment slot="custom-attributes">
      {#if issue !== undefined && currentProject}
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
