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
  import attachmentP,{ Attachment } from '@anticrm/attachment'
  import { AttachmentPresenter } from '@anticrm/attachment-resources'
  import { Channel,Contact,formatName } from '@anticrm/contact'
  import { Data,generateId } from '@anticrm/core'
  import { NewMessage,SharedMessage } from '@anticrm/gmail'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { getResource,setPlatformStatus,unknownError } from '@anticrm/platform'
  import { createQuery,getClient } from '@anticrm/presentation'
  import { TextEditor } from '@anticrm/text-editor'
  import { ActionIcon,IconArrowLeft,IconAttachment,IconClose,Label } from '@anticrm/ui'
  import Button from '@anticrm/ui/src/components/Button.svelte'
  import EditBox from '@anticrm/ui/src/components/EditBox.svelte'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'

  export let object: Contact
  export let channel: Channel
  export let currentMessage: SharedMessage | undefined
  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()
  let objectId = generateId()

  let editor: TextEditor
  let copy: string = ''

  const obj: Data<NewMessage> = {
    subject: currentMessage ? 'RE: ' + currentMessage.subject : '',
    content: '',
    to: channel.value,
    replyTo: currentMessage?.messageId,
    status: 'new'
  }

  async function sendMsg () {
    await client.createDoc(plugin.class.NewMessage, plugin.space.Gmail, {
      ...obj,
      attachments: attachments.length,
      copy: copy.split(',').map((m) => m.trim()).filter((m) => m.length)
    }, objectId)
    await notificationClient.updateLastView(channel._id, channel._class, undefined, true)
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
      const uuid = await uploadFile(file, { space: plugin.space.Gmail, attachedTo: objectId })
      console.log('uploaded file uuid', uuid)
      await client.addCollection(attachmentP.class.Attachment, plugin.space.Gmail, objectId, plugin.class.NewMessage, 'attachments', {
        name: file.name,
        file: uuid,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    }
  }

  const query = createQuery()

  async function removeAttachment (attachment: Attachment): Promise<void> {
    const deleteFile = await getResource(attachmentP.helper.DeleteFile)
    await client.removeCollection(attachment._class, attachment.space, attachment._id, attachment.attachedTo, attachment.attachedToClass, 'attachments')
    await deleteFile(attachment.file)
  }

  let attachments: Attachment[] = []

  $: objectId && query.query(attachmentP.class.Attachment, {
    attachedTo: objectId
  }, (res) => attachments = res)
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
<div class="flex-between clear-mins header">
  <div
    class="flex-center icon"
    on:click={() => {
      dispatch('close')
    }}
  >
    <IconArrowLeft size="medium" />
  </div>
  <div class="flex-grow flex-col">
    <div class="fs-title">Gmail</div>
    <div class="text-sm content-dark-color overflow-label">
      <Label label={plugin.string.NewMessageTo} />
      <span class="content-accent-color">{formatName(object.name)} ({channel.value})</span>
    </div>
  </div>
  <div class="mr-3 flex-row-center">
    <div class="mr-2">
      <ActionIcon icon={IconAttachment} size={'small'} action={() => {inputFile.click()}} />
    </div>
    <Button label={plugin.string.Send} size={'small'} primary on:click={sendMsg} />
  </div>
</div>
<div class="flex-col clear-mins right-content"
  on:dragover|preventDefault={() => {}}
  on:dragleave={() => {}}
  on:drop|preventDefault|stopPropagation={fileDrop}
>
  <div class="mb-2">
    <EditBox
      label={plugin.string.Subject}
      bind:value={obj.subject}
      placeholder={plugin.string.SubjectPlaceholder}
      maxWidth={'min-content'}
    />
  </div>
  <div>
    <EditBox
      label={plugin.string.Copy}
      bind:value={copy}
      placeholder={plugin.string.CopyPlaceholder}
      maxWidth={'min-content'}
    />
  </div>
  {#if attachments.length}
    <div class='flex-row-center list mt-2'>
      {#each attachments as attachment}
        <div class='item flex'>
          <AttachmentPresenter value={attachment} />
          <div class='remove'>
            <ActionIcon icon={IconClose} action={() => { removeAttachment(attachment) }} size='small' />
          </div>
        </div>
      {/each}
    </div>
  {/if}
  <div class="input mt-4 clear-mins">
    <TextEditor bind:this={editor} bind:content={obj.content} on:blur={editor.submit} />
  </div>
</div>

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0 6rem 0 2.5rem;
    height: 4rem;
    color: var(--theme-content-accent-color);
    border-bottom: 1px solid var(--theme-zone-bg);

    .icon {
      flex-shrink: 0;
      margin-right: 1rem;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--theme-caption-color);
      border-radius: 50%;
      cursor: pointer;
    }
  }

  .right-content {
    flex-grow: 1;
    padding: 1.5rem 2.5rem;

    .list {
      padding: 1rem;
      color: var(--theme-caption-color);
      overflow-x: auto;
      overflow-y: hidden;
      background-color: var(--theme-bg-accent-color);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: .75rem;

      .item + .item {
        padding-left: 1rem;
        border-left: 1px solid var(--theme-bg-accent-color);
      }

      .item {
        .remove {
          visibility: hidden;
        }
      }

      .item:hover {
        .remove {
          visibility: visible;
        }
      }
    }

    .input {
      overflow: auto;
      padding: 1rem;
      background-color: #fff;
      color: #1f212b;
      height: 100%;
      border-radius: 0.5rem;

      :global(.ProseMirror) {
        min-height: 0;
        max-height: 100%;
        height: 100%;
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
  }
</style>
