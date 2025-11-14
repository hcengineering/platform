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
  import { Card } from '@hcengineering/card'
  import { isAppletAttachment, isBlobAttachment } from '@hcengineering/communication-shared'
  import { BlobParams, LinkPreviewParams, Message, MessageID, BlobID } from '@hcengineering/communication-types'
  import { generateId, getCurrentAccount, Markup, RateLimiter, Ref } from '@hcengineering/core'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { clearTyping, setTyping } from '@hcengineering/presence-resources'
  import { deleteFile, getClient, isLinkPreviewEnabled, uploadFile } from '@hcengineering/presentation'
  import { areEqualMarkups, isEmptyMarkup } from '@hcengineering/text'
  import { showPopup, ThrottledCaller } from '@hcengineering/ui'
  import { FileUploadCallbackParams, getUploadHandlers, UploadHandlerDefinition } from '@hcengineering/uploader'
  import { createEventDispatcher, tick } from 'svelte'

  import { getDraft, getEmptyDraft, messageToDraft, removeDraft, saveDraft } from '../../draft'
  import communication from '../../plugin'
  import { messageEditingStore } from '../../stores'
  import { type TextInputAction, AppletDraft, MessageDraft } from '../../types'
  import {
    defaultMessageInputActions,
    isCardAllowedForCommunications,
    loadLinkPreviewParams,
    showForbidden,
    toMarkdown,
    toMarkup
  } from '../../utils'
  import TextInput from '../TextInput.svelte'
  import TypingPresenter from '../TypingPresenter.svelte'
  import IconAttach from '../icons/Attach.svelte'
  import AttachmentsHeader from '../input/AttachmentsHeader.svelte'
  import { createMessage, updateMessage } from '../../actions'

  export let card: Card
  export let message: Message | undefined = undefined
  export let onCancel: (() => void) | undefined = undefined

  const throttle = new ThrottledCaller(500)
  const dispatch = createEventDispatcher()
  const client = getClient()
  const acc = getCurrentAccount()

  const maxLinkPreviewCount = 5
  const previewUrls = new Map<string, boolean>()
  const linksData = new Map<string, LinkPreviewParams | null>()

  let prevCard: Ref<Card> | undefined = card._id
  let prevMessage: MessageID | undefined = message?.id

  let markup = message != null ? messageToDraft(message).content : getDraft(card._id).content
  let attachmentsDraft: Omit<MessageDraft, 'content'> = message != null ? messageToDraft(message) : getDraft(card._id)

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

  $: _saveDraft(markup, attachmentsDraft)

  function initDraft (): void {
    const draft = message != null ? messageToDraft(message) : getDraft(card._id)
    attachmentsDraft = draft
    markup = draft.content
    previewUrls.clear()
  }

  function _saveDraft (markup: Markup, draft: Omit<MessageDraft, 'content'>): void {
    for (const link of draft.links) {
      previewUrls.set(link.url, true)
    }
    if (message === undefined) {
      saveDraft(card._id, { ...draft, content: markup })
    }
  }

  async function handleSubmit (event: CustomEvent<Markup>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    if (!isCardAllowedForCommunications(card)) {
      await showForbidden()
      return
    }

    const markup = event.detail
    const blobsToLoad = attachmentsDraft.blobs
    const linksToLoad = attachmentsDraft.links
    const appletsToLoad = attachmentsDraft.applets
    const urlsToLoad = Array.from(previewUrls.keys()).filter((it) => previewUrls.get(it) === true)

    attachmentsDraft = getEmptyDraft()
    previewUrls.clear()
    if (message === undefined) {
      removeDraft(card._id)
    }

    const markdown = toMarkdown(markup)

    if (message === undefined) {
      await createMessage(card, markdown, blobsToLoad, appletsToLoad, applets, linksToLoad, urlsToLoad, linksData)
      dispatch('sent')
    } else {
      await updateMessage(card, message, markdown, blobsToLoad, appletsToLoad, applets, linksToLoad)
      dispatch('edited')
    }

    void clearTyping(acc.primarySocialId, card._id)
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
    const { uuid, metadata } = await uploadFile(file)

    const blob = {
      blobId: uuid,
      mimeType: file.type,
      fileName: file.name,
      size: file.size,
      metadata
    }

    attachmentsDraft = {
      ...attachmentsDraft,
      blobs: [...attachmentsDraft.blobs, blob]
    }
  }

  const attachAction: TextInputAction = {
    label: communication.string.Attach,
    icon: IconAttach,
    action: () => {
      dispatch('focus')
      inputElement.click()
    },
    order: 1000
  }

  async function handleCancel (): Promise<void> {
    onCancel?.()
    for (const blob of attachmentsDraft.blobs) {
      const fromMessage =
        message?.attachments.some((it) => isBlobAttachment(it) && it.params.blobId === blob.blobId) ?? false
      if (!fromMessage) {
        void deleteFile(blob.blobId)
      }
    }
    attachmentsDraft = getEmptyDraft()
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
    const hasFiles = Array.from(evt.clipboardData?.items ?? []).some((i) => i.kind === 'file')
    while (target != null) {
      target = target.parentElement
      if ((hasFiles && target === refContainer) || target === inputElement) {
        allowed = true
      }
    }
    if (!allowed) {
      return false
    }

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
      attachmentsDraft = {
        ...attachmentsDraft,
        links: attachmentsDraft.links.filter((it) => it.url !== url)
      }
    }
    if (newUrls.size > 0) {
      void loadLinks(Array.from(newUrls))
    }
  }

  async function loadLinks (urls: string[]): Promise<void> {
    const draftId = attachmentsDraft._id

    for (const url of urls) {
      try {
        const data = linksData.get(url) ?? (await loadLinkPreviewParams(url))
        linksData.set(url, data ?? null)
        if (data === undefined || !previewUrls.has(url)) continue
        if (draftId !== attachmentsDraft._id) return
        attachmentsDraft = {
          ...attachmentsDraft,
          links: [...attachmentsDraft.links, data]
        }
      } catch (err: any) {
        void setPlatformStatus(unknownError(err))
      }
    }
  }

  async function onUpdate (event: CustomEvent<Markup>): Promise<void> {
    markup = event.detail
    const visiblePreviewUrls = Array.from(previewUrls.keys()).filter((it) => previewUrls.get(it) === true)
    if (isLinkPreviewEnabled() && visiblePreviewUrls.length < maxLinkPreviewCount) {
      updateLinkPreview()
    }
    if (message !== undefined) return
    if (!isEmptyMarkup(markup)) {
      throttle.call(() => {
        void setTyping(acc.primarySocialId, card.peerId ? `peer:${card.peerId}` : card._id)
      })
    }
  }

  function isEmptyDraft (): boolean {
    return isEmptyMarkup(markup) && attachmentsDraft.blobs.length === 0 && attachmentsDraft.applets.length === 0
  }

  function hasChanges (blobs: BlobParams[], message: Message | undefined, appletDrafts: AppletDraft[]): boolean {
    if (isEmptyDraft()) return false
    if (message === undefined) return blobs.length > 0 || !isEmptyMarkup(markup) || appletDrafts.length > 0
    const messageBlobs = message?.attachments.filter(isBlobAttachment) ?? []
    const messageApplets = message?.attachments.filter(isAppletAttachment) ?? []

    if (messageBlobs.length !== blobs.length) return true
    if (messageBlobs.some((it) => !blobs.some((b) => b.blobId === it.params.blobId))) return true
    if (messageApplets.length !== appletDrafts.length) return true
    if (messageApplets.some((it) => !appletDrafts.some((a) => a.id === it.id))) return true

    return !areEqualMarkups(markup, toMarkup(message.content))
  }

  const applets = client.getModel().findAllSync(communication.class.Applet, {})
  const appletActions: TextInputAction[] = applets.map((applet) => {
    return {
      label: applet.label,
      icon: applet.icon,
      action: () => {
        showPopup(applet.createComponent, { applet }, 'center', (result) => {
          if (result != null) {
            attachmentsDraft = {
              ...attachmentsDraft,
              applets: [
                ...attachmentsDraft.applets,
                { id: generateId(), mimeType: applet.type, appletId: applet._id, params: result }
              ]
            }
          }
        })
      },
      order: 99999
    }
  })

  async function uploadWith (uploader: UploadHandlerDefinition): Promise<void> {
    const cardId = card._id

    const onFileUploaded = async ({ uuid, name, file, metadata }: FileUploadCallbackParams): Promise<void> => {
      const blob = {
        blobId: uuid,
        mimeType: file.type,
        fileName: name,
        size: file.size,
        metadata
      }

      // We are probably in different card, update the draft in storage
      let newDraft = getDraft(cardId)
      newDraft = {
        ...newDraft,
        blobs: [...newDraft.blobs, blob]
      }
      saveDraft(cardId, newDraft, true)

      // In case we are in the same card, update the draft in memory
      if (cardId === card._id) {
        attachmentsDraft = {
          ...attachmentsDraft,
          blobs: [...attachmentsDraft.blobs, blob]
        }
      }
    }

    const upload = await getResource(uploader.handler)
    const target = { objectId: card._id, objectClass: card._class }
    await upload({ onFileUploaded, target })
  }

  let uploadActionIndex = 1000
  const uploadHandlers = getUploadHandlers(client, { category: 'media' })
  const uploadActions = uploadHandlers.map((handler) => ({
    order: handler.order ?? uploadActionIndex++,
    label: handler.label,
    icon: handler.icon,
    action: () => {
      void uploadWith(handler)
    }
  }))

  function handleKeyDown (_: any, event: KeyboardEvent): boolean {
    if (event.key === 'ArrowUp') {
      if (isEmptyDraft() && $messageEditingStore === undefined) {
        dispatch('arrowUp')
      }
    }
    if (event.key === 'Escape') {
      if ($messageEditingStore !== undefined) {
        messageEditingStore.set(undefined)
      }
    }
    return false
  }

  function onChangeApplet (event: CustomEvent<AppletDraft>): void {
    attachmentsDraft = {
      ...attachmentsDraft,
      applets: attachmentsDraft.applets.map((it) => (it.id === event.detail.id ? event.detail : it))
    }
  }

  function onDeleteApplet (event: CustomEvent<string>): void {
    attachmentsDraft = {
      ...attachmentsDraft,
      applets: attachmentsDraft.applets.filter((it) => it.id !== event.detail)
    }
  }

  function onDeleteBlob (event: CustomEvent<BlobID>): void {
    const blobId = event.detail
    attachmentsDraft = {
      ...attachmentsDraft,
      blobs: attachmentsDraft.blobs.filter((it) => it.blobId !== blobId)
    }

    if (message == null || !message.attachments.some((it) => isBlobAttachment(it) && it.params.blobId === blobId)) {
      void deleteFile(blobId)
    }
  }

  function onDeleteLink (event: CustomEvent<string>): void {
    attachmentsDraft = {
      ...attachmentsDraft,
      links: attachmentsDraft.links.filter((it) => it.url !== event.detail)
    }
    previewUrls.set(event.detail, false)
  }

  $: blobs = attachmentsDraft.blobs
  $: ch = hasChanges(blobs, undefined, [])
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
    content={markup}
    placeholder={message == null ? communication.string.WriteMessageEllipsis : communication.string.EditMessageEllipsis}
    loading={progress}
    hasChanges={ch}
    actions={[...defaultMessageInputActions, attachAction, ...uploadActions, ...appletActions]}
    on:submit={handleSubmit}
    on:update={onUpdate}
    autofocus="end"
    onCancel={onCancel ? handleCancel : undefined}
    onPaste={pasteAction}
    onKeyDown={handleKeyDown}
  >
    <div slot="header" class="header">
      {#if attachmentsDraft.blobs.length > 0 || attachmentsDraft.links.length > 0 || attachmentsDraft.applets.length > 0 || progress}
        <AttachmentsHeader
          blobs={attachmentsDraft.blobs}
          links={attachmentsDraft.links}
          applets={attachmentsDraft.applets}
          currentAttachments={message?.attachments ?? []}
          {progress}
          on:change-applet={onChangeApplet}
          on:delete-applet={onDeleteApplet}
          on:delete-blob={onDeleteBlob}
          on:delete-link={onDeleteLink}
        />
      {/if}
    </div>
  </TextInput>
</div>

{#if message === undefined}
  <TypingPresenter cardId={card._id} peerId={card.peerId} />
{/if}

<style lang="scss">
  .header {
    overflow: hidden;
    display: flex;
    min-width: 0;
    width: 100%;
  }
</style>
