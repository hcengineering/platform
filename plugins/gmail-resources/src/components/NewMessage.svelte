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

  let progress = false

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
    progress = true
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) createAttachment(file)
    }
    inputFile.value = ''
    progress = false
  }

  function fileDrop (e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    progress = true
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) createAttachment(file)
    }
    progress = false
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
<div class="flex-between bottom-divider min-h-12 px-2">
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
      <span class="content-color"><b>{getName(client.getHierarchy(), object)} ({channel.value})</b></span>
    </div>
  </div>
  <div class="buttons-group small-gap">
    <Button
      icon={IconAttachment}
      kind={'ghost'}
      loading={progress}
      on:click={() => {
        inputFile.click()
      }}
    />
    <Button label={plugin.string.Send} kind={'accented'} disabled={progress} on:click={sendMsg} />
  </div>
</div>
{#if attachments.length}
  <div class="flex-row-center background-bg-accent-color bottom-divider">
    <Scroller padding={'.5rem'} gap={'gap-2'} horizontal contentDirection={'horizontal'} noFade={false}>
      {#each attachments as attachment}
        <AttachmentPresenter
          value={attachment}
          showPreview
          removable
          on:remove={(result) => {
            if (result !== undefined) removeAttachment(attachment)
          }}
        />
      {/each}
    </Scroller>
    {#if attachments.length}<div class="antiHSpacer x2" />{/if}
  </div>
{/if}

<div class="antiVSpacer x2" />
<Scroller padding={'.5rem 1rem'} on:drop={fileDrop}>
  <div class="mb-2">
    <EditBox label={plugin.string.Subject} bind:value={obj.subject} placeholder={plugin.string.SubjectPlaceholder} />
  </div>
  <div>
    <EditBox label={plugin.string.Copy} bind:value={copy} placeholder={plugin.string.CopyPlaceholder} />
  </div>
  <div class="input clear-mins">
    <StyledTextEditor full bind:content={obj.content} maxHeight={'max'} on:template={onTemplate} />
  </div>
</Scroller>
<div class="antiVSpacer x2" />

<style lang="scss">
  .input {
    overflow: auto;
    margin-top: 1rem;
    padding: 1rem;
    height: 100%;
    min-height: 0;
    color: #d6d6d6;
    background-color: var(--theme-bg-color);
    border-radius: 0.25rem;
    caret-color: var(--theme-caret-color);

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
