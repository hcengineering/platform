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
  import { Account, Class, Doc, generateId, Ref, Space } from '@hcengineering/core'
  import { IntlString, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createQuery, getClient, draftStore, updateDraftStore } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { IconSize } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import attachment from '../plugin'
  import { deleteFile, uploadFile } from '../utils'
  import AttachmentPresenter from './AttachmentPresenter.svelte'

  export let objectId: Ref<Doc> | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let content: string = ''
  export let placeholder: IntlString | undefined = undefined
  export let alwaysEdit = false
  export let showButtons = false
  export let emphasized: boolean = false
  export let buttonSize: IconSize = 'small'
  export let maxHeight: 'max' | 'card' | 'limited' | string = 'max'
  export let focusable: boolean = false
  export let fakeAttach: 'fake' | 'hidden' | 'normal' = 'normal'
  export let refContainer: HTMLElement | undefined = undefined
  export let shouldSaveDraft: boolean = false

  const dispatch = createEventDispatcher()

  export function focus (): void {
    refInput.focus()
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
  let draftAttachments: Record<Ref<Attachment>, Attachment> | undefined = undefined
  let saved = false

  const client = getClient()
  const query = createQuery()
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()
  let originalAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const newAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const removedAttachments: Set<Attachment> = new Set<Attachment>()

  $: objectId && updateAttachments(objectId)

  async function updateAttachments (objectId: Ref<Doc>) {
    draftAttachments = $draftStore[objectId]
    if (draftAttachments && shouldSaveDraft) {
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
    } else {
      query.query(
        attachment.class.Attachment,
        {
          attachedTo: objectId
        },
        (res) => {
          originalAttachments = new Set(res.map((p) => p._id))
          attachments = new Map(res.map((p) => [p._id, p]))
        }
      )
    }
  }

  async function saveDraft () {
    if (objectId && shouldSaveDraft) {
      draftAttachments = Object.fromEntries(attachments)
      updateDraftStore(objectId, draftAttachments)
    }
  }

  async function createAttachment (file: File) {
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
      saveDraft()
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    }
  }

  async function saveAttachment (doc: Attachment): Promise<void> {
    if (space === undefined || objectId === undefined || _class === undefined) return
    await client.addCollection(attachment.class.Attachment, space, objectId, _class, 'attachments', doc, doc._id)
  }

  function fileSelected () {
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) createAttachment(file)
    }
    inputFile.value = ''
  }

  export function fileDrop (e: DragEvent) {
    const list = e.dataTransfer?.files
    if (list !== undefined && list.length !== 0) {
      for (let index = 0; index < list.length; index++) {
        const file = list.item(index)
        if (file !== null) createAttachment(file)
      }
    }
  }

  async function removeAttachment (attachment: Attachment): Promise<void> {
    removedAttachments.add(attachment)
    attachments.delete(attachment._id)
    attachments = attachments
    saveDraft()
  }

  async function deleteAttachment (attachment: Attachment): Promise<void> {
    if (originalAttachments.has(attachment._id)) {
      await client.removeCollection(
        attachment._class,
        attachment.space,
        attachment._id,
        attachment.attachedTo,
        attachment.attachedToClass,
        'attachments'
      )
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
    if (objectId) {
      updateDraftStore(objectId, undefined)
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

  export function createAttachments (): Promise<void> {
    saved = true
    const promises: Promise<any>[] = []
    newAttachments.forEach((p) => {
      const attachment = attachments.get(p)
      if (attachment !== undefined) {
        promises.push(saveAttachment(attachment))
      }
    })
    removedAttachments.forEach((p) => {
      promises.push(deleteAttachment(p))
    })
    return Promise.all(promises).then()
  }

  $: if (attachments.size || newAttachments.size || removedAttachments.size) {
    dispatch('attach', { action: 'saved', value: attachments.size })
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

  export function pasteAction (evt: ClipboardEvent): void {
    if (!isAllowedPaste(evt)) {
      return
    }

    const items = evt.clipboardData?.items ?? []
    for (const index in items) {
      const item = items[index]
      if (item.kind === 'file') {
        const blob = item.getAsFile()
        if (blob !== null) {
          createAttachment(blob)
        }
      }
    }
  }
</script>

<svelte:window on:paste={(ev) => (fakeAttach === 'normal' ? pasteAction(ev) : undefined)} />

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
  on:dragover|preventDefault={() => {}}
  on:dragleave={() => {}}
  on:drop|preventDefault|stopPropagation={(ev) => {
    if (fakeAttach === 'fake') dispatch('attach', { action: 'drop', event: ev })
    else if (fakeAttach === 'normal') fileDrop(ev)
  }}
>
  <div class="expand-collapse">
    <StyledTextBox
      bind:this={refInput}
      bind:content
      {placeholder}
      {alwaysEdit}
      {showButtons}
      hideAttachments={fakeAttach === 'hidden'}
      {buttonSize}
      {maxHeight}
      {focusable}
      {emphasized}
      on:changeSize
      on:changeContent
      on:blur
      on:attach={() => {
        if (fakeAttach === 'fake') dispatch('attach', { action: 'add' })
        else if (fakeAttach === 'normal') attach()
      }}
    />
  </div>
  {#if attachments.size && fakeAttach === 'normal'}
    <div class="flex-row-center list scroll-divider-color">
      {#each Array.from(attachments.values()) as attachment}
        <div class="item flex">
          <AttachmentPresenter
            value={attachment}
            removable
            on:remove={(result) => {
              if (result !== undefined) removeAttachment(attachment)
            }}
          />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .list {
    margin-top: 0.5rem;
    padding: 0.5rem;
    min-width: 0;
    color: var(--theme-caption-color);
    overflow-x: auto;
    overflow-y: hidden;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--divider-color);
    }
  }
</style>
