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
  import attachmentP, { Attachment } from '@hcengineering/attachment'
  import { AttachmentPresenter } from '@hcengineering/attachment-resources'
  import contact, { Channel, Contact, getName } from '@hcengineering/contact'
  import { Data, generateId } from '@hcengineering/core'
  import { NewMessage, SharedMessage } from '@hcengineering/gmail'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import templates, { TemplateDataProvider } from '@hcengineering/templates'
  import { StyledTextEditor } from '@hcengineering/text-editor'
  import { Button, EditBox, IconArrowLeft, IconAttachment, Label, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import plugin from '../plugin'

  export let object: Contact
  export let channel: Channel
  export let currentMessage: SharedMessage | undefined
  export let selectedIntegration: Integration
  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()
  let objectId = generateId()

  let copy: string = ''

  const obj: Data<NewMessage> = {
    subject: currentMessage ? 'RE: ' + currentMessage.subject : '',
    content: '',
    to: channel.value,
    replyTo: currentMessage?.messageId,
    status: 'new'
  }

  let templateProvider: TemplateDataProvider | undefined

  getResource(templates.function.GetTemplateDataProvider).then((p) => {
    templateProvider = p()
  })

  onDestroy(() => {
    templateProvider?.destroy()
  })

  $: templateProvider && templateProvider.set(contact.class.Contact, object)

  async function sendMsg () {
    await client.createDoc(
      plugin.class.NewMessage,
      plugin.space.Gmail,
      {
        ...obj,
        attachments: attachments.length,
        from: selectedIntegration.createdBy,
        copy: copy
          .split(',')
          .map((m) => m.trim())
          .filter((m) => m.length)
      },
      objectId
    )
    await notificationClient.forceRead(channel._id, channel._class)
    objectId = generateId()
    dispatch('close')
  }

  const dispatch = createEventDispatcher()
  let inputFile: HTMLInputElement

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

  async function createAttachment (file: File) {
    try {
      const uploadFile = await getResource(attachmentP.helper.UploadFile)
      const uuid = await uploadFile(file)
      await client.addCollection(
        attachmentP.class.Attachment,
        plugin.space.Gmail,
        objectId,
        plugin.class.NewMessage,
        'attachments',
        {
          name: file.name,
          file: uuid,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        }
      )
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    }
  }

  const query = createQuery()

  async function removeAttachment (attachment: Attachment): Promise<void> {
    const deleteFile = await getResource(attachmentP.helper.DeleteFile)
    await client.removeCollection(
      attachment._class,
      attachment.space,
      attachment._id,
      attachment.attachedTo,
      attachment.attachedToClass,
      'attachments'
    )
    await deleteFile(attachment.file)
  }

  let attachments: Attachment[] = []

  $: objectId &&
    query.query(
      attachmentP.class.Attachment,
      {
        attachedTo: objectId
      },
      (res) => (attachments = res)
    )

  function onTemplate (e: CustomEvent<string>): void {
    if (e.detail !== undefined) {
      if (obj.subject.trim() === '') {
        obj.subject = e.detail
      }
    }
  }
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
<div class="popupPanel-body__main-header bottom-divider p-2">
  <div class="flex-between">
    <div class="buttons-group">
      <Button
        icon={IconArrowLeft}
        kind={'ghost'}
        on:click={() => {
          dispatch('close')
        }}
      />
      <div class="flex-grow flex-col">
        <Label label={plugin.string.NewMessage} />
        <span class="content-color"><b>{getName(object)} ({channel.value})</b></span>
      </div>
    </div>
    <div class="buttons-group small-gap">
      <Button
        icon={IconAttachment}
        kind={'ghost'}
        on:click={() => {
          inputFile.click()
        }}
      />
      <Button label={plugin.string.Send} size={'small'} kind={'accented'} on:click={sendMsg} />
    </div>
  </div>
</div>
<Scroller>
  <div
    class="popupPanel-body__main-content py-4 h-full"
    on:dragover|preventDefault={() => {}}
    on:dragleave={() => {}}
    on:drop|preventDefault|stopPropagation={fileDrop}
  >
    <div class="mb-2">
      <EditBox label={plugin.string.Subject} bind:value={obj.subject} placeholder={plugin.string.SubjectPlaceholder} />
    </div>
    <div>
      <EditBox label={plugin.string.Copy} bind:value={copy} placeholder={plugin.string.CopyPlaceholder} />
    </div>
    {#if attachments.length}
      <div class="flex-row-center list mt-2 scroll-divider-color">
        {#each attachments as attachment}
          <div class="item flex-row-center flex-no-shrink">
            <AttachmentPresenter
              value={attachment}
              showPreview
              removable
              on:remove={(result) => {
                if (result !== undefined) removeAttachment(attachment)
              }}
            />
          </div>
        {/each}
      </div>
    {/if}
    <div class="input mt-4 clear-mins">
      <StyledTextEditor full bind:content={obj.content} maxHeight="panel" on:template={onTemplate} />
    </div>
  </div>
</Scroller>

<style lang="scss">
  .list {
    padding: 0.5rem;
    color: var(--caption-color);
    overflow-x: auto;
    overflow-y: hidden;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.25rem;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--divider-color);
    }
  }

  .input {
    overflow: auto;
    padding: 1rem;
    background-color: var(--outcoming-msg);
    color: #d6d6d6;
    caret-color: var(--theme-caret-color);
    min-height: 0;
    margin-bottom: 2rem;
    height: 100%;
    border-radius: 0.25rem;

    :global(.ProseMirror) {
      min-height: 0;
      max-height: 100%;
      height: auto;
    }

    :global(a) {
      font: inherit;
      font-weight: 500;
      text-decoration: initial;
      color: initial;
      outline: initial;
      &:hover {
        color: initial;
        text-decoration: initial;
      }
      &:active {
        color: initial;
        text-decoration: initial;
      }
      &:visited {
        color: initial;
      }
    }
  }
</style>
