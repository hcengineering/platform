<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Account, Doc, Ref, generateId } from '@hcengineering/core'
  import { IntlString, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { KeyedAttribute, createQuery, getClient } from '@hcengineering/presentation'
  import textEditor, { AttachIcon, CollaborativeAttributeBox, RefAction } from '@hcengineering/text-editor'
  import { navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import AttachmentsGrid from './AttachmentsGrid.svelte'
  import { uploadFile } from '../utils'
  import { defaultRefActions, getModelRefActions } from '@hcengineering/text-editor/src/components/editor/actions'

  export let object: Doc
  export let key: KeyedAttribute
  export let placeholder: IntlString
  export let focusIndex = -1
  export let boundary: HTMLElement | undefined = undefined
  export let refContainer: HTMLElement | undefined = undefined

  export let enableAttachments: boolean = true
  export let useAttachmentPreview: boolean = false

  const client = getClient()

  let refActions: RefAction[] = []
  let extraActions: RefAction[] = []
  let modelRefActions: RefAction[] = []

  $: if (enableAttachments) {
    extraActions = [
      {
        label: textEditor.string.Attach,
        icon: AttachIcon,
        action: handleAttach,
        order: 1001
      }
    ]
  } else {
    extraActions = []
  }

  void getModelRefActions().then((actions) => {
    modelRefActions = actions
  })
  $: refActions = defaultRefActions
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

  export function handleAttach (): void {
    inputFile.click()
  }

  async function fileSelected (): Promise<void> {
    progress = true
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await createAttachment(file)
      }
    }
    inputFile.value = ''
    progress = false
  }

  async function createAttachment (file: File): Promise<{ file: string, type: string } | undefined> {
    try {
      const uuid = await uploadFile(file)
      const _id: Ref<Attachment> = generateId()
      const attachmentDoc: Attachment = {
        _id,
        _class: attachment.class.Attachment,
        collection: 'attachments',
        modifiedOn: 0,
        modifiedBy: '' as Ref<Account>,
        space: object.space,
        attachedTo: object._id,
        attachedToClass: object._class,
        name: file.name,
        file: uuid,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      }

      await client.addCollection(
        attachment.class.Attachment,
        object.space,
        object._id,
        object._class,
        'attachments',
        attachmentDoc,
        attachmentDoc._id
      )
      return { file: uuid, type: file.type }
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
    if (!isAllowedPaste(evt)) {
      return
    }

    const items = evt.clipboardData?.items ?? []
    for (const index in items) {
      const item = items[index]
      if (item.kind === 'file') {
        const blob = item.getAsFile()
        if (blob !== null) {
          await createAttachment(blob)
        }
      }
    }
  }

  export async function fileDrop (e: DragEvent): Promise<void> {
    progress = true
    const list = e.dataTransfer?.files
    if (list !== undefined && list.length !== 0) {
      for (let index = 0; index < list.length; index++) {
        const file = list.item(index)
        if (file !== null) {
          await createAttachment(file)
        }
      }
    }
    progress = false
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
  }

  let progressItems: Ref<Doc>[] = []
</script>

<input
  bind:this={inputFile}
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
      {object}
      {key}
      {focusIndex}
      {placeholder}
      {boundary}
      {refActions}
      attachFile={async (file) => {
        return await createAttachment(file)
      }}
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
        {progress}
        {progressItems}
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
