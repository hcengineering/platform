<!--
//
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
//
-->
<script lang="ts">
  import { Attachments } from '@hcengineering/attachment-resources'
  import { EmployeeAccount } from '@hcengineering/contact'
  import core, { Class, Doc, generateId, getCurrentAccount, Ref, WithLookup } from '@hcengineering/core'
  import {
    CollaboratorDocument,
    Document,
    DocumentRequest,
    DocumentRequestKind,
    DocumentVersion,
    DocumentVersionState
  } from '@hcengineering/document'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource, translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { CollaborationDiffViewer } from '@hcengineering/text-editor'
  import view from '@hcengineering/view'
  import { themeStore } from '@hcengineering/ui'

  import {
    Button,
    Component,
    EditBox,
    eventToHTMLElement,
    IconCheck,
    IconClose,
    IconEdit,
    IconMoreH,
    IconShare,
    Label,
    SelectPopup,
    showPopup
  } from '@hcengineering/ui'
  import { ClassAttributeBar, ContextMenu, ParentsNavigator, UpDownNavigator } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import document from '../plugin'
  import DocumentEditor from './DocumentEditor.svelte'

  // import ControlPanel from './ControlPanel.svelte'
  // import CopyToClipboard from './CopyToClipboard.svelte'

  export let _id: Ref<Document>
  export let _class: Ref<Class<Document>>
  export let embedded = false

  let lastId: Ref<Doc> = _id

  const query = createQuery()

  const dispatch = createEventDispatcher()
  const client = getClient()

  let documentObject: WithLookup<Document> | undefined

  let name = ''

  let innerWidth: number

  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      notificationClient.then((client) => client.read(prev))
    }
  }

  const currentUser = getCurrentAccount() as EmployeeAccount

  onDestroy(async () => {
    notificationClient.then((client) => client.read(_id))
  })

  let requests: DocumentRequest[] = []

  $: myRequests = requests.filter((it) => it.assignee === currentUser.employee)

  $: approveRequest = myRequests.find((it) => it.kind === DocumentRequestKind.Approve)
  $: allApproveRequest = requests.find((it) => it.kind === DocumentRequestKind.Approve)
  // $: changesRequest = myRequests.find((it) => it.kind === DocumentRequestKind.Changes)
  // $: reviewRequest = myRequests.find((it) => it.kind === DocumentRequestKind.Review)

  $: _id &&
    _class &&
    query.query(
      _class,
      { _id },
      async (result) => {
        ;[documentObject] = result
        name = documentObject?.name ?? ''

        requests = (documentObject.$lookup?.requests as DocumentRequest[]) ?? []
      },
      {
        lookup: {
          _id: {
            requests: document.class.DocumentRequest
          }
        }
      }
    )

  $: canSave = name.trim().length > 0

  async function saveTitle (ev: Event) {
    ev.preventDefault()

    if (!documentObject || !canSave) {
      return
    }

    const nameTrimmed = name.trim()

    if (nameTrimmed.length > 0 && nameTrimmed !== documentObject.name) {
      await client.update(documentObject, { name: nameTrimmed })
    }
  }

  function showMenu (ev?: Event): void {
    if (documentObject) {
      showPopup(
        ContextMenu,
        { object: documentObject, excludedActions: [view.action.Open] },
        (ev as MouseEvent).target as HTMLElement
      )
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'reviewers'] })
  })

  const versionQuery = createQuery()
  let versions: DocumentVersion[] = []

  $: versionQuery.query(
    document.class.DocumentVersion,
    { attachedTo: _id },
    (res) => {
      versions = res
      if (autoSelect) {
        version = versions[versions.length - 1]
      }
    },
    { sort: { version: 1 } }
  )
  let version: DocumentVersion | undefined
  let compareTo: DocumentVersion | undefined

  let info: any

  let labels: Record<DocumentVersionState, string> = {
    [DocumentVersionState.Draft]: '',
    [DocumentVersionState.Approved]: '',
    [DocumentVersionState.Rejected]: ''
  }

  async function updateLabels (lang: string): Promise<void> {
    labels = {
      [DocumentVersionState.Draft]: await translate(document.string.Draft, {}, lang),
      [DocumentVersionState.Approved]: await translate(document.string.Approved, {}, lang),
      [DocumentVersionState.Rejected]: await translate(document.string.Rejected, {}, lang)
    }
  }
  updateLabels($themeStore.language)

  $: {
    const ifo: any = [
      ...versions.map((it) => ({
        id: it._id as string,
        text: `${it.version} - ${labels[it.state]} - ${new Date(it.modifiedOn).toDateString()} `
      }))
    ]
    info = ifo
  }
  function selectVersion (event: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: info,
        placeholder: document.string.Version,
        searchable: true
      },
      eventToHTMLElement(event),
      (res) => {
        if (res != null) {
          version = versions.find((it) => it._id === res)
        }
      }
    )
  }

  function selectCompareToVersion (event: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: [{ id: null, text: '-' }, ...info.slice(0, info.length - 1)],
        placeholder: document.string.Version,
        searchable: true
      },
      eventToHTMLElement(event),
      (res) => {
        if (res != null) {
          compareTo = versions.find((it) => it._id === res)
        } else if (res === null) {
          compareTo = undefined
        }
      }
    )
  }

  $: readonly = !documentObject?.authors.includes(currentUser.employee)

  let autoSelect = true

  async function doEdit (documentObject: Document): Promise<void> {
    processing = true
    // Looking for a draft version
    const draft = versions.find((it) => it.state === DocumentVersionState.Draft)
    const lastVersion = versions[versions.length - 1]
    if (draft === undefined) {
      // We need to create draft document.
      const newVersion = Math.round(documentObject.latest * 1000 + 100) / 1000

      const versionId: Ref<DocumentVersion> = generateId()
      const contentAttachmentId: Ref<CollaboratorDocument> = generateId()

      const ops = client
        .apply(documentObject._id)
        .match(document.class.Document, { _id: documentObject._id, latest: documentObject.latest })

      ops.update(documentObject, { latest: newVersion })

      ops.addCollection(
        document.class.DocumentVersion,
        documentObject.space,
        documentObject._id,
        documentObject._class,
        'versions',
        {
          content: lastVersion.content,
          description: '',
          impact: '',
          reason: '',
          state: DocumentVersionState.Draft,
          version: newVersion,
          attachments: 0,
          comments: 0,
          initialContentId: lastVersion.contentAttachmentId,
          contentAttachmentId
        },
        versionId
      )
      ops.addCollection(
        document.class.CollaboratorDocument,
        documentObject.space,
        versionId,
        document.class.DocumentVersion,
        'attachments',
        {
          file: contentAttachmentId,
          name: 'content',
          size: 0,
          type: 'application/ydoc',
          description: '',
          pinned: false,
          lastModified: Date.now()
        },
        contentAttachmentId
      )
      if (await ops.commit()) {
        // We should have a draft created by someone else.
        version = undefined
        autoSelect = true
      }
    }
    processing = false
  }

  let processing = false

  const updateRequests = async (kind: DocumentRequestKind): Promise<void> => {
    processing = true
    if (documentObject === undefined) {
      return
    }

    const requests = await client.findAll(document.class.DocumentRequest, {
      attachedTo: documentObject?._id,
      kind
    })
    for (const a of documentObject?.approvers ?? []) {
      const ex = requests.find((it) => it.assignee === a)
      if (ex === undefined) {
        await client.addCollection(
          document.class.DocumentRequest,
          documentObject.space,
          documentObject._id,
          documentObject._class,
          'requests',
          {
            assignee: a,
            kind
          }
        )
      }
    }

    if (version) {
      await client.update(version, {
        content: editor.getHTML()
      })
    }

    processing = false
  }
  let editor: DocumentEditor
  const updateState = async (state: DocumentVersionState): Promise<void> => {
    processing = true
    if (documentObject === undefined) {
      return
    }

    const draft = versions.find((it) => it.state === DocumentVersionState.Draft)
    if (draft !== undefined) {
      // We need to create draft document.
      const newVersion = documentObject.version + 1

      const ops = client
        .apply(documentObject._id)
        .match(document.class.Document, { _id: documentObject._id, latest: documentObject.latest })

      if (state === DocumentVersionState.Approved) {
        ops.update(documentObject, { latest: newVersion, version: newVersion })
        ops.update(draft, { version: newVersion, state })
      } else {
        ops.update(draft, { state })
      }
      // Remove all requests

      if (await ops.commit()) {
        const docs = await client.findAll(document.class.DocumentRequest, { attachedTo: documentObject._id })
        for (const d of docs) {
          client.remove(d)
        }
      }
    }

    processing = false
  }
  async function switchToDraft (): Promise<void> {
    const requests = await client.findAll(document.class.DocumentRequest, { attachedTo: documentObject?._id })
    for (const r of requests) {
      client.remove(r)
    }
  }
</script>

{#if documentObject !== undefined}
  <Panel
    object={documentObject}
    isHeader
    isAside={true}
    isSub={false}
    {embedded}
    bind:innerWidth
    floatAside={false}
    useMaxWidth={true}
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={documentObject} />
      <ParentsNavigator element={documentObject} />
    </svelte:fragment>
    <svelte:fragment slot="header">
      <span class="fs-title flex-row-center flex-shrink gap-1-5">
        <EditBox
          bind:value={name}
          placeholder={document.string.DocumentNamePlaceholder}
          kind="large-style"
          on:blur={(evt) => saveTitle(evt)}
        />

        <div class="p-1">-</div>
        <Button loading={processing} kind={'link-bordered'} on:click={selectVersion} disabled={info.length < 2}>
          <svelte:fragment slot="content">
            {#if version}
              {version.version} - {labels[version.state]}
            {:else}
              <Label label={document.string.Draft} />
            {/if}
          </svelte:fragment>
        </Button>

        <Button
          loading={processing}
          kind={'link-bordered'}
          on:click={selectCompareToVersion}
          disabled={info.length < 2}
        >
          <svelte:fragment slot="content">
            {#if compareTo}
              {compareTo.version} - {labels[compareTo.state]}
            {:else}
              <Label label={document.string.CompareTo} />
            {/if}
          </svelte:fragment>
        </Button>
      </span>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      {#if version && version?.state !== DocumentVersionState.Draft}
        <Button
          loading={processing}
          kind={'link-bordered'}
          label={document.string.CreateDraft}
          on:click={() => {
            if (documentObject) {
              doEdit(documentObject)
            }
          }}
          icon={IconEdit}
          size={'medium'}
        />
      {/if}

      {#if !readonly && version && version?.state === DocumentVersionState.Draft && version.version === documentObject.latest && !allApproveRequest}
        <Button
          loading={processing}
          kind={'link-bordered'}
          label={document.string.SendForApproval}
          on:click={() => updateRequests(DocumentRequestKind.Approve)}
          icon={IconShare}
          size={'medium'}
          disabled={documentObject?.approvers?.length === 0}
        />
        <!-- <Button
          loading={processing}
          kind={'link-bordered'}
          label={document.string.SendForReview}
          on:click={() => updateRequests(DocumentRequestKind.Review)}
          icon={IconShare}
          size={'medium'}
          disabled={documentObject?.reviewers?.length === 0}
        /> -->
      {/if}
      {#if version?.state === DocumentVersionState.Draft && approveRequest}
        <Button
          loading={processing}
          kind={'link-bordered'}
          label={document.string.Approve}
          on:click={() => updateState(DocumentVersionState.Approved)}
          icon={IconCheck}
          size={'medium'}
        />
        <Button
          loading={processing}
          kind={'link-bordered'}
          label={document.string.Reject}
          on:click={() => updateState(DocumentVersionState.Rejected)}
          icon={IconClose}
          size={'medium'}
        />
        {#if !readonly}
          <Button
            loading={processing}
            kind={'link-bordered'}
            label={document.string.Draft}
            on:click={() => switchToDraft()}
            icon={IconEdit}
            size={'medium'}
          />
        {/if}
      {/if}
      <Button icon={IconMoreH} kind={'ghost'} size={'medium'} on:click={showMenu} />
    </svelte:fragment>

    <div class="description-preview select-text mt-2 emphasized">
      {#if version && version.state === DocumentVersionState.Draft && approveRequest === undefined}
        {#key version?._id}
          <!-- suggestMode={mode === 'suggest'} -->
          <DocumentEditor
            object={version}
            initialContentId={version.initialContentId}
            comparedVersion={compareTo?.content ?? versions[versions.length - 2]?.content}
            readonly={false}
            bind:this={editor}
          />
        {/key}
      {:else if version}
        {#key [compareTo?.content, version.content]}
          <CollaborationDiffViewer content={version.content} comparedVersion={compareTo?.content} />
        {/key}
      {/if}
    </div>

    <div class="p-1 mt-6">
      <Attachments
        objectId={documentObject._id}
        space={documentObject.space}
        _class={documentObject._class}
        attachments={documentObject.attachments ?? 0}
      />
    </div>

    <svelte:fragment slot="custom-attributes">
      <ClassAttributeBar
        object={documentObject}
        _class={documentObject._class}
        to={core.class.Doc}
        ignoreKeys={['name', 'reviewers']}
        {readonly}
      />

      <div class="doc-divider" />
      <div class="popupPanel-body__aside-grid">
        <span class="label labelTop">
          <Label label={document.string.Labels} />
        </span>
        <div class="flex">
          <Component
            is={tags.component.TagsAttributeEditor}
            props={{ object: documentObject, label: document.string.AddLabel }}
          />
        </div>
        <div class="divider" />
        <span class="label">
          <Label label={document.string.LastRevision} />
        </span>
        <span>{documentObject?.latest}</span>
      </div>
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .description-preview {
    color: var(--content-color);
    line-height: 150%;
    // overflow: auto;
  }
  .doc-divider {
    flex-shrink: 0;
    margin: 0 0 0.5rem;
    height: 1px;
    background-color: var(--theme-divider-color);
  }
  .emphasized {
    padding: 1rem;
    background-color: var(--theme-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem;
    transition: border-color 0.1s var(--timing-main), box-shadow 0.1s var(--timing-main);

    &:focus-within {
      box-shadow: 0 0 0 3px var(--accented-button-outline);
    }
  }
</style>
