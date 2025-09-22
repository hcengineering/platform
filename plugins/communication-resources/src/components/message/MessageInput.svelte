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
  import { Markup, RateLimiter, Ref, generateId } from '@hcengineering/core'
  import { tick, createEventDispatcher } from 'svelte'
  import {
    uploadFile,
    deleteFile,
    getCommunicationClient,
    getClient,
    getFileMetadata,
    isLinkPreviewEnabled
  } from '@hcengineering/presentation'
  import {
    Message,
    MessageID,
    LinkPreviewParams,
    BlobParams,
    AttachmentID,
    linkPreviewType,
    BlobAttachment,
    AppletParams
  } from '@hcengineering/communication-types'
  import { AttachmentPresenter, LinkPreviewCard } from '@hcengineering/attachment-resources'
  import { areEqualMarkups, isEmptyMarkup } from '@hcengineering/text'
  import { clearTyping, setTyping } from '@hcengineering/presence-resources'
  import { FileUploadCallbackParams, getUploadHandlers, UploadHandlerDefinition } from '@hcengineering/uploader'
  import { Component, showPopup, ThrottledCaller } from '@hcengineering/ui'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { Card } from '@hcengineering/card'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { isAppletAttachment, isBlobAttachment, isLinkPreviewAttachment } from '@hcengineering/communication-shared'

  import TextInput from '../TextInput.svelte'
  import IconAttach from '../icons/Attach.svelte'
  import {
    defaultMessageInputActions,
    toMarkdown,
    toMarkup,
    loadLinkPreviewParams,
    isCardAllowedForCommunications,
    showForbidden
  } from '../../utils'
  import communication from '../../plugin'
  import { type TextInputAction, MessageDraft, AppletDraft } from '../../types'
  import TypingPresenter from '../TypingPresenter.svelte'
  import { getDraft, messageToDraft, saveDraft, getEmptyDraft, removeDraft } from '../../draft'

  export let card: Card
  export let message: Message | undefined = undefined
  export let title: string = ''
  export let onCancel: (() => void) | undefined = undefined

  const throttle = new ThrottledCaller(500)
  const dispatch = createEventDispatcher()
  const communicationClient = getCommunicationClient()
  const client = getClient()
  const me = getCurrentEmployee()

  const maxLinkPreviewCount = 4
  const previewUrls = new Map<string, boolean>()
  const linksData = new Map<string, LinkPreviewParams | null>()

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

    if (!isCardAllowedForCommunications(card)) {
      await showForbidden()
      return
    }

    const markup = event.detail
    const blobsToLoad = draft.blobs
    const linksToLoad = draft.links
    const appletsToLoad = draft.applets
    const urlsToLoad = Array.from(previewUrls.keys()).filter((it) => previewUrls.get(it) === true)

    draft = getEmptyDraft()
    previewUrls.clear()
    if (message === undefined) {
      removeDraft(card._id)
    }

    const markdown = toMarkdown(markup)

    if (message === undefined) {
      await createMessage(markdown, blobsToLoad, linksToLoad, urlsToLoad, appletsToLoad)
      dispatch('sent')
    } else {
      await editMessage(message, markdown, blobsToLoad, linksToLoad, appletsToLoad)
    }

    void clearTyping(me, card._id)
  }

  async function attachApplets (messageId: MessageID, appletDrafts: AppletDraft[]): Promise<void> {
    if (appletDrafts.length === 0) return
    const toAttach: AppletDraft[] = []
    for (const appletDraft of appletDrafts) {
      try {
        const ap = applets.find((it) => it._id === appletDraft.appletId)
        if (ap?.createFn == null) {
          toAttach.push(appletDraft)
          continue
        }
        const r = await getResource(ap.createFn)
        await r(card, messageId, appletDraft.params)
        toAttach.push(appletDraft)
      } catch (err) {
        console.error(err)
      }
    }

    if (toAttach.length > 0) {
      void communicationClient.attachmentPatch<AppletParams>(card._id, messageId, {
        add: toAttach.map((it) => ({
          type: it.type,
          params: it.params
        }))
      })
    }
  }

  async function createMessage (
    markdown: string,
    blobs: BlobParams[],
    links: LinkPreviewParams[],
    urlsToLoad: string[],
    appletDrafts: AppletDraft[]
  ): Promise<void> {
    const { messageId } = await communicationClient.createMessage(card._id, card._class, markdown)
    void client.update(card, {}, false, Date.now())

    void attachApplets(messageId, appletDrafts)

    if (blobs.length > 0) {
      void communicationClient.attachmentPatch<BlobParams>(card._id, messageId, {
        add: blobs.map((it) => ({
          id: it.blobId as any as AttachmentID,
          type: it.mimeType,
          params: it
        }))
      })
    }

    if (links.length > 0) {
      void communicationClient.attachmentPatch<LinkPreviewParams>(card._id, messageId, {
        add: links.map((it) => ({
          type: linkPreviewType,
          params: it
        }))
      })
    }

    for (const url of urlsToLoad) {
      if (links.some((it) => it.url === url)) continue
      const fetchedData = linksData.get(url)
      if (fetchedData === null) continue
      const params = fetchedData ?? (await loadLinkPreviewParams(url))
      if (params === undefined) continue
      void communicationClient.attachmentPatch<LinkPreviewParams>(card._id, messageId, {
        add: [
          {
            type: linkPreviewType,
            params
          }
        ]
      })
    }
  }

  async function editMessage (
    message: Message,
    markdown: string,
    blobs: BlobParams[],
    links: LinkPreviewParams[],
    appletDrafts: AppletDraft[]
  ): Promise<void> {
    await communicationClient.updateMessage(card._id, message.id, markdown)

    const attachBlobs = blobs.filter(
      (b) => !message.attachments.some((it) => isBlobAttachment(it) && it.params.blobId === b.blobId)
    )

    void attachApplets(
      message.id,
      appletDrafts.filter((a) => !message.attachments.some((it) => it.id === a.id))
    )

    if (attachBlobs.length > 0) {
      void communicationClient.attachmentPatch<BlobParams>(card._id, message.id, {
        add: attachBlobs.map((it) => ({
          id: it.blobId as any as AttachmentID,
          type: it.mimeType,
          params: it
        }))
      })
    }

    const detachBlobs = message.attachments.filter(
      (it) => isBlobAttachment(it) && !blobs.some((b) => b.blobId === it.params.blobId)
    ) as BlobAttachment[]
    if (detachBlobs.length > 0) {
      detachBlobs.forEach((it) => {
        void deleteFile(it.params.blobId)
      })
      void communicationClient.attachmentPatch(card._id, message.id, {
        remove: detachBlobs.map((it) => it.id)
      })
    }

    const detachApplets = message.attachments.filter(
      (it) => isAppletAttachment(it) && !appletDrafts.some((a) => a.id === it.id)
    )

    if (detachApplets.length > 0) {
      void communicationClient.attachmentPatch(card._id, message.id, {
        remove: detachApplets.map((it) => it.id)
      })
    }

    const attachLinks = links.filter(
      (l) => !message.attachments.some((it) => isLinkPreviewAttachment(it) && it.params.url === l.url)
    )

    void communicationClient.attachmentPatch(card._id, message.id, {
      add: attachLinks.map((it) => ({
        type: linkPreviewType,
        params: it
      }))
    })

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
    const metadata = await getFileMetadata(file, uuid)

    const blob = {
      blobId: uuid,
      mimeType: file.type,
      fileName: file.name,
      size: file.size,
      metadata
    }

    draft = {
      ...draft,
      blobs: [...draft.blobs, blob]
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
    for (const blob of draft.blobs) {
      const fromMessage =
        message?.attachments.some((it) => isBlobAttachment(it) && it.params.blobId === blob.blobId) ?? false
      if (!fromMessage) {
        void deleteFile(blob.blobId)
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
        const data = linksData.get(url) ?? (await loadLinkPreviewParams(url))
        linksData.set(url, data ?? null)
        if (data === undefined || !previewUrls.has(url)) continue
        if (draftId !== draft._id) return
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
        void setTyping(me, card._id)
      })
    }
  }

  function isEmptyDraft (): boolean {
    return isEmptyMarkup(draft.content) && draft.blobs.length === 0 && draft.applets.length === 0
  }

  function hasChanges (blobs: BlobParams[], message: Message | undefined, appletDrafts: any[]): boolean {
    if (isEmptyDraft()) return false
    if (message === undefined) return blobs.length > 0 || !isEmptyMarkup(draft.content) || appletDrafts.length > 0
    const messageBlobs = message?.attachments.filter(isBlobAttachment) ?? []
    const messageApplets = message?.attachments.filter(isAppletAttachment) ?? []

    if (messageBlobs.length !== blobs.length) return true
    if (messageBlobs.some((it) => !blobs.some((b) => b.blobId === it.params.blobId))) return true
    if (messageApplets.length !== appletDrafts.length) return true
    if (messageApplets.some((it) => !appletDrafts.some((a) => a.id === it.id))) return true

    return !areEqualMarkups(draft.content, toMarkup(message.content))
  }

  const applets = client.getModel().findAllSync(communication.class.Applet, {})
  const appletActions: TextInputAction[] = applets.map((applet) => {
    return {
      label: applet.label,
      icon: applet.icon,
      action: () => {
        showPopup(applet.createComponent, { applet }, 'center', (result) => {
          if (result != null) {
            draft = {
              ...draft,
              applets: [...draft.applets, { id: generateId(), type: applet.type, appletId: applet._id, params: result }]
            }
          }
        })
      },
      order: 99999
    }
  })

  async function uploadWith (uploader: UploadHandlerDefinition): Promise<void> {
    const cardId = card._id

    const onFileUploaded = async ({ uuid, name, file, size, metadata }: FileUploadCallbackParams): Promise<void> => {
      const blob = {
        blobId: uuid,
        mimeType: file.type,
        fileName: name,
        size: size ?? file.size,
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
        draft = {
          ...draft,
          blobs: [...draft.blobs, blob]
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
    placeholder={title !== '' ? communication.string.MessageIn : undefined}
    placeholderParams={title !== '' ? { title } : undefined}
    loading={progress}
    hasChanges={hasChanges(draft.blobs, message, draft.applets)}
    actions={[...defaultMessageInputActions, attachAction, ...uploadActions, ...appletActions]}
    on:submit={handleSubmit}
    on:update={onUpdate}
    onCancel={onCancel ? handleCancel : undefined}
    onPaste={pasteAction}
  >
    <div slot="header" class="header">
      {#if draft.blobs.length > 0 || draft.links.length > 0 || draft.applets.length > 0}
        <div class="flex-row-center files-list scroll-divider-color flex-gap-2 mt-2">
          {#each draft.applets as appletDraft}
            {@const applet = applets.find((it) => it._id === appletDraft.appletId)}
            {#if applet}
              <Component
                is={applet.previewComponent}
                props={{
                  applet,
                  params: appletDraft.params,
                  editing: message !== undefined && message.attachments.some((it) => it.id === appletDraft.id)
                }}
                on:change={() => {
                  showPopup(applet.createComponent, { applet, params: appletDraft.params }, 'center', (result) => {
                    if (result != null) {
                      draft = {
                        ...draft,
                        applets: draft.applets.map((it) => {
                          if (it.id === appletDraft.id) {
                            return { ...it, params: result }
                          }
                          return it
                        })
                      }
                    }
                  })
                }}
                on:delete={() => {
                  draft = {
                    ...draft,
                    applets: draft.applets.filter((it) => it.id !== appletDraft.id)
                  }
                }}
              />
            {/if}
          {/each}
          {#each draft.blobs as attachedBlob (attachedBlob.blobId)}
            <div class="item flex">
              <AttachmentPresenter
                value={{
                  file: attachedBlob.blobId,
                  name: attachedBlob.fileName,
                  type: attachedBlob.mimeType,
                  size: attachedBlob.size,
                  metadata: attachedBlob.metadata
                }}
                showPreview
                removable
                on:remove={(result) => {
                  if (result !== undefined) {
                    draft = {
                      ...draft,
                      blobs: draft.blobs.filter((it) => it.blobId !== attachedBlob.blobId)
                    }

                    if (
                      !message?.attachments?.some(
                        (it) => isBlobAttachment(it) && it.params.blobId === attachedBlob.blobId
                      )
                    ) {
                      void deleteFile(attachedBlob.blobId)
                    }
                  }
                }}
              />
            </div>
          {/each}
          {#if draft.links.length > 0 && draft.blobs.length > 0}
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
                  hostname: link.siteName,
                  image: link.previewImage?.url,
                  imageWidth: link.previewImage?.width,
                  imageHeight: link.previewImage?.height,
                  icon: link.iconUrl
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
