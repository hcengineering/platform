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
  import { Account, Class, Doc, IdMap, Markup, RateLimiter, Ref, Space, generateId, toIdMap } from '@hcengineering/core'
  import { Asset, IntlString, setPlatformStatus, unknownError, getMetadata } from '@hcengineering/platform'
  import {
    DraftController,
    createQuery,
    deleteFile,
    draftsStore,
    getClient,
    getFileMetadata,
    uploadFile,
    fetchLinkPreviewDetails,
    canDisplayLinkPreview,
    isLinkPreviewEnabled,
  } from '@hcengineering/presentation'
  import { EmptyMarkup } from '@hcengineering/text'
  import textEditor, { type RefAction } from '@hcengineering/text-editor'
  import { AttachIcon, ReferenceInput } from '@hcengineering/text-editor-resources'
  import { Loading, type AnySvelteComponent } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy, tick } from 'svelte'
  import attachment from '../plugin'
  import AttachmentPresenter from './AttachmentPresenter.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let content: Markup = EmptyMarkup
  export let iconSend: Asset | AnySvelteComponent | undefined = undefined
  export let labelSend: IntlString | undefined = undefined
  export let showSend = true
  export let showActions = true
  export let shouldSaveDraft: boolean = false
  export let attachments: IdMap<Attachment> = new Map()
  export let loading = false
  export let focusIndex: number = -1
  export let autofocus = false
  export function submit (): void {
    refInput.submit()
  }
  export let placeholder: IntlString | undefined = undefined
  export let extraActions: RefAction[] = []
  export let boundary: HTMLElement | undefined = undefined
  export let skipAttachmentsPreload = false

  let refInput: ReferenceInput

  let inputFile: HTMLInputElement
  let saved = false
  const dispatch = createEventDispatcher()

  const client = getClient()
  const query = createQuery()

  $: draftKey = `${objectId}_attachments`
  $: draftController = new DraftController<Record<Ref<Attachment>, Attachment>>(draftKey)

  let draftAttachments: Record<Ref<Attachment>, Attachment> | undefined = undefined
  let originalAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const newAttachments: Set<Ref<Attachment>> = new Set<Ref<Attachment>>()
  const removedAttachments: Set<Attachment> = new Set<Attachment>()
  const urlSet = new Set<string>()

  let progress = false

  let refContainer: HTMLElement

  const existingAttachmentsQuery = createQuery()
  let existingAttachments: Ref<Attachment>[] = []

  $: if (Array.from(attachments.keys()).length > 0) {
    existingAttachmentsQuery.query(
      attachment.class.Attachment,
      {
        space,
        attachedTo: objectId,
        attachedToClass: _class,
        _id: { $in: Array.from(attachments.keys()) }
      },
      (res) => {
        existingAttachments = res.map((p) => {
          if (p.type === 'application/link-preview') {
            urlSet.add(getUrlKey(p.name))
          }
          return p._id
        })
      }
    )
  } else {
    existingAttachments = []
    existingAttachmentsQuery.unsubscribe()
  }

function getUrlKey (s: string): string {
  const url = new URL(s)
  return url.host + url.pathname
}

  $: objectId && updateAttachments(objectId)

  async function updateAttachments (objectId: Ref<Doc>): Promise<void> {
    draftAttachments = $draftsStore[draftKey]
    if (draftAttachments && shouldSaveDraft) {
      attachments = new Map()
      newAttachments.clear()
      Object.entries(draftAttachments).map((file) => {
        return attachments.set(file[0] as Ref<Attachment>, file[1])
      })
      Object.entries(draftAttachments).map((file) => {
        return newAttachments.add(file[0] as Ref<Attachment>)
      })
      originalAttachments.clear()
      removedAttachments.clear()
      urlSet.clear()
      query.unsubscribe()
    } else if (!skipAttachmentsPreload) {
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
    } else {
      attachments = new Map()
      newAttachments.clear()
      originalAttachments.clear()
      removedAttachments.clear()
      urlSet.clear()
      query.unsubscribe()
    }
  }

  function saveDraft (): void {
    if (shouldSaveDraft) {
      draftAttachments = Object.fromEntries(attachments)
      draftController.save(draftAttachments)
    }
  }

  async function createAttachment (file: File): Promise<void> {
    try {
      const uuid = await uploadFile(file)
      const metadata = await getFileMetadata(file, uuid)
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
        lastModified: file.lastModified,
        metadata
      })
      newAttachments.add(_id)
      attachments = attachments
      saved = false
      saveDraft()
      dispatch('update', { message: content, attachments: attachments.size })
    } catch (err: any) {
      void setPlatformStatus(unknownError(err))
    }
  }

  async function saveAttachment (doc: Attachment): Promise<void> {
    if (!existingAttachments.includes(doc._id)) {
      await client.addCollection(attachment.class.Attachment, space, objectId, _class, 'attachments', doc, doc._id)
      newAttachments.delete(doc._id)
    }
  }

  async function fileSelected (): Promise<void> {
    progress = true
    await tick()
    const list = inputFile.files
    if (list === null || list.length === 0) return
    const limiter = new RateLimiter(10)
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await limiter.add(() => createAttachment(file))
      }
    }
    await limiter.waitProcessing()
    inputFile.value = ''
    progress = false
  }

  async function fileDrop (e: DragEvent): Promise<void> {
    const list = e.dataTransfer?.files
    const limiter = new RateLimiter(10)

    if (list === undefined || list.length === 0) return
    progress = true
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await limiter.add(() => createAttachment(file))
      }
    }
    await limiter.waitProcessing()
    progress = false
  }

  async function removeAttachment (attachment: Attachment): Promise<void> {
    if (attachment.type === 'application/link-preview') {
      urlSet.delete(getUrlKey(attachment.name))
    }
    removedAttachments.add(attachment)
    attachments.delete(attachment._id)
    attachments = attachments
    saveDraft()
    dispatch('update', { message: content, attachments: attachments.size })
  }

  async function deleteAttachment (attachment: Attachment): Promise<void> {
    if (attachment.type === 'application/link-preview') {
      urlSet.delete(getUrlKey(attachment.name))
    }
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
      newAttachments.forEach((p) => {
        const attachment = attachments.get(p)
        if (attachment !== undefined) {
          void deleteAttachment(attachment)
        }
      })
    }
  })

  export function removeDraft (removeFiles: boolean): void {
    draftController.remove()
    if (removeFiles) {
      newAttachments.forEach((p) => {
        const attachment = attachments.get(p)
        if (attachment !== undefined) {
          void deleteFile(attachment.file)
        }
      })
    }
  }

  export async function createAttachments (): Promise<void> {
    if (saved) {
      return
    }
    saved = true
    const limiter = new RateLimiter(10)
    newAttachments.forEach((p) => {
      const attachment = attachments.get(p)
      if (attachment !== undefined) {
        void limiter.add(() => saveAttachment(attachment))
      }
    })
    removedAttachments.forEach((p) => {
      void limiter.add(() => deleteAttachment(p))
    })
    await limiter.waitProcessing()
    newAttachments.clear()
    urlSet.clear()
    removedAttachments.clear()
    saveDraft()
  }

  async function onMessage (event: CustomEvent): Promise<void> {
    loading = true
    await createAttachments()
    loading = false
    dispatch('message', { message: event.detail, attachments: attachments.size })
  }

  function updateLinkPreview (): void {
    const hrefs = refContainer.getElementsByTagName('a')
    const newUrls: string[] = []
    for (let i = 0; i < hrefs.length; i++) {
      if (hrefs[i].target !== '_blank') {
        continue
      }
      if (urlSet.has(getUrlKey(hrefs[i].href))) {
        continue
      }
      newUrls.push(hrefs[i].href)
    }
    console.log(urlSet)
    if (newUrls.length > 0) {
      void loadLinks(newUrls)
    }
  }

  function onUpdate (event: CustomEvent): void {
    if (isLinkPreviewEnabled()) {
      updateLinkPreview()
    }
    dispatch('update', { message: event.detail, attachments: attachments.size })
  }

  async function loadLinks (urls: string[]): Promise<void> {
    progress = true
    for (const url of urls) {
      if (urlSet.has(url)) {
        continue
      }
      urlSet.add(getUrlKey(url))
      const meta = await fetchLinkPreviewDetails(url)
      if (canDisplayLinkPreview(meta) && meta.url !== undefined) {
        const blob = new Blob([JSON.stringify(meta)])
        const file = new File([blob], meta.url, { type: 'application/link-preview' })
        void createAttachment(file)
      }
    }
    progress = false
  }

  async function loadFiles (evt: ClipboardEvent): Promise<void> {
    progress = true
    const files = (evt.clipboardData?.files ?? []) as File[]

    for (const file of files) {
      await createAttachment(file)
    }

    progress = false
  }

  function pasteAction (_: any, evt: ClipboardEvent): boolean {
    let target: HTMLElement | null = evt.target as HTMLElement
    let allowed = false

    while (target != null) {
      target = target.parentElement
      if (target === refContainer) {
        allowed = true
      }
    }
    if (!allowed) {
      return false
    }
    const hasFiles = Array.from(evt.clipboardData?.items ?? []).some((i) => i.kind === 'file')

    if (hasFiles) {
      void loadFiles(evt)
      return true
    }

    return false
  }
</script>

<div class="flex-col no-print" bind:this={refContainer}>
  <input
    bind:this={inputFile}
    disabled={inputFile == null}
    multiple
    type="file"
    name="file"
    id="file"
    style="display: none"
    on:change={fileSelected}
  />
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="flex-col"
    on:dragover|preventDefault={() => {}}
    on:dragleave={() => {}}
    on:drop|preventDefault|stopPropagation={fileDrop}
  >
    <ReferenceInput
      {focusIndex}
      bind:this={refInput}
      bind:content
      {iconSend}
      {labelSend}
      {showSend}
      {showActions}
      autofocus={autofocus ? 'end' : false}
      loading={loading || progress}
      {boundary}
      canEmbedFiles={false}
      canEmbedImages={false}
      extraActions={[
        ...extraActions,
        {
          label: textEditor.string.Attach,
          icon: AttachIcon,
          action: () => {
            dispatch('focus')
            inputFile.click()
          },
          order: 1001
        }
      ]}
      showHeader={attachments.size > 0 || progress}
      haveAttachment={attachments.size > 0}
      on:focus
      on:blur
      on:message={onMessage}
      on:update={onUpdate}
      onPaste={pasteAction}
      {placeholder}
    >
      <div slot="header">
        {#if attachments.size > 0 || progress}
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
                    if (result !== undefined) void removeAttachment(attachment)
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
