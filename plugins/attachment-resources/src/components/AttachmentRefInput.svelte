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
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import { ReferenceInput } from '@hcengineering/text-editor'
  import type { RefAction } from '@hcengineering/text-editor'
  import { deleteFile, uploadFile } from '../utils'
  import attachment from '../plugin'
  import { IntlString, setPlatformStatus, unknownError, Asset } from '@hcengineering/platform'
  import { createEventDispatcher, onDestroy, tick } from 'svelte'
  import { Account, Class, Doc, generateId, IdMap, Ref, Space, toIdMap } from '@hcengineering/core'
  import { Loading, type AnySvelteComponent } from '@hcengineering/ui'
  import { Attachment } from '@hcengineering/attachment'
  import AttachmentPresenter from './AttachmentPresenter.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let content: string = ''
  export let iconSend: Asset | AnySvelteComponent | undefined = undefined
  export let labelSend: IntlString | undefined = undefined
  export let showSend = true
  export let shouldSaveDraft: boolean = false
  export let attachments: IdMap<Attachment> = new Map()
  export let loading = false
  export let focusIndex: number = -1
  export function submit (): void {
    refInput.submit()
  }
  export let placeholder: IntlString | undefined = undefined
  export let extraActions: RefAction[] | undefined = undefined
  export let boundary: HTMLElement | undefined = undefined

  let refInput: ReferenceInput

  let inputFile: HTMLInputElement
  let saved = false
  const dispatch = createEventDispatcher()

  const client = getClient()
  const query = createQuery()

  const draftKey = `${objectId}_attachments`
  const draftController = new DraftController<Record<Ref<Attachment>, Attachment>>(draftKey)

  let draftAttachments: Record<Ref<Attachment>, Attachment> | undefined = undefined
  let originalAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const newAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const removedAttachments: Set<Attachment> = new Set<Attachment>()

  let progress = false

  let refContainer: HTMLElement

  $: objectId && updateAttachments(objectId)

  async function updateAttachments (objectId: Ref<Doc>) {
    draftAttachments = $draftsStore[draftKey]
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
          attachments = toIdMap(res)
        }
      )
    }
  }

  async function saveDraft () {
    if (shouldSaveDraft) {
      draftAttachments = Object.fromEntries(attachments)
      draftController.save(draftAttachments)
    }
  }

  async function createAttachment (file: File) {
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
    await client.addCollection(attachment.class.Attachment, space, objectId, _class, 'attachments', doc, doc._id)
  }

  async function fileSelected (): Promise<void> {
    progress = true
    await tick()
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

  async function fileDrop (e: DragEvent): Promise<void> {
    progress = true
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await createAttachment(file)
      }
    }
    progress = false
  }

  async function removeAttachment (attachment: Attachment): Promise<void> {
    removedAttachments.add(attachment)
    attachments.delete(attachment._id)
    if (shouldSaveDraft) {
      await createAttachments()
    }
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
    draftController.remove()
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

  async function onMessage (event: CustomEvent) {
    loading = true
    await createAttachments()
    loading = false
    dispatch('message', { message: event.detail, attachments: attachments.size })
  }

  async function onUpdate (event: CustomEvent) {
    dispatch('update', { message: event.detail, attachments: attachments.size })
  }

  async function pasteAction (evt: ClipboardEvent): Promise<void> {
    let t: HTMLElement | null = evt.target as HTMLElement
    let allowed = false
    while (t != null) {
      t = t.parentElement
      if (t === refContainer) {
        allowed = true
      }
    }
    if (!allowed) {
      return
    }

    const items = evt.clipboardData?.items ?? []
    progress = true
    for (const index in items) {
      const item = items[index]
      if (item.kind === 'file') {
        const blob = item.getAsFile()
        if (blob !== null) {
          await createAttachment(blob)
        }
      }
    }
    progress = false
  }
</script>

<div bind:this={refContainer} on:paste={pasteAction}>
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
    class="container"
    on:dragover|preventDefault={() => {}}
    on:dragleave={() => {}}
    on:drop|preventDefault|stopPropagation={fileDrop}
  >
    <ReferenceInput
      {focusIndex}
      bind:this={refInput}
      {content}
      {iconSend}
      {labelSend}
      {showSend}
      showHeader={attachments.size > 0 || progress}
      {loading}
      {boundary}
      on:focus
      on:blur
      on:message={onMessage}
      haveAttachment={attachments.size > 0}
      on:attach={() => {
        dispatch('focus')
        inputFile.click()
      }}
      on:update={onUpdate}
      {placeholder}
      {extraActions}
    >
      <div slot="header">
        {#if attachments.size || progress}
          <div class="flex-row-center list scroll-divider-color">
            {#if progress}
              <div class="flex p-3">
                <Loading />
              </div>
            {/if}
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
    </ReferenceInput>
  </div>
</div>

<style lang="scss">
  .list {
    padding: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--theme-divider-color);
    }
  }
</style>
