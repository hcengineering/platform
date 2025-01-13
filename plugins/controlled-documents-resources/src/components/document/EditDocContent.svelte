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
  import { createEventDispatcher, onDestroy, tick } from 'svelte'
  import { merge } from 'effector'
  import { type Ref, type Blob, generateId } from '@hcengineering/core'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import attachment, { Attachment } from '@hcengineering/attachment'
  import documents from '@hcengineering/controlled-documents'
  import { Editor, Heading } from '@hcengineering/text-editor'
  import {
    CollaboratorEditor,
    TableOfContents,
    TableOfContentsContent,
    FocusExtension,
    HeadingsExtension,
    IsEmptyContentExtension,
    NodeHighlightExtension,
    NodeHighlightType,
    highlightUpdateCommand,
    getNodeElement
  } from '@hcengineering/text-editor-resources'
  import { navigate, EditBox, Scroller } from '@hcengineering/ui'
  import { getCollaborationUser, getObjectLinkFragment } from '@hcengineering/view-resources'

  import {
    $areDocumentCommentPopupsOpened as areDocumentCommentPopupsOpened,
    $controlledDocument as controlledDocument,
    $isEditable as isEditable,
    $documentCommentHighlightedLocation as documentCommentHighlightedLocation,
    $areDocumentCommentPopupsOpened as arePopupsOpened,
    $canAddDocumentComments as canAddDocumentComments,
    $canViewDocumentComments as canViewDocumentComments,
    $documentComments as documentComments,
    documentCommentsDisplayRequested,
    documentCommentsHighlightUpdated,
    documentCommentsLocationNavigateRequested
  } from '../../stores/editors/document'
  import DocumentTitle from './DocumentTitle.svelte'
  import DocumentPrintTitlePage from '../print/DocumentPrintTitlePage.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const user = getCollaborationUser()
  const dispatch = createEventDispatcher()

  let headings: Heading[] = []
  let textEditor: CollaboratorEditor
  let selectedNodeId: string | null | undefined = undefined
  let isFocused = false
  let isEmpty = true
  let editor: Editor
  let title = $controlledDocument?.title ?? ''

  $: isTemplate =
    $controlledDocument != null && hierarchy.hasMixin($controlledDocument, documents.mixin.DocumentTemplate)

  function handleRefreshHighlight () {
    if (!textEditor) {
      return
    }

    textEditor.commands()?.command(highlightUpdateCommand())
  }

  const unsubscribeHighlightRefresh = merge([documentCommentHighlightedLocation, documentComments.updates]).subscribe({
    next: () => {
      handleRefreshHighlight()
    }
  })

  const unsubscribeNavigateToLocation = documentCommentsLocationNavigateRequested.subscribe({
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    next: async ({ nodeId }) => {
      if (!nodeId) {
        handleRefreshHighlight()
        return
      }

      if (!textEditor) {
        return
      }

      await tick()

      const element = getNodeElement(editor, nodeId)

      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  })

  onDestroy(() => {
    unsubscribeHighlightRefresh()
    unsubscribeNavigateToLocation()
  })

  const handleUpdateTitle = () => {
    if (!$controlledDocument || !title) {
      return
    }
    const titleTrimmed = title.trim()

    if (titleTrimmed.length > 0 && titleTrimmed !== $controlledDocument.title) {
      client.update($controlledDocument, { title: titleTrimmed })
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

  function handleShowDocumentComments (uuid: string) {
    if (!uuid) {
      return
    }

    documentCommentsDisplayRequested({
      element: getNodeElement(editor, uuid),
      nodeId: uuid
    })
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

  function handleExtensions () {
    return [
      FocusExtension.configure({
        onFocus (focused) {
          isFocused = focused
        }
      }),
      IsEmptyContentExtension.configure({
        onChange (empty) {
          isEmpty = empty
        }
      }),
      HeadingsExtension.configure({
        onChange: (h) => {
          headings = h
        }
      }),
      NodeHighlightExtension.configure({
        isHighlightModeOn: () => $canViewDocumentComments || $canAddDocumentComments,
        getNodeHighlight: handleNodeHighlight,
        onNodeSelected: (uuid: string | null) => {
          if (selectedNodeId !== uuid) {
            selectedNodeId = uuid
          }
          if (isFocused) {
            documentCommentsHighlightUpdated(selectedNodeId !== null ? { nodeId: selectedNodeId } : null)
          }
        },
        onNodeClicked: (uuid: string) => {
          if (selectedNodeId !== uuid) {
            selectedNodeId = uuid
          }

          if (!$arePopupsOpened && $canViewDocumentComments && selectedNodeId) {
            handleShowDocumentComments(selectedNodeId)
          }
        }
      })
    ]
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
      <div class="content">
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
        <CollaboratorEditor
          bind:this={textEditor}
          object={$controlledDocument}
          {attribute}
          {user}
          readonly={!$isEditable}
          editorAttributes={{ style: 'padding: 0 2em; margin: 0 -2em;' }}
          overflow="none"
          canShowPopups={!$areDocumentCommentPopupsOpened}
          enableInlineComments={false}
          onExtensions={handleExtensions}
          kitOptions={{
            note: {
              readonly: !isTemplate
            }
          }}
          on:editor={(e) => (editor = e.detail)}
          on:open-document={async (event) => {
            const doc = await client.findOne(event.detail._class, { _id: event.detail._id })
            if (doc != null) {
              const location = await getObjectLinkFragment(client.getHierarchy(), doc, {}, view.component.EditDoc)
              navigate(location)
            }
          }}
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
    padding-left: 3.25rem;
  }

  .bottomSpacing {
    padding-bottom: 30vh;
  }
</style>
