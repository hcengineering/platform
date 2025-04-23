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
  import { IntlString } from '@hcengineering/platform'
  import { Markup, RateLimiter } from '@hcengineering/core'
  import { tick, createEventDispatcher, onDestroy } from 'svelte'
  import { uploadFile, deleteFile, getCommunicationClient } from '@hcengineering/presentation'
  import { CardID, CardType, Message } from '@hcengineering/communication-types'
  import { AttachmentPresenter } from '@hcengineering/attachment-resources'
  import { isEmptyMarkup } from '@hcengineering/text'
  import { updateMyPresence } from '@hcengineering/presence-resources'
  import { ThrottledCaller } from '@hcengineering/ui'
  import { getCurrentEmployee } from '@hcengineering/contact'

  import TextInput from '../TextInput.svelte'
  import { defaultMessageInputActions, toMarkdown } from '../../utils'
  import uiNext from '../../plugin'
  import IconPlus from '../icons/IconPlus.svelte'
  import { type TextInputAction, UploadedFile, type PresenceTyping } from '../../types'
  import TypingPresenter from '../TypingPresenter.svelte'

  export let cardId: CardID | undefined = undefined
  export let cardType: CardType | undefined = undefined
  export let message: Message | undefined = undefined
  export let content: Markup | undefined = undefined
  export let placeholder: IntlString | undefined = undefined
  export let placeholderParams: Record<string, any> = {}
  export let onCancel: (() => void) | undefined = undefined
  export let onSubmit: ((markdown: string, files: UploadedFile[]) => Promise<void>) | undefined = undefined

  const throttle = new ThrottledCaller(500)
  const dispatch = createEventDispatcher()
  const communicationClient = getCommunicationClient()
  const me = getCurrentEmployee()

  let files: UploadedFile[] = []
  let inputElement: HTMLInputElement

  let progress = false

  async function handleSubmit (event: CustomEvent<Markup>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    const markup = event.detail
    const filesToLoad = files

    files = []

    const markdown = toMarkdown(markup)

    if (onSubmit !== undefined) {
      await onSubmit(markdown, filesToLoad)
      return
    }

    if (message === undefined) {
      await createMessage(markdown, filesToLoad)
    } else {
      await editMessage(message, markdown, filesToLoad)
    }
  }

  async function createMessage (markdown: string, files: UploadedFile[]): Promise<void> {
    if (cardId === undefined || cardType === undefined) return
    const { id, created } = await communicationClient.createMessage(cardId, cardType, markdown)

    for (const file of files) {
      await communicationClient.createFile(cardId, id, created, file.blobId, file.type, file.filename, file.size)
    }
  }

  async function editMessage (message: Message, markdown: string, files: UploadedFile[]): Promise<void> {
    if (cardId === undefined) return
    await communicationClient.updateMessage(cardId, message.id, message.created, markdown)

    for (const file of files) {
      await communicationClient.createFile(
        cardId,
        message.id,
        message.created,
        file.blobId,
        file.type,
        file.filename,
        file.size
      )
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

    files.push({
      blobId: uuid,
      type: file.type,
      filename: file.name,
      size: file.size
    })
    files = files
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
  onDestroy(() => {
    for (const file of files) {
      void deleteFile(file.blobId)
    }
  })

  async function handleCancel (): Promise<void> {
    onCancel?.()
    for (const file of files) {
      void deleteFile(file.blobId)
    }
    files = []
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

  async function onUpdate (event: CustomEvent<Markup>): Promise<void> {
    if (cardId === undefined || cardType === undefined) return
    if (message !== undefined) return
    const markup = event.detail
    if (!isEmptyMarkup(markup)) {
      throttle.call(() => {
        const room = { objectId: cardId, objectClass: cardType }
        const typing: PresenceTyping = { person: me, lastTyping: Date.now() }
        updateMyPresence(room, { typing })
      })
    }
  }
</script>

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
    {content}
    {placeholder}
    {placeholderParams}
    loading={progress}
    hasNonTextContent={files.length > 0}
    actions={[...defaultMessageInputActions, attachAction]}
    on:submit={handleSubmit}
    on:update={onUpdate}
    onCancel={onCancel ? handleCancel : undefined}
    onPaste={pasteAction}
  >
    <div slot="header" class="header">
      {#if files.length > 0}
        <div class="flex-row-center files-list scroll-divider-color flex-gap-2">
          {#each files as file (file.blobId)}
            <div class="item flex">
              <AttachmentPresenter
                value={{
                  file: file.blobId,
                  name: file.filename,
                  type: file.type,
                  size: file.size
                }}
                removable
                on:remove={(result) => {
                  if (result !== undefined) {
                    files = files.filter((it) => it.blobId !== file.blobId)
                    void deleteFile(file.blobId)
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

{#if cardId && message === undefined}
  <TypingPresenter {cardId} />
{/if}

<style lang="scss">
  .header {
    overflow: hidden;
    display: flex;
    min-width: 0;
    width: 100%;
  }

  .files-list {
    padding: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--theme-divider-color);
    }
  }
</style>
