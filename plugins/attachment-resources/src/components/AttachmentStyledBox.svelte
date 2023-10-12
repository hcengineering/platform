<!--
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
-->
<script lang="ts">
  import { Attachment } from '@hcengineering/attachment'
  import { Account, Class, Doc, generateId, Ref, Space, toIdMap } from '@hcengineering/core'
  import { IntlString, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { ButtonSize, IconSize, updatePopup } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import attachment from '../plugin'
  import { deleteFile, uploadFile } from '../utils'
  import AttachmentPresenter from './AttachmentPresenter.svelte'
  import AttachmentPreview from './AttachmentPreview.svelte'
  import { ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import Loading from '@hcengineering/ui/src/components/Loading.svelte'

  export let objectId: Ref<Doc> | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let content: string = ''
  export let placeholder: IntlString | undefined = undefined
  export let alwaysEdit = false
  export let showButtons = false
  export let kind: 'normal' | 'emphasized' | 'indented' = 'normal'
  export let buttonSize: ButtonSize = 'medium'
  export let formatButtonSize: IconSize = 'small'
  export let maxHeight: 'max' | 'card' | 'limited' | string = 'max'
  export let focusable: boolean = false
  export let refContainer: HTMLElement | undefined = undefined
  export let shouldSaveDraft: boolean = false
  export let useAttachmentPreview = false
  export let focusIndex: number | undefined = -1
  export let enableAttachments: boolean = true
  export let enableBackReferences: boolean = false
  export let isScrollable = true

  export let useDirectAttachDelete = false
  export let boundary: HTMLElement | undefined = undefined

  let progress = false

  let draftKey = objectId ? `${objectId}_attachments` : undefined
  $: draftKey = objectId ? `${objectId}_attachments` : undefined

  const dispatch = createEventDispatcher()
  let attachmentPopupId: string = ''
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    const currentAttachmentIndex = listProvider.current()
    if (currentAttachmentIndex === undefined) return
    const selected = currentAttachmentIndex + offset
    const sel = listProvider.docs()[selected] as Attachment
    if (sel !== undefined && attachmentPopupId !== '') {
      listProvider.updateFocus(sel)
      updatePopup(attachmentPopupId, { props: { file: sel.file, name: sel.name, contentType: sel.type } })
    }
  })
  $: listProvider.update(Array.from(attachments.values()).filter((attachment) => attachment.type.startsWith('image/')))

  export function focus (): void {
    refInput.focus()
  }
  export function isFocused (): boolean {
    return refInput.isFocused()
  }
  export function isEditable (): boolean {
    return refInput.isEditable()
  }
  export function setEditable (editable: boolean): void {
    refInput.setEditable(editable)
  }
  export function setContent (data: string): void {
    refInput.setContent(data)
  }
  export function attach (): void {
    inputFile.click()
  }

  export function submit (): void {
    refInput.submit()
  }
  let refInput: StyledTextBox

  let inputFile: HTMLInputElement
  let saved = false

  const client = getClient()
  const query = createQuery()
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()
  let originalAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const newAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const removedAttachments: Set<Attachment> = new Set<Attachment>()

  $: draftKey && updateAttachments(objectId, $draftsStore[draftKey])

  async function updateAttachments (
    objectId: Ref<Doc> | undefined,
    draftAttachments: Record<Ref<Attachment>, Attachment> | undefined
  ) {
    if (draftAttachments && shouldSaveDraft) {
      query.unsubscribe()
      attachments.clear()
      newAttachments.clear()
      Object.entries(draftAttachments).map((file) => {
        return attachments.set(file[0] as Ref<Attachment>, file[1])
      })
      Object.entries(draftAttachments).map((file) => {
        return newAttachments.add(file[0] as Ref<Attachment>)
      })
      originalAttachments.clear()
      removedAttachments.clear()
      attachments = attachments
    } else if (objectId) {
      query.query(
        attachment.class.Attachment,
        {
          attachedTo: objectId
        },
        (res) => {
          originalAttachments = new Set(res.map((p) => p._id))
          attachments = toIdMap(res)
          dispatch('attach', { action: 'saved', value: attachments.size })
        }
      )
    }
  }

  async function saveDraft () {
    if (draftKey && shouldSaveDraft) {
      const draftAttachments = Object.fromEntries(attachments)
      DraftController.save(draftKey, draftAttachments)
    }
  }

  async function createAttachment (file: File): Promise<{ file: string; type: string } | undefined> {
    if (space === undefined || objectId === undefined || _class === undefined) return
    try {
      const uuid = await uploadFile(file)
      const _id: Ref<Attachment> = generateId()
      attachments.set(_id, {
        _id,
        _class: attachment.class.Attachment,
        collection: 'attachments',
        modifiedOn: 0,
        modifiedBy: '' as Ref<Account>,
        space,
        attachedTo: objectId,
        attachedToClass: _class,
        name: file.name,
        file: uuid,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
      newAttachments.add(_id)
      attachments = attachments
      saved = false
      saveDraft()
      dispatch('attach', { action: 'saved', value: attachments.size })
      dispatch('attached', _id)

      if (useDirectAttachDelete) {
        saveNewAttachment(_id)
      }
      return { file: uuid, type: file.type }
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    }
  }

  async function saveAttachment (doc: Attachment, objectId: Ref<Doc> | undefined): Promise<void> {
    if (space === undefined || objectId === undefined || _class === undefined) return
    newAttachments.delete(doc._id)
    await client.addCollection(attachment.class.Attachment, space, objectId, _class, 'attachments', doc, doc._id)
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
    if (useDirectAttachDelete) {
      progressItems.push(attachment._id)
      progressItems = progressItems
      await deleteAttachment(attachment)
    }
    removedAttachments.add(attachment)
    attachments.delete(attachment._id)
    attachments = attachments
    refInput.removeAttachment(attachment.file)
    saveDraft()
    dispatch('detached', attachment._id)

    progressItems = progressItems.filter((it) => it !== attachment._id)
  }

  async function deleteAttachment (attachment: Attachment): Promise<void> {
    removedAttachments.delete(attachment)
    if (originalAttachments.has(attachment._id)) {
      await client.removeCollection(
        attachment._class,
        attachment.space,
        attachment._id,
        attachment.attachedTo,
        attachment.attachedToClass,
        'attachments'
      )
      dispatch('detached', attachment._id)
    } else {
      await deleteFile(attachment.file)
    }
  }

  onDestroy(() => {
    if (!saved && !shouldSaveDraft) {
      newAttachments.forEach(async (p) => {
        const attachment = attachments.get(p)
        if (attachment !== undefined) {
          await deleteAttachment(attachment)
        }
      })
    }
  })

  export function removeDraft (removeFiles: boolean) {
    if (draftKey) {
      DraftController.remove(draftKey)
    }
    if (removeFiles) {
      newAttachments.forEach(async (p) => {
        const attachment = attachments.get(p)
        if (attachment !== undefined) {
          await deleteFile(attachment.file)
        }
      })
    }
  }

  export async function saveNewAttachment (_id: Ref<Attachment>): Promise<void> {
    const attachment = attachments.get(_id)
    if (attachment !== undefined) {
      await saveAttachment(attachment, objectId)
    }
  }

  export async function removeAttachmentById (_id: Ref<Attachment>): Promise<void> {
    const attachment = attachments.get(_id)
    if (attachment !== undefined) {
      await removeAttachment(attachment)
    }
  }

  export async function createAttachments (_id: Ref<Doc> | undefined = objectId): Promise<void> {
    if (saved) {
      return
    }
    saved = true
    const promises: Promise<any>[] = []
    newAttachments.forEach((p) => {
      const attachment = attachments.get(p)
      if (attachment !== undefined) {
        promises.push(saveAttachment(attachment, _id))
      }
    })
    removedAttachments.forEach((p) => {
      promises.push(deleteAttachment(p))
    })
    await Promise.all(promises)
    removeDraft(false)
    newAttachments.clear()
    removedAttachments.clear()
  }

  function isAllowedPaste (evt: ClipboardEvent) {
    let t: HTMLElement | null = evt.target as HTMLElement

    if (!refContainer) {
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

  $: dispatch('attachments', {
    size: attachments.size,
    values: attachments.size === 0 ? true : attachments
  })

  let element: HTMLElement
  let progressItems: Ref<Doc>[] = []
</script>

<input
  bind:this={inputFile}
  multiple
  type="file"
  name="file"
  id="file"
  style="display: none"
  on:change={fileSelected}
/>

<div
  class="flex-col clear-mins"
  on:paste={(ev) => pasteAction(ev)}
  on:dragover|preventDefault={() => {}}
  on:dragleave={() => {}}
  on:drop|preventDefault|stopPropagation={(ev) => {
    fileDrop(ev)
  }}
>
  <div class="expand-collapse">
    <StyledTextBox
      {focusIndex}
      bind:this={refInput}
      bind:content
      {placeholder}
      {alwaysEdit}
      {showButtons}
      hideAttachments={!enableAttachments}
      {buttonSize}
      {formatButtonSize}
      {maxHeight}
      {focusable}
      {kind}
      {enableBackReferences}
      {isScrollable}
      {boundary}
      on:changeSize
      on:changeContent
      on:blur
      on:focus
      on:open-document
      on:attach={() => {
        attach()
      }}
      attachFile={async (file) => {
        return createAttachment(file)
      }}
    />
  </div>
  {#if (attachments.size && enableAttachments) || progress}
    <div class="flex-row-center list scroll-divider-color">
      {#each Array.from(attachments.values()) as attachment, index}
        <div class="item flex-center flex-no-shrink clear-mins">
          {#if useAttachmentPreview}
            <AttachmentPreview value={attachment} {listProvider} on:open={(res) => (attachmentPopupId = res.detail)} />
          {:else}
            <AttachmentPresenter
              value={attachment}
              removable
              showPreview
              progress={progressItems.includes(attachment._id)}
              on:remove={(result) => {
                if (result !== undefined) {
                  removeAttachment(attachment)
                }
              }}
            />
          {/if}
        </div>
      {/each}
      {#if progress}
        <div class="flex p-3" bind:this={element}>
          <Loading
            on:progress={() => {
              element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' })
            }}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .list {
    align-items: stretch;
    margin-top: 0.5rem;
    padding: 0.5rem;
    min-width: 0;
    color: var(--theme-caption-color);
    overflow-x: auto;
    overflow-y: hidden;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;

    .item {
      min-height: 100%;
    }
    .item + .item {
      margin-left: 1rem;
      padding-left: 1rem;
      border-left: 1px solid var(--theme-divider-color);
    }
  }
</style>
