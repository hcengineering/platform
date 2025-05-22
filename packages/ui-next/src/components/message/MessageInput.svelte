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
    getFileMetadata
  } from '@hcengineering/presentation'
  import { Message, MessageID } from '@hcengineering/communication-types'
  import { AttachmentPresenter } from '@hcengineering/attachment-resources'
  import { areEqualMarkups, isEmptyMarkup, EmptyMarkup } from '@hcengineering/text'
  import { updateMyPresence } from '@hcengineering/presence-resources'
  import { ThrottledCaller } from '@hcengineering/ui'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { Card } from '@hcengineering/card'

  import TextInput from '../TextInput.svelte'
  import { defaultMessageInputActions, toMarkdown } from '../../utils'
  import uiNext from '../../plugin'
  import IconPlus from '../icons/IconPlus.svelte'
  import { type TextInputAction, UploadedFile, type PresenceTyping, MessageDraft } from '../../types'
  import TypingPresenter from '../TypingPresenter.svelte'
  import { getDraft, messageToDraft, saveDraft, getEmptyDraft, removeDraft } from '../../draft'

  export let card: Card
  export let message: Message | undefined = undefined
  export let title: string = ''
  export let onCancel: (() => void) | undefined = undefined
  export let onSubmit: ((markdown: string, files: UploadedFile[]) => Promise<void>) | undefined = undefined

  const throttle = new ThrottledCaller(500)
  const dispatch = createEventDispatcher()
  const communicationClient = getCommunicationClient()
  const client = getClient()
  const me = getCurrentEmployee()

  let prevCard: Ref<Card> | undefined = card._id
  let prevMessage: MessageID | undefined = message?.id
  let draft: MessageDraft = message != null ? messageToDraft(message) : getDraft(card._id)

  let inputElement: HTMLInputElement

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
  }

  function _saveDraft (draft: MessageDraft): void {
    if (message === undefined) {
      saveDraft(card._id, draft)
    }
  }

  async function handleSubmit (event: CustomEvent<Markup>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    const markup = event.detail
    const filesToLoad = draft.files

    draft = getEmptyDraft()
    if (message === undefined) {
      removeDraft(card._id)
    }

    const markdown = toMarkdown(markup)

    if (onSubmit !== undefined) {
      await onSubmit(markdown, filesToLoad)
      return
    }

    if (message === undefined) {
      await createMessage(markdown, filesToLoad)
      dispatch('sent')
    } else {
      await editMessage(message, markdown, filesToLoad)
    }
  }

  async function createMessage (markdown: string, files: UploadedFile[]): Promise<void> {
    const { id, created } = await communicationClient.createMessage(card._id, card._class, markdown)

    for (const file of files) {
      await communicationClient.createFile(
        card._id,
        id,
        created,
        file.blobId,
        file.type,
        file.filename,
        file.size,
        file.metadata
      )
    }
    await client.update(card, {}, false, Date.now())
  }

  async function editMessage (message: Message, markdown: string, files: UploadedFile[]): Promise<void> {
    await communicationClient.updateMessage(card._id, message.id, message.created, markdown)

    for (const file of files) {
      if (message.files.find((it) => it.blobId === file.blobId)) continue
      await communicationClient.createFile(
        card._id,
        message.id,
        message.created,
        file.blobId,
        file.type,
        file.filename,
        file.size,
        file.metadata
      )
    }

    for (const file of message.files) {
      if (draft.files.find((it) => it.blobId === file.blobId)) continue
      void deleteFile(file.blobId)
      await communicationClient.removeFile(card._id, message.id, message.created, file.blobId)
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
    const metadata = await getFileMetadata(file, uuid)

    draft = {
      ...draft,
      files: [
        ...draft.files,
        {
          blobId: uuid,
          type: file.type,
          filename: file.name,
          size: file.size,
          metadata
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

  let newMarkup: Markup | undefined = undefined
  async function onUpdate (event: CustomEvent<Markup>): Promise<void> {
    draft = {
      ...draft,
      content: event.detail
    }
    if (message !== undefined) return
    newMarkup = event.detail
    if (!isEmptyMarkup(newMarkup)) {
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

  function hasChanges (files: UploadedFile[], message: Message | undefined): boolean {
    if (isEmptyDraft()) return false
    if (message === undefined) return files.length > 0
    if (message.files.length !== files.length) return true
    if (message.files.some((it) => !files.some((f) => f.blobId === it.blobId))) return true
    if (newMarkup === undefined || draft.content === undefined) return false

    return !areEqualMarkups(draft.content, newMarkup ?? EmptyMarkup)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
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
      {#if draft.files.length > 0}
        <div class="flex-row-center files-list scroll-divider-color flex-gap-2 mt-2">
          {#each draft.files as file (file.blobId)}
            <div class="item flex">
              <AttachmentPresenter
                value={{
                  file: file.blobId,
                  name: file.filename,
                  type: file.type,
                  size: file.size,
                  metadata: file.metadata
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

  .files-list {
    overflow-x: auto;
    overflow-y: hidden;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--theme-divider-color);
    }
  }
</style>
