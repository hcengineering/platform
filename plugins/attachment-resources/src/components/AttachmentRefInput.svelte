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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ReferenceInput } from '@hcengineering/text-editor'
  import { deleteFile, uploadFile } from '../utils'
  import attachment from '../plugin'
  import { setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { Account, Class, Doc, generateId, Ref, Space } from '@hcengineering/core'
  import { Attachment } from '@hcengineering/attachment'
  import AttachmentPresenter from './AttachmentPresenter.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let content: string = ''
  export let showSend = true
  export let shouldUseDraft: boolean = false
  export function submit (): void {
    refInput.submit()
  }
  let refInput: ReferenceInput

  let inputFile: HTMLInputElement
  let saved = false
  const dispatch = createEventDispatcher()

  const client = getClient()
  const query = createQuery()

  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()
  let originalAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const newAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const removedAttachments: Set<Attachment> = new Set<Attachment>()

  let refContainer: HTMLElement

  $: objectId &&
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

  async function createAttachment (file: File) {
    try {
      const uuid = await uploadFile(file, { space, attachedTo: objectId })
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
      if (shouldUseDraft) {
        await createAttachments()
      }
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    }
  }

  async function saveAttachment (doc: Attachment): Promise<void> {
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

  function fileDrop (e: DragEvent) {
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) createAttachment(file)
    }
  }

  async function removeAttachment (attachment: Attachment): Promise<void> {
    removedAttachments.add(attachment)
    attachments.delete(attachment._id)
    if (shouldUseDraft) {
      await createAttachments()
    }
    attachments = attachments
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
    if (!saved) {
      newAttachments.forEach(async (p) => {
        const attachment = attachments.get(p)
        if (attachment !== undefined) {
          await deleteAttachment(attachment)
        }
      })
    }
  })

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
    await createAttachments()
    dispatch('message', { message: event.detail, attachments: attachments.size })
  }

  async function onUpdate (event: CustomEvent) {
    dispatch('update', { message: event.detail, attachments: attachments.size })
  }

  function pasteAction (evt: ClipboardEvent): void {
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

<svelte:window on:paste={pasteAction} />

<div bind:this={refContainer}>
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
    {#if attachments.size}
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
    <ReferenceInput
      bind:this={refInput}
      {content}
      {showSend}
      on:message={onMessage}
      haveAttachment={attachments.size > 0}
      withoutTopBorder={attachments.size > 0}
      on:attach={() => {
        inputFile.click()
      }}
      on:update={onUpdate}
    />
  </div>
</div>

<style lang="scss">
  .list {
    padding: 0.5rem;
    color: var(--theme-caption-color);
    overflow-x: auto;
    overflow-y: hidden;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem 0.5rem 0 0;
    border-bottom: none;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--divider-color);
    }
  }
</style>
