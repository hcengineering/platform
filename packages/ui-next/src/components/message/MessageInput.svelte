<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Markup, RateLimiter, Ref } from '@hcengineering/core'
  import { tick, createEventDispatcher } from 'svelte'
  import {
    uploadFile,
    deleteFile,
    getCommunicationClient,
    getClient,
    getFileMetadata,
    isLinkPreviewEnabled
  } from '@hcengineering/presentation'
  import { Message, MessageID, FileData, LinkPreviewData } from '@hcengineering/communication-types'
  import { AttachmentPresenter, LinkPreviewCard } from '@hcengineering/attachment-resources'
  import { areEqualMarkups, isEmptyMarkup } from '@hcengineering/text'
  import { updateMyPresence } from '@hcengineering/presence-resources'
  import { ThrottledCaller } from '@hcengineering/ui'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { Card } from '@hcengineering/card'
  import { setPlatformStatus, unknownError } from '@hcengineering/platform'

  import TextInput from '../TextInput.svelte'
  import { defaultMessageInputActions, toMarkdown, toMarkup, loadLinkPreviewData } from '../../utils'
  import uiNext from '../../plugin'
  import IconPlus from '../icons/IconPlus.svelte'
  import { type TextInputAction, type PresenceTyping, MessageDraft } from '../../types'
  import TypingPresenter from '../TypingPresenter.svelte'
  import { getDraft, messageToDraft, saveDraft, getEmptyDraft, removeDraft } from '../../draft'

  export let card: Card
  export let message: Message | undefined = undefined
  export let title: string = ''
  export let onCancel: (() => void) | undefined = undefined
  export let onSubmit: ((markdown: string, files: FileData[]) => Promise<void>) | undefined = undefined

  const throttle = new ThrottledCaller(500)
  const dispatch = createEventDispatcher()
  const communicationClient = getCommunicationClient()
  const client = getClient()
  const me = getCurrentEmployee()

  const maxLinkPreviewCount = 4
  const previewUrls = new Map<string, boolean>()
  const linksData = new Map<string, LinkPreviewData | null>()

  let prevCard: Ref<Card> | undefined = card._id
  let prevMessage: MessageID | undefined = message?.id
  let draft: MessageDraft = message != null ? messageToDraft(message) : getDraft(card._id)

  let inputElement: HTMLInputElement
  let refContainer: HTMLElement | undefined | null = undefined

  let progress = false

  $: if (prevCard !== card._id) {
    prevCard = card._id
    initDraft()
  }

  $: if (prevMessage !== message?.id) {
    prevMessage = message?.id
    initDraft()
  }

  $: _saveDraft(draft)

  function initDraft (): void {
    draft = message != null ? messageToDraft(message) : getDraft(card._id)
    previewUrls.clear()
  }

  function _saveDraft (draft: MessageDraft): void {
    for (const link of draft.links) {
      previewUrls.set(link.url, true)
    }
    if (message === undefined) {
      saveDraft(card._id, draft)
    }
  }

  async function handleSubmit (event: CustomEvent<Markup>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    const markup = event.detail
    const filesToLoad = draft.files
    const linksToLoad = draft.links
    const urlsToLoad = Array.from(previewUrls.keys()).filter((it) => previewUrls.get(it) === true)

    draft = getEmptyDraft()
    previewUrls.clear()
    if (message === undefined) {
      removeDraft(card._id)
    }

    const markdown = toMarkdown(markup)

    if (onSubmit !== undefined) {
      await onSubmit(markdown, filesToLoad)
      return
    }

    if (message === undefined) {
      await createMessage(markdown, filesToLoad, linksToLoad, urlsToLoad)
      dispatch('sent')
    } else {
      await editMessage(message, markdown, filesToLoad, linksToLoad)
    }
  }

  async function createMessage (
    markdown: string,
    files: FileData[],
    links: LinkPreviewData[],
    urlsToLoad: string[]
  ): Promise<void> {
    const { id, created } = await communicationClient.createMessage(card._id, card._class, markdown)
    void client.update(card, {}, false, Date.now())
    void Promise.all(files.map((file) => communicationClient.createFile(card._id, id, created, file)))
    for (const link of links) {
      void communicationClient.createLinkPreview(card._id, id, created, link)
    }

    for (const url of urlsToLoad) {
      if (links.some((it) => it.url === url)) continue
      const fetchedData = linksData.get(url)
      if (fetchedData === null) continue
      const data = fetchedData ?? (await loadLinkPreviewData(url))
      if (data === undefined) continue
      void communicationClient.createLinkPreview(card._id, id, created, data)
    }
  }

  async function editMessage (
    message: Message,
    markdown: string,
    files: FileData[],
    links: LinkPreviewData[]
  ): Promise<void> {
    await communicationClient.updateMessage(card._id, message.id, message.created, markdown)

    for (const file of files) {
      if (message.files.some((it) => it.blobId === file.blobId)) continue
      await communicationClient.createFile(card._id, message.id, message.created, file)
    }

    for (const file of message.files) {
      if (files.some((it) => it.blobId === file.blobId)) continue
      void deleteFile(file.blobId)
      await communicationClient.removeFile(card._id, message.id, message.created, file.blobId)
    }

    for (const link of links) {
      if (message.links.some((it) => it.url === link.url)) continue
      await communicationClient.createLinkPreview(card._id, message.id, message.created, link)
    }

    dispatch('edited')
  }

  async function fileSelected (): Promise<void> {
    progress = true
    await tick()
    const list = inputElement.files
    if (list === null || list.length === 0) return
    const limiter = new RateLimiter(10)
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await limiter.add(() => addFile(file))
      }
    }
    await limiter.waitProcessing()
    inputElement.value = ''
    progress = false
  }

  async function addFile (file: File): Promise<void> {
    const uuid = await uploadFile(file)
    const meta = await getFileMetadata(file, uuid)

    draft = {
      ...draft,
      files: [
        ...draft.files,
        {
          blobId: uuid,
          type: file.type,
          filename: file.name,
          size: file.size,
          meta
        }
      ]
    }
  }

  const attachAction: TextInputAction = {
    label: uiNext.string.Attach,
    icon: IconPlus,
    action: () => {
      dispatch('focus')
      inputElement.click()
    },
    order: 1000
  }

  async function handleCancel (): Promise<void> {
    onCancel?.()
    for (const file of draft.files) {
      const fromMessage = message?.files.some((it) => it.blobId === file.blobId)
      if (!fromMessage) {
        void deleteFile(file.blobId)
      }
    }
    draft = getEmptyDraft()
  }

  async function loadFiles (evt: ClipboardEvent): Promise<void> {
    progress = true
    const files = (evt.clipboardData?.files ?? []) as File[]

    for (const file of files) {
      await addFile(file)
    }

    progress = false
  }

  function pasteAction (_: any, evt: ClipboardEvent): boolean {
    let target: HTMLElement | null = evt.target as HTMLElement
    let allowed = false
    while (target != null) {
      target = target.parentElement
      if (target === inputElement) {
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

    return allowed
  }

  async function fileDrop (e: DragEvent): Promise<void> {
    const list = e.dataTransfer?.files
    const limiter = new RateLimiter(10)

    if (list === undefined || list.length === 0) return
    progress = true
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await limiter.add(() => addFile(file))
      }
    }
    await limiter.waitProcessing()
    progress = false
  }

  function isValidUrl (s: string): boolean {
    let url: URL
    try {
      url = new URL(s)
    } catch {
      return false
    }
    return url.protocol.startsWith('http')
  }

  function updateLinkPreview (): void {
    if (refContainer == null) return
    const hrefs = refContainer.getElementsByTagName('a')
    const validUrls = Array.from(hrefs)
      .filter((it) => it.target === '_blank' && isValidUrl(it.href) && it.rel !== '')
      .map((it) => it.href)
    const newUrls = new Set<string>()
    const removedUrls = new Set<string>()

    for (const [url] of previewUrls.entries()) {
      const found = validUrls.find((it) => it === url)
      if (found === undefined) {
        removedUrls.add(url)
      }
    }
    for (const url of validUrls) {
      if (previewUrls.has(url)) continue
      previewUrls.set(url, true)
      newUrls.add(url)
    }

    for (const url of removedUrls) {
      previewUrls.delete(url)
      draft = {
        ...draft,
        links: draft.links.filter((it) => it.url !== url)
      }
    }
    if (newUrls.size > 0) {
      void loadLinks(Array.from(newUrls))
    }
  }

  async function loadLinks (urls: string[]): Promise<void> {
    const draftId = draft._id

    for (const url of urls) {
      try {
        const data = linksData.get(url) ?? (await loadLinkPreviewData(url))
        linksData.set(url, data ?? null)
        if (data === undefined) continue
        if (draftId !== draft._id || !previewUrls.has(url)) return
        draft = {
          ...draft,
          links: [...draft.links, data]
        }
      } catch (err: any) {
        void setPlatformStatus(unknownError(err))
      }
    }
  }

  async function onUpdate (event: CustomEvent<Markup>): Promise<void> {
    draft = {
      ...draft,
      content: event.detail
    }
    const visiblePreviewUrls = Array.from(previewUrls.keys()).filter((it) => previewUrls.get(it) === true)
    if (isLinkPreviewEnabled() && visiblePreviewUrls.length < maxLinkPreviewCount) {
      updateLinkPreview()
    }
    if (message !== undefined) return
    if (!isEmptyMarkup(draft.content)) {
      throttle.call(() => {
        const room = { objectId: card._id, objectClass: card._class }
        const typing: PresenceTyping = { person: me, lastTyping: Date.now() }
        updateMyPresence(room, { typing })
      })
    }
  }

  function isEmptyDraft (): boolean {
    return isEmptyMarkup(draft.content) && draft.files.length === 0
  }

  function hasChanges (files: FileData[], message: Message | undefined): boolean {
    if (isEmptyDraft()) return false
    if (message === undefined) return files.length > 0
    if (message.files.length !== files.length) return true
    if (message.files.some((it) => !files.some((f) => f.blobId === it.blobId))) return true

    return !areEqualMarkups(draft.content, toMarkup(message.content))
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={refContainer}
  class="flex-col no-print w-full"
  on:dragover|preventDefault={() => {}}
  on:dragleave={() => {}}
  on:drop|preventDefault|stopPropagation={fileDrop}
>
  <input
    bind:this={inputElement}
    disabled={inputElement == null}
    multiple
    type="file"
    name="file"
    id="file"
    style="display: none"
    on:change={fileSelected}
  />
  <TextInput
    content={draft.content}
    placeholder={title !== '' ? uiNext.string.MessageIn : undefined}
    placeholderParams={title !== '' ? { title } : undefined}
    loading={progress}
    hasChanges={hasChanges(draft.files, message)}
    actions={[...defaultMessageInputActions, attachAction]}
    on:submit={handleSubmit}
    on:update={onUpdate}
    onCancel={onCancel ? handleCancel : undefined}
    onPaste={pasteAction}
  >
    <div slot="header" class="header">
      {#if draft.files.length > 0 || draft.links.length > 0}
        <div class="flex-row-center files-list scroll-divider-color flex-gap-2 mt-2">
          {#each draft.files as file (file.blobId)}
            <div class="item flex">
              <AttachmentPresenter
                value={{
                  file: file.blobId,
                  name: file.filename,
                  type: file.type,
                  size: file.size,
                  metadata: file.meta
                }}
                showPreview
                removable
                on:remove={(result) => {
                  if (result !== undefined) {
                    draft = {
                      ...draft,
                      files: draft.files.filter((it) => it.blobId !== file.blobId)
                    }

                    if (!message?.files?.some((it) => it.blobId === file.blobId)) {
                      void deleteFile(file.blobId)
                    }
                  }
                }}
              />
            </div>
          {/each}
          {#if draft.links.length > 0 && draft.files.length > 0}
            <div class="divider" />
          {/if}

          {#each draft.links as link}
            <div class="item flex">
              <LinkPreviewCard
                value={{
                  url: link.url,
                  host: link.host,
                  title: link.title,
                  description: link.description,
                  hostname: link.hostname,
                  image: link.image?.url,
                  imageWidth: link.image?.width,
                  imageHeight: link.image?.height,
                  icon: link.favicon
                }}
                on:remove={(event) => {
                  const result = event.detail
                  if (result !== undefined) {
                    previewUrls.set(result.url, false)
                    draft = {
                      ...draft,
                      links: draft.links.filter((it) => it.url !== result.url)
                    }
                  }
                }}
              />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </TextInput>
</div>

{#if message === undefined}
  <TypingPresenter cardId={card._id} />
{/if}

<style lang="scss">
  .header {
    overflow: hidden;
    display: flex;
    min-width: 0;
    width: 100%;
  }

  .divider {
    height: 100%;
    border-left: 1px solid var(--theme-divider-color);
  }
  .files-list {
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    gap: 0.5rem;
  }
</style>
