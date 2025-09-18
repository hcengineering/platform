<!--
// Copyright © 2023-2024 Hardcore Engineering Inc.
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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import documents, { DocumentState } from '@hcengineering/controlled-documents'
  import { type Blob, type Ref, generateId } from '@hcengineering/core'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Editor, Heading } from '@hcengineering/text-editor'
  import {
    CollaboratorEditor,
    NodeHighlightType,
    TableOfContents,
    TableOfContentsContent,
    getNodeElement,
    highlightUpdateCommand,
    selectNode
  } from '@hcengineering/text-editor-resources'
  import { EditBox, Label, Scroller } from '@hcengineering/ui'
  import { getCollaborationUser } from '@hcengineering/view-resources'
  import { merge } from 'effector'
  import { createEventDispatcher, onDestroy, tick } from 'svelte'
  import plugin from '../../plugin'

  import {
    $areDocumentCommentPopupsOpened as arePopupsOpened,
    $canAddDocumentComments as canAddDocumentComments,
    $canViewDocumentComments as canViewDocumentComments,
    $controlledDocument as controlledDocument,
    $documentCommentHighlightedLocation as documentCommentHighlightedLocation,
    $documentComments as documentComments,
    documentCommentsDisplayRequested,
    documentCommentsLocationNavigateRequested,
    documentCommentsAddCanceled,
    $isEditable as isEditable
  } from '../../stores/editors/document'
  import DocumentPrintTitlePage from '../print/DocumentPrintTitlePage.svelte'
  import DocumentTitle from './DocumentTitle.svelte'

  export let boundary: HTMLElement | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const user = getCollaborationUser()
  const dispatch = createEventDispatcher()

  let headings: Heading[] = []
  let textEditor: CollaboratorEditor
  let selectedNodeId: string | null | undefined = undefined
  let editor: Editor
  let title = $controlledDocument?.title ?? ''

  $: isTemplate =
    $controlledDocument != null && hierarchy.hasMixin($controlledDocument, documents.mixin.DocumentTemplate)

  $: commentUuids = $documentComments.map((p) => p.nodeId).filter((id) => id != null)

  function handleRefreshHighlight (): void {
    textEditor?.commands()?.command(highlightUpdateCommand())
  }

  const unsubscribeHighlightRefresh = merge([documentCommentHighlightedLocation, documentComments.updates]).subscribe({
    next: () => {
      handleRefreshHighlight()
    }
  })

  const unsubscribeNavigateToLocation = documentCommentsLocationNavigateRequested.subscribe({
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    next: async ({ nodeId }) => {
      if (nodeId == null) {
        handleRefreshHighlight()
        return
      }

      selectedNodeId = nodeId

      if (editor !== undefined) {
        await tick()

        const element = getNodeElement(editor, nodeId)
        element?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  })

  const unsubscribeCommentsAddCanceled = documentCommentsAddCanceled.subscribe({
    next: ({ nodeId }) => {
      if (editor !== undefined && nodeId != null) {
        if (selectNode(editor, nodeId)) {
          editor.commands.unsetQMSInlineCommentMark()
        }
      }
    }
  })

  onDestroy(() => {
    unsubscribeHighlightRefresh()
    unsubscribeNavigateToLocation()
    unsubscribeCommentsAddCanceled()
  })

  const handleUpdateTitle = async () => {
    if (!$controlledDocument || !title) {
      return
    }
    const titleTrimmed = title.trim()

    if (titleTrimmed.length > 0 && titleTrimmed !== $controlledDocument.title) {
      await client.update($controlledDocument, { title: titleTrimmed })
    }
  }

  async function handleShowHeading (heading: Heading): Promise<void> {
    const element = window.document.getElementById(heading.id)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleNodeHighlight (id: string) {
    if ($documentCommentHighlightedLocation) {
      const { nodeId } = $documentCommentHighlightedLocation
      if (nodeId === id) {
        return { type: NodeHighlightType.WARNING, isActive: true }
      }
    }

    if ($documentComments.some((c) => c.nodeId === id)) {
      return { type: NodeHighlightType.WARNING }
    }

    return null
  }

  function handleShowDocumentComments (nodeId: string): void {
    const element = getNodeElement(editor, nodeId)
    documentCommentsDisplayRequested({ element, nodeId })
  }

  async function createEmbedding (file: File): Promise<{ file: Ref<Blob>, type: string } | undefined> {
    if ($controlledDocument === undefined || $controlledDocument === null) {
      return undefined
    }

    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const uuid = await uploadFile(file)
      const attachmentId: Ref<Attachment> = generateId()

      await client.addCollection(
        attachment.class.Attachment,
        $controlledDocument.space,
        $controlledDocument._id,
        $controlledDocument._class,
        'attachments',
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
    } finally {
      dispatch('change')
    }
  }

  $: attribute = {
    key: 'content',
    attr: client.getHierarchy().getAttribute(documents.class.ControlledDocument, 'content')
  }
</script>

{#if $controlledDocument && attribute}
  <DocumentPrintTitlePage />

  {#if headings.length > 0}
    <div class="tocContent only-print">
      <TableOfContentsContent items={headings} enumerated={true} />
    </div>
    <div class="pagebreak" />
  {/if}

  <div class="root relative">
    <div class="toc">
      <TableOfContents items={headings} enumerated={true} on:select={(ev) => handleShowHeading(ev.detail)} />
    </div>
    <Scroller>
      <div class="content relative">
        <DocumentTitle>
          {#if $isEditable}
            <EditBox
              value={title}
              on:value={(event) => {
                title = event.detail
              }}
              on:blur={handleUpdateTitle}
            />
          {:else}
            {$controlledDocument.title}
          {/if}
        </DocumentTitle>
        {#if $controlledDocument.state === DocumentState.Obsolete}
          <div class="watermark-container">
            {#each { length: 24 } as _, i}
              <div class="watermark"><Label label={plugin.string.Obsolete} /></div>
            {/each}
          </div>
        {/if}
        <CollaboratorEditor
          bind:this={textEditor}
          object={$controlledDocument}
          {attribute}
          {user}
          {boundary}
          readonly={!$isEditable}
          editorAttributes={{ style: 'padding: 0 2em; margin: 0 -2em;' }}
          overflow="none"
          kitOptions={{
            inlineNote: {
              readonly: !isTemplate
            },
            qms: {
              qmsInlineComment: {
                isHighlightModeOn: () => $canViewDocumentComments || $canAddDocumentComments,
                getNodeHighlight: handleNodeHighlight,
                onNodeClicked: (uuids) => {
                  // filter out those uuids that are not in comments
                  uuids = Array.isArray(uuids) ? uuids : [uuids]
                  uuids = uuids.filter((id) => commentUuids.includes(id)).sort()

                  // scroll through the comments as user clicks on the same node
                  const currIndex = selectedNodeId != null ? uuids.indexOf(selectedNodeId) : -1
                  const nextIndex = currIndex === -1 ? 0 : (currIndex + 1) % uuids.length
                  selectedNodeId = uuids[nextIndex]

                  if (!$arePopupsOpened && $canViewDocumentComments && selectedNodeId != null) {
                    handleShowDocumentComments(selectedNodeId)
                  }
                }
              }
            },
            toc: {
              onChange: (h) => {
                headings = h
                dispatch('headings', h)
              }
            },
            collaboration: {
              inlineComments: false
            }
          }}
          on:editor={(e) => (editor = e.detail)}
          attachFile={async (file) => {
            return await createEmbedding(file)
          }}
        />
        <div class="bottomSpacing no-print" />
      </div>
    </Scroller>
  </div>
{/if}

<style lang="scss">
  .root {
    overflow: hidden;

    @media print {
      margin-left: -1rem;
      overflow: visible;
    }

    // Workaround to quickly enumerate headings for controlled docs
    :global(h1) {
      counter-increment: h1;
      counter-reset: h2;

      &::before {
        content: counter(h1) '. ';
      }
    }

    :global(h2) {
      counter-increment: h2;
      counter-reset: h3;

      &::before {
        content: counter(h1) '.' counter(h2) '. ';
      }
    }

    :global(h3) {
      counter-increment: h3;

      &::before {
        content: counter(h1) '.' counter(h2) '.' counter(h3) '. ';
      }
    }
  }

  .toc {
    position: absolute;
    width: 1rem;
    pointer-events: all;
    left: 1px;
    top: 1rem;
    z-index: 1;
  }

  .tocContent {
    padding-left: 2.25rem;
  }

  .content {
    padding: 0 3.25rem;
  }

  .bottomSpacing {
    padding-bottom: 55vh;
  }

  .watermark-container {
    position: absolute;
    z-index: 100;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 35rem;
    padding-top: 20rem;
    overflow: hidden;
    pointer-events: none;

    @media print {
      display: none;
    }
  }

  .watermark {
    z-index: 100;
    margin: auto;
    height: 4rem;
    width: 100%;
    color: var(--theme-divider-color);
    font-size: 8rem;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
