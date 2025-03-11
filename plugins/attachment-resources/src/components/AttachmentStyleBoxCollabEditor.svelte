<!--
// Copyright © 2023 2025 Hardcore Engineering Inc.
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
  import attachment, { Attachment, AttachmentsEvents } from '@hcengineering/attachment'
  import contact from '@hcengineering/contact'
  import core, { BlobMetadata, Doc, PersonId, Ref, generateId, type Blob } from '@hcengineering/core'
  import { IntlString, getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import {
    FileOrBlob,
    KeyedAttribute,
    createQuery,
    getClient,
    getFileMetadata,
    uploadFile
  } from '@hcengineering/presentation'
  import textEditor, { type RefAction, type TextEditorHandler } from '@hcengineering/text-editor'
  import {
    AttachIcon,
    CollaborativeAttributeBox,
    TableIcon,
    addTableHandler,
    defaultRefActions,
    getModelRefActions
  } from '@hcengineering/text-editor-resources'
  import { AnySvelteComponent, getEventPositionElement, getPopupPositionElement, navigate } from '@hcengineering/ui'
  import { type FileUploadCallbackParams, uploadFiles } from '@hcengineering/uploader'
  import view from '@hcengineering/view'
  import { getCollaborationUser, getObjectId, getObjectLinkFragment } from '@hcengineering/view-resources'
  import { Analytics } from '@hcengineering/analytics'

  import AttachmentsGrid from './AttachmentsGrid.svelte'

  export let object: Doc
  export let identifier: string | undefined = undefined
  export let key: KeyedAttribute
  export let placeholder: IntlString
  export let focusIndex = -1
  export let boundary: HTMLElement | undefined = undefined
  export let refContainer: HTMLElement | undefined = undefined

  export let enableAttachments: boolean = true
  export let useAttachmentPreview: boolean = false
  export let readonly: boolean = false

  const client = getClient()

  const user = getCollaborationUser()
  let userComponent: AnySvelteComponent | undefined
  void getResource(contact.component.CollaborationUserAvatar).then((component) => {
    userComponent = component
  })

  let editor: CollaborativeAttributeBox

  let refActions: RefAction[] = []
  let extraActions: RefAction[] = []
  let modelRefActions: RefAction[] = []

  $: if (enableAttachments && !readonly) {
    extraActions = [
      {
        label: textEditor.string.Attach,
        icon: AttachIcon,
        action: handleAttach,
        order: 1001
      },
      {
        label: textEditor.string.Table,
        icon: TableIcon,
        action: handleTable,
        order: 1501
      }
    ]
  } else {
    extraActions = []
  }

  void getModelRefActions().then((actions) => {
    modelRefActions = actions
  })
  $: refActions = readonly
    ? []
    : defaultRefActions
      .concat(extraActions)
      .concat(modelRefActions)
      .sort((a, b) => a.order - b.order)

  let progress = false
  let attachments: Attachment[] = []

  const query = createQuery()
  $: query.query(
    attachment.class.Attachment,
    {
      attachedTo: object._id
    },
    (res) => {
      attachments = res
    }
  )

  let inputFile: HTMLInputElement

  export function isFocused (): boolean {
    return editor?.isFocused() ?? false
  }

  export function handleTable (element: HTMLElement, editorHandler: TextEditorHandler, event?: MouseEvent): void {
    const position = event !== undefined ? getEventPositionElement(event) : getPopupPositionElement(element)

    addTableHandler(editorHandler.insertTable, position)
  }

  export function handleAttach (): void {
    inputFile.click()
  }

  async function fileSelected (): Promise<void> {
    if (readonly) return

    const list = inputFile.files
    if (list === null || list.length === 0) return

    progress = true

    await uploadFiles(list, { onFileUploaded })

    inputFile.value = ''
    progress = false
  }

  async function attachFiles (files: File[] | FileList): Promise<void> {
    progress = true
    if (files.length > 0) {
      await uploadFiles(files, { onFileUploaded })
    }
    progress = false
  }

  async function attachFile (file: File): Promise<{ file: Ref<Blob>, type: string } | undefined> {
    try {
      const uuid = await uploadFile(file)
      const metadata = await getFileMetadata(file, uuid)
      await createAttachment(uuid, file.name, file, metadata)
      return { file: uuid, type: file.type }
    } catch (err: any) {
      await setPlatformStatus(unknownError(err))
    }
  }

  async function onFileUploaded ({ uuid, name, file, metadata }: FileUploadCallbackParams): Promise<void> {
    await createAttachment(uuid, name, file, metadata)
  }

  async function createAttachment (
    uuid: Ref<Blob>,
    name: string,
    file: FileOrBlob,
    metadata: BlobMetadata | undefined
  ): Promise<void> {
    try {
      const _id: Ref<Attachment> = generateId()

      const space = client.getHierarchy().isDerived(object._class, core.class.Space)
        ? (object._id as Ref<Space>)
        : object.space

      const attachmentDoc: Attachment = {
        _id,
        _class: attachment.class.Attachment,
        collection: 'attachments',
        modifiedOn: 0,
        modifiedBy: '' as PersonId,
        space,
        attachedTo: object._id,
        attachedToClass: object._class,
        name,
        file: uuid,
        type: file.type,
        size: file.size,
        metadata,
        lastModified: file instanceof File ? file.lastModified : Date.now()
      }

      await client.addCollection(
        attachment.class.Attachment,
        space,
        object._id,
        object._class,
        'attachments',
        attachmentDoc,
        attachmentDoc._id
      )

      const id = identifier ?? (await getObjectId(object, client.getHierarchy()))
      Analytics.handleEvent(AttachmentsEvents.FilesAttached, {
        objectId: id,
        objectClass: object._class,
        type: file.type
      })
    } catch (err: any) {
      await setPlatformStatus(unknownError(err))
    }
  }

  function isAllowedPaste (evt: ClipboardEvent): boolean {
    let t: HTMLElement | null = evt.target as HTMLElement

    if (refContainer === undefined) {
      return true
    }

    while (t != null) {
      t = t.parentElement
      if (t === refContainer) {
        return true
      }
    }

    return false
  }

  export async function pasteAction (evt: ClipboardEvent): Promise<void> {
    if (readonly) return
    if (!isAllowedPaste(evt)) {
      return
    }

    progress = true

    const items = evt.clipboardData?.items ?? []
    const files = []
    for (const index in items) {
      const item = items[index]
      if (item.kind === 'file') {
        const blob = item.getAsFile()
        if (blob !== null) {
          files.push(blob)
        }
      }
    }

    if (files.length > 0) {
      await attachFiles(files)
    }

    progress = false
  }

  export async function fileDrop (e: DragEvent): Promise<void> {
    if (readonly) return

    const list = e.dataTransfer?.files
    if (list !== undefined && list.length !== 0) {
      await attachFiles(list)
    }
  }

  async function removeAttachment (attachment: Attachment): Promise<void> {
    progressItems.push(attachment._id)
    progressItems = progressItems

    await client.removeCollection(
      attachment._class,
      attachment.space,
      attachment._id,
      attachment.attachedTo,
      attachment.attachedToClass,
      'attachments'
    )

    await editor.removeAttachment(attachment.file)
  }

  let progressItems: Ref<Doc>[] = []
</script>

<input
  bind:this={inputFile}
  disabled={inputFile == null}
  multiple
  type="file"
  name="file"
  id="fileInput"
  style="display: none"
  on:change={fileSelected}
/>

{#key object?._id}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="flex-col clear-mins"
    on:paste={(ev) => pasteAction(ev)}
    on:dragover|preventDefault={() => {}}
    on:dragleave={() => {}}
    on:drop|preventDefault|stopPropagation={(ev) => {
      void fileDrop(ev)
    }}
  >
    <CollaborativeAttributeBox
      bind:this={editor}
      {object}
      {key}
      {user}
      {userComponent}
      {focusIndex}
      {placeholder}
      {boundary}
      {refActions}
      {readonly}
      {attachFile}
      on:open-document={async (event) => {
        const doc = await client.findOne(event.detail._class, { _id: event.detail._id })
        if (doc != null) {
          const location = await getObjectLinkFragment(client.getHierarchy(), doc, {}, view.component.EditDoc)
          navigate(location)
        }
      }}
      on:focus
      on:blur
      on:update
    />
    {#if (attachments.length > 0 && enableAttachments) || progress}
      <AttachmentsGrid
        {attachments}
        {readonly}
        {progress}
        {useAttachmentPreview}
        on:remove={async (evt) => {
          if (evt.detail !== undefined) {
            await removeAttachment(evt.detail)
          }
        }}
      />
    {/if}
  </div>
{/key}
