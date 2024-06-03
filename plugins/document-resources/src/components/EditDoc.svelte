<!--
//
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
//
-->
<script lang="ts">
  import attachment, { Attachment } from '@hcengineering/attachment'
  import core, { Doc, Ref, WithLookup, generateId, type Blob } from '@hcengineering/core'
  import { Document } from '@hcengineering/document'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { copyTextToClipboard, createQuery, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { Heading, TableOfContents } from '@hcengineering/text-editor'
  import {
    Button,
    ButtonItem,
    Component,
    FocusHandler,
    IconMoreH,
    IconWithEmoji,
    Label,
    TimeSince,
    createFocusManager,
    getPlatformColorDef,
    navigate,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import {
    ClassAttributeBar,
    IconPicker,
    ParentsNavigator,
    getObjectLinkFragment,
    restrictionStore,
    showMenu
  } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { starDocument, unstarDocument } from '..'
  import document from '../plugin'
  import { getDocumentUrl } from '../utils'
  import DocumentEditor from './DocumentEditor.svelte'
  import DocumentPresenter from './DocumentPresenter.svelte'
  import DocumentTitle from './DocumentTitle.svelte'
  import References from './sidebar/References.svelte'
  import History from './sidebar/History.svelte'

  export let _id: Ref<Document>
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let kind: 'default' | 'modern' = 'default'

  $: readonly = $restrictionStore.readonly

  export function canClose (): boolean {
    return false
  }

  let lastId: Ref<Doc> = _id
  const query = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let doc: WithLookup<Document> | undefined
  let name = ''
  let innerWidth: number

  let headings: Heading[] = []

  const notificationClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      void notificationClient.then((client) => client.readDoc(getClient(), prev))
    }
  }

  onDestroy(async () => {
    void notificationClient.then((client) => client.readDoc(getClient(), _id))
  })

  const starredQuery = createQuery()
  let isStarred = false
  $: starredQuery.query(document.class.SavedDocument, { attachedTo: _id }, (res) => {
    isStarred = res.length !== 0
  })

  async function createEmbedding (file: File): Promise<{ file: Ref<Blob>, type: string } | undefined> {
    if (doc === undefined) {
      return undefined
    }

    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const uuid = await uploadFile(file)
      const attachmentId: Ref<Attachment> = generateId()

      await client.addCollection(
        document.class.DocumentEmbedding,
        doc.space,
        doc._id,
        document.class.Document,
        'embeddings',
        {
          file: uuid,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        },
        attachmentId
      )

      return { file: uuid, type: file.type }
    } catch (err: any) {
      await setPlatformStatus(unknownError(err))
    }
  }

  $: _id !== undefined &&
    query.query(document.class.Document, { _id }, async (result) => {
      ;[doc] = result
      name = doc?.name ?? ''
    })

  $: canSave = name.trim().length > 0

  async function saveTitle (ev: Event): Promise<void> {
    ev.preventDefault()

    if (doc === undefined || !canSave) {
      return
    }

    const nameTrimmed = name.trim()

    if (nameTrimmed.length > 0 && nameTrimmed !== doc.name) {
      await client.update(doc, { name: nameTrimmed })
    }
  }

  async function chooseIcon (): Promise<void> {
    if (doc !== undefined) {
      const { icon, color } = doc
      const icons = [document.icon.Document, document.icon.Teamspace]
      const update = async (result: any): Promise<void> => {
        if (result !== undefined && result !== null && doc !== undefined) {
          await client.update(doc, { icon: result.icon, color: result.color })
        }
      }
      showPopup(IconPicker, { icon, color, icons }, 'top', update, update)
    }
  }

  function showContextMenu (ev: MouseEvent): void {
    if (doc !== undefined) {
      showMenu(ev, { object: doc, excludedActions: [view.action.Open] })
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name'] })
  })

  const aside: ButtonItem[] = [
    {
      id: 'references',
      icon: document.icon.References
    },
    {
      id: 'history',
      icon: document.icon.History
    }
  ]
  let selectedAside: string | boolean = false

  $: starAction = isStarred
    ? {
        icon: document.icon.Starred,
        label: document.string.Unstar,
        action: () => doc !== undefined && unstarDocument(doc)
      }
    : {
        icon: document.icon.Star,
        label: document.string.Star,
        action: () => doc !== undefined && starDocument(doc)
      }

  $: actions = [
    {
      icon: view.icon.CopyId,
      label: document.string.CopyDocumentUrl,
      action: () => {
        if (doc !== undefined) {
          void copyTextToClipboard(getDocumentUrl(doc))
        }
      }
    },
    starAction
  ]

  let editor: DocumentEditor
  let content: HTMLElement

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

{#if doc !== undefined}
  <Panel
    object={doc}
    withoutActivity
    allowClose={!embedded}
    isAside={true}
    customAside={aside}
    bind:selectedAside
    isHeader={false}
    isCustomAttr={false}
    isSub={false}
    useMaxWidth={false}
    printHeader={false}
    {embedded}
    {kind}
    bind:content
    bind:innerWidth
    floatAside={false}
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="title">
      <ParentsNavigator element={doc} />
      <DocumentPresenter value={doc} breadcrumb noUnderline />
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if !$restrictionStore.disableActions}
        <Button
          id="btn-doc-title-open-more"
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          on:click={showContextMenu}
        />
        {#each actions as action}
          <Button
            icon={action.icon}
            iconProps={{ size: 'medium' }}
            kind={'ghost'}
            showTooltip={{ label: action.label, direction: 'bottom' }}
            on:click={action.action}
          />
        {/each}
      {/if}
    </svelte:fragment>

    <div class="container">
      <div class="title flex-row-center">
        <div class="icon">
          <Button
            size={'x-large'}
            kind={'ghost'}
            noFocus
            icon={doc.icon === view.ids.IconWithEmoji ? IconWithEmoji : doc.icon ?? document.icon.Document}
            iconProps={doc.icon === view.ids.IconWithEmoji
              ? { icon: doc.color, size: 'large' }
              : {
                  size: 'large',
                  fill: doc.color !== undefined ? getPlatformColorDef(doc.color, $themeStore.dark).icon : 'currentColor'
                }}
            disabled={readonly}
            on:click={chooseIcon}
          />
        </div>

        <DocumentTitle
          focusIndex={1}
          fill
          bind:value={name}
          {readonly}
          placeholder={document.string.DocumentNamePlaceholder}
          on:blur={(evt) => saveTitle(evt)}
          on:keydown={(evt) => {
            if (evt.key === 'Enter' || evt.key === 'ArrowDown') {
              editor.focus('start')
            }
          }}
        />
      </div>

      <div class="content select-text mt-4">
        <div class="toc-container">
          <div class="toc">
            <TableOfContents
              items={headings}
              on:select={(evt) => {
                const heading = evt.detail
                const element = window.document.getElementById(heading.id)
                element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          </div>
        </div>

        {#key doc._id}
          <DocumentEditor
            focusIndex={30}
            object={doc}
            {readonly}
            boundary={content}
            overflow={'none'}
            editorAttributes={{ style: 'padding: 0 2em 30vh; margin: 0 -2em;' }}
            attachFile={async (file) => {
              return await createEmbedding(file)
            }}
            on:headings={(evt) => {
              headings = evt.detail
            }}
            on:open-document={async (event) => {
              const doc = await client.findOne(event.detail._class, { _id: event.detail._id })
              if (doc != null) {
                const location = await getObjectLinkFragment(client.getHierarchy(), doc, {}, view.component.EditDoc)
                navigate(location)
              }
            }}
            bind:this={editor}
          />
        {/key}
      </div>
    </div>

    <svelte:fragment slot="aside">
      {#if selectedAside === 'references'}
        <References doc={doc._id} />
      {:else if selectedAside === 'history'}
        <History value={doc} {readonly} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes">
      <!-- TODO show other properties -->
      <ClassAttributeBar object={doc} _class={doc._class} to={core.class.Doc} ignoreKeys={['name']} {readonly} />

      <div class="doc-divider" />

      <div class="popupPanel-body__aside-grid">
        <span class="labelOnPanel">
          <Label label={core.string.Modified} />
        </span>
        <span class="time ml-1"><TimeSince value={doc?.modifiedOn} /></span>

        <div class="divider" />

        <span class="labelOnPanel">
          <Label label={document.string.Labels} />
        </span>
        <div class="flex">
          <Component
            is={tags.component.TagsAttributeEditor}
            props={{ object: doc, label: document.string.AddLabel, readonly }}
          />
        </div>
        <div class="divider" />
      </div>
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: auto;
  }

  .toc-container {
    position: absolute;
    pointer-events: none;
    inset: 0;
    z-index: 1;
  }

  .toc {
    width: 1rem;
    pointer-events: all;
    margin-left: -3rem;
    position: sticky;
    top: 0;
  }

  .content {
    position: relative;
    color: var(--content-color);
    line-height: 150%;
  }
  .title {
    font-size: 2.25rem;
    margin-top: 1.75rem;
    margin-bottom: 1rem;

    .icon {
      margin-left: -3rem;
      width: 3rem;
    }
  }
  .doc-divider {
    flex-shrink: 0;
    margin: 0 0 0.5rem;
    height: 1px;
    background-color: var(--theme-divider-color);
  }
</style>
