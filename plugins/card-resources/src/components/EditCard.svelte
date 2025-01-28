<!--
//
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Analytics } from '@hcengineering/analytics'
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { Doc, Mixin, Ref, WithLookup, generateId, type Blob } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Heading } from '@hcengineering/text-editor'
  import { TableOfContents } from '@hcengineering/text-editor-resources'
  import { Button, EditBox, FocusHandler, IconMixin, IconMoreH, createFocusManager, navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import {
    DocAttributeBar,
    ParentsNavigator,
    RelationsEditor,
    getDocMixins,
    getObjectLinkFragment,
    showMenu
  } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { Card, CardEvents } from '@hcengineering/card'
  import card from '../plugin'
  import CardPresenter from './CardPresenter.svelte'
  import ContentEditor from './ContentEditor.svelte'
  import TagsEditor from './TagsEditor.svelte'
  import CardAttributeEditor from './CardAttributeEditor.svelte'

  export let _id: Ref<Card>
  export let readonly: boolean = false
  export let embedded: boolean = false

  let useMaxWidth = getUseMaxWidth()
  $: saveUseMaxWidth(useMaxWidth)

  export function canClose (): boolean {
    return false
  }

  let lastId: Ref<Doc> = _id
  const query = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let doc: WithLookup<Card> | undefined
  let title = ''
  let innerWidth: number

  let headings: Heading[] = []

  let loadedDocumentContent = false

  const notificationClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>): void {
    if (lastId !== _id) {
      loadedDocumentContent = false
      const prev = lastId
      lastId = _id
      void notificationClient.then((client) => client.readDoc(prev))
    }
  }

  onDestroy(async () => {
    void notificationClient.then((client) => client.readDoc(_id))
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
        attachment.class.Embedding,
        doc.space,
        doc._id,
        doc._class,
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
    query.query(card.class.Card, { _id }, async (result) => {
      ;[doc] = result
      title = doc?.title ?? ''
    })

  $: canSave = title.trim().length > 0

  async function saveTitle (ev: Event): Promise<void> {
    ev.preventDefault()

    if (doc === undefined || !canSave) {
      return
    }

    const nameTrimmed = title.trim()

    if (nameTrimmed.length > 0 && nameTrimmed !== doc.title) {
      await client.update(doc, { title: nameTrimmed })
    }
  }

  function getUseMaxWidth (): boolean {
    const useMaxWidth = localStorage.getItem('document.useMaxWidth')
    return useMaxWidth === 'true'
  }

  function saveUseMaxWidth (useMaxWidth: boolean): void {
    localStorage.setItem('document.useMaxWidth', useMaxWidth.toString())
  }

  let sideContentSpace = 0

  function updateSizeContentSpace (width: number): void {
    sideContentSpace = width
  }

  onMount(() => {
    Analytics.handleEvent(CardEvents.CardOpened, { id: _id })
  })

  let editor: ContentEditor
  let content: HTMLElement

  const manager = createFocusManager()

  let mixins: Array<Mixin<Doc>> = []

  $: mixins = doc !== undefined ? getDocMixins(doc) : []
</script>

<FocusHandler {manager} />

{#if doc !== undefined}
  <Panel
    withoutActivity={!loadedDocumentContent}
    object={doc}
    allowClose={!embedded}
    isAside={false}
    isHeader={false}
    isSub={false}
    bind:useMaxWidth
    {sideContentSpace}
    printHeader={false}
    {embedded}
    adaptive={'default'}
    bind:content
    bind:innerWidth
    floatAside={false}
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="title">
      <ParentsNavigator element={doc} />
      <CardPresenter value={doc} noUnderline />
    </svelte:fragment>

    <div class="container">
      <div class="title flex-row-center">
        <EditBox
          focusIndex={1}
          bind:value={title}
          placeholder={card.string.Card}
          on:blur={(evt) => saveTitle(evt)}
          on:keydown={(evt) => {
            if (evt.key === 'Enter' || evt.key === 'ArrowDown') {
              editor.focus('start')
            }
          }}
        />
      </div>

      <TagsEditor {doc} />

      <CardAttributeEditor value={doc} {mixins} {readonly} ignoreKeys={['title', 'content', 'parent']} />

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
          <ContentEditor
            focusIndex={30}
            object={doc}
            {readonly}
            boundary={content}
            overflow={'none'}
            editorAttributes={{ style: 'padding: 0 2em 2em; margin: 0 -2em; min-height: 30vh' }}
            requestSideSpace={updateSizeContentSpace}
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
            on:loaded={() => {
              loadedDocumentContent = true
            }}
            bind:this={editor}
          />
        {/key}
      </div>
    </div>

    <RelationsEditor object={doc} {readonly} />

    <svelte:fragment slot="utils">
      {#if !readonly}
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          dataId={'btnMoreActions'}
          on:click={(e) => {
            showMenu(e, { object: doc, excludedActions: [view.action.Open] })
          }}
        />
      {/if}
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
  }
</style>
