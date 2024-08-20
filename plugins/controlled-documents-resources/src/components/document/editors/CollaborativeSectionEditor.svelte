<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { merge } from 'effector'
  import { createEventDispatcher, onDestroy, tick } from 'svelte'
  import { CollaborativeDocumentSection } from '@hcengineering/controlled-documents'
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { navigate } from '@hcengineering/ui'
  import { CollaborativeDoc, Ref, generateId, Blob } from '@hcengineering/core'
  import view from '@hcengineering/view'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Editor, Heading } from '@hcengineering/text-editor'
  import {
    CollaboratorEditor,
    FocusExtension,
    HeadingsExtension,
    IsEmptyContentExtension,
    NodeHighlightExtension,
    NodeHighlightType,
    highlightUpdateCommand,
    getNodeElement
  } from '@hcengineering/text-editor-resources'
  import { getCollaborationUser, getObjectLinkFragment } from '@hcengineering/view-resources'

  import {
    $documentCommentHighlightedLocation as highlighted,
    $areDocumentCommentPopupsOpened as arePopupsOpened,
    $canAddDocumentComments as canAddDocumentComments,
    $canViewDocumentComments as canViewDocumentComments,
    $controlledDocument as controlledDocument,
    $controlledDocumentTemplate as controlledDocumentTemplate,
    $groupedDocumentComments as groupedDocumentComments,
    $isEditable as isEditable,
    documentCommentsDisplayRequested,
    documentCommentsHighlightUpdated,
    documentCommentsLocationNavigateRequested
  } from '../../../stores/editors/document'

  export let value: CollaborativeDocumentSection
  export let onHeadings: (headings: Heading[]) => void

  const client = getClient()

  const user = getCollaborationUser()

  let selectedNodeId: string | null | undefined = undefined
  let textEditor: CollaboratorEditor
  let isFocused = false
  let isEmpty = true
  let editor: Editor

  const handleRefreshHighlight = () => {
    if (!textEditor) {
      return
    }

    textEditor.commands()?.command(highlightUpdateCommand())
  }

  const unsubscribeHighlightRefresh = merge([highlighted, groupedDocumentComments.updates]).subscribe({
    next: () => {
      handleRefreshHighlight()
    }
  })

  const unsubscribeNavigateToLocation = documentCommentsLocationNavigateRequested.subscribe({
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    next: async ({ nodeId, sectionKey }) => {
      if (sectionKey !== value.key || !nodeId) {
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

  const handleNodeHighlight = (id: string) => {
    if ($highlighted) {
      const { sectionKey, nodeId } = $highlighted
      if (nodeId === id && sectionKey === value.key) {
        return { type: NodeHighlightType.WARNING, isActive: true }
      }
    }

    if ($groupedDocumentComments.hasDocumentComments(value.key, id)) {
      return { type: NodeHighlightType.WARNING }
    }

    return null
  }

  const handleShowDocumentComments = (uuid: string) => {
    if (!uuid) {
      return
    }

    if (!$groupedDocumentComments.hasDocumentComments(value.key, uuid)) {
      return
    }

    documentCommentsDisplayRequested({
      element: getNodeElement(editor, uuid),
      nodeId: uuid,
      sectionKey: value.key
    })
  }

  const handleExtensions = () => [
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
      prefixId: `section-${value._id}`,
      onChange: onHeadings
    }),
    NodeHighlightExtension.configure({
      isHighlightModeOn: () => $canViewDocumentComments || $canAddDocumentComments,
      getNodeHighlight: handleNodeHighlight,
      onNodeSelected: (uuid: string | null) => {
        if (selectedNodeId !== uuid) {
          selectedNodeId = uuid
        }
        if (isFocused) {
          documentCommentsHighlightUpdated(
            selectedNodeId && $groupedDocumentComments.hasDocumentComments(value.key, uuid)
              ? { sectionKey: value.key, nodeId: selectedNodeId }
              : null
          )
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

  const dispatch = createEventDispatcher()
  async function createEmbedding (
    file: File,
    section: CollaborativeDocumentSection
  ): Promise<{ file: Ref<Blob>, type: string } | undefined> {
    if ($controlledDocument === undefined || $controlledDocument === null) {
      return undefined
    }

    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const uuid = await uploadFile(file)
      const attachmentId: Ref<Attachment> = generateId()

      await client.addCollection(
        attachment.class.Attachment,
        section.space,
        section._id,
        section._class,
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

  onDestroy(() => {
    unsubscribeHighlightRefresh()
    unsubscribeNavigateToLocation()
  })

  let collaborativeDoc: CollaborativeDoc | undefined
  $: if ($controlledDocument !== null) {
    collaborativeDoc = $controlledDocument.content
  }

  let initialCollaborativeDoc: CollaborativeDoc | undefined
  $: if ($controlledDocumentTemplate !== null) {
    initialCollaborativeDoc = $controlledDocumentTemplate.content
  }
</script>

{#if collaborativeDoc}
  {#key value._id}
    <CollaboratorEditor
      bind:this={textEditor}
      objectId={value._id}
      objectClass={value._class}
      objectSpace={value.space}
      {collaborativeDoc}
      {initialCollaborativeDoc}
      {user}
      readonly={!$isEditable}
      field={value.collaboratorSectionId}
      editorAttributes={{ style: 'padding: 0 2em; margin: 0 -2em;' }}
      overflow="none"
      canShowPopups={!$arePopupsOpened}
      onExtensions={handleExtensions}
      on:editor={(e) => (editor = e.detail)}
      on:open-document={async (event) => {
        const doc = await client.findOne(event.detail._class, { _id: event.detail._id })
        if (doc != null) {
          const location = await getObjectLinkFragment(client.getHierarchy(), doc, {}, view.component.EditDoc)
          navigate(location)
        }
      }}
      attachFile={async (file) => {
        return await createEmbedding(file, value)
      }}
    />
  {/key}
{/if}
