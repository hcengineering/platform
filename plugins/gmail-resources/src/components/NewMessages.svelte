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
  import contact, { Channel, Contact, formatName } from '@hcengineering/contact'
  import { generateId, getCurrentAccount, Ref, Space, toIdMap } from '@hcengineering/core'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import setting, { Integration } from '@hcengineering/setting'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    EditBox,
    eventToHTMLElement,
    Icon,
    IconAttachment,
    Label,
    Panel,
    Scroller,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import plugin from '../plugin'
  import templates, { TemplateDataProvider } from '@hcengineering/templates'
  import Connect from './Connect.svelte'
  import { StyledTextEditor } from '@hcengineering/text-editor'

  export let value: Contact[] | Contact
  const contacts = Array.isArray(value) ? value : [value]

  const contactMap = toIdMap(contacts)

  const query = createQuery()
  query.query(
    contact.class.Channel,
    {
      provider: contact.channelProvider.Email,
      attachedTo: { $in: contacts.map((p) => p._id) }
    },
    (res) => {
      channels = res
    }
  )
  let channels: Channel[] = []

  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()

  const attachmentParentId = generateId()

  let editor: StyledTextEditor
  let subject: string = ''
  let content: string = ''
  let copy: string = ''
  let saved = false

  async function sendMsg () {
    const templateProvider = (await getResource(templates.function.GetTemplateDataProvider))()
    if (templateProvider === undefined) return
    for (const channel of channels) {
      const target = contacts.find((p) => p._id === channel.attachedTo)
      if (target === undefined) continue
      templateProvider.set(contact.templateFieldCategory.Contact, target)
      const message = await templateProvider.fillTemplate(content)
      const id = await client.createDoc(plugin.class.NewMessage, plugin.space.Gmail, {
        subject,
        content: message,
        to: channel.value,
        status: 'new',
        copy: copy
          .split(',')
          .map((m) => m.trim())
          .filter((m) => m.length)
      })
      await notificationClient.updateLastView(channel._id, channel._class, undefined, true)
      for (const attachment of attachments) {
        await client.addCollection(
          attachmentP.class.Attachment,
          plugin.space.Gmail,
          id,
          plugin.class.NewMessage,
          'attachments',
          {
            name: attachment.name,
            file: attachment.file,
            type: attachment.type,
            size: attachment.size,
            lastModified: attachment.lastModified
          }
        )
      }
      templateProvider.destroy()
    }
    saved = true
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
        attachmentParentId,
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

  const attachmentsQ = createQuery()

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

  attachmentsQ.query(
    attachmentP.class.Attachment,
    {
      attachedTo: attachmentParentId
    },
    (res) => (attachments = res)
  )

  function getName (channel: Channel): string {
    const contact = contactMap.get(channel.attachedTo as Ref<Contact>)
    if (contact === undefined) return channel.value
    return `${formatName(contact.name)} (${channel.value})`
  }

  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id

  let templateProvider: TemplateDataProvider | undefined
  let integration: Integration | undefined

  getResource(templates.function.GetTemplateDataProvider).then((p) => {
    templateProvider = p()
  })

  onDestroy(() => {
    templateProvider?.destroy()
  })

  $: templateProvider && integration && templateProvider.set(setting.templateFieldCategory.Integration, integration)

  settingsQuery.query(
    setting.class.Integration,
    { type: plugin.integrationType.Gmail, space: accountId as string as Ref<Space> },
    (res) => {
      integration = res[0]
    }
  )
</script>

<Panel
  isHeader={true}
  isAside={false}
  isFullSize
  on:fullsize
  on:close={() => {
    if (!saved) {
      attachments.map((p) => removeAttachment(p))
    }
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      <div class="wrapped-icon"><Icon icon={contact.icon.Email} size={'medium'} /></div>
      <div class="title-wrapper">
        <span class="wrapped-title">Email</span>
      </div>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    {#if !integration}
      <Button
        label={plugin.string.Connect}
        kind={'primary'}
        on:click={(e) => {
          showPopup(Connect, {}, eventToHTMLElement(e))
        }}
      />
    {/if}
  </svelte:fragment>

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
        <div class="flex-grow flex-col">
          <Label label={plugin.string.NewMessage} />
          <span class="content-accent-color">
            <b>
              {#each channels as channel, i}
                <div>
                  {getName(channel)}
                </div>
              {/each}
            </b></span
          >
        </div>
      </div>
      <div class="buttons-group small-gap">
        <Button
          icon={IconAttachment}
          kind={'transparent'}
          disabled={channels.length === 0}
          on:click={() => {
            inputFile.click()
          }}
        />
        {#if integration}
          <Button
            label={plugin.string.Send}
            size={'small'}
            kind={'primary'}
            disabled={channels.length === 0}
            on:click={sendMsg}
          />
        {/if}
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
        <EditBox label={plugin.string.Subject} bind:value={subject} placeholder={plugin.string.SubjectPlaceholder} />
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
        <StyledTextEditor bind:this={editor} full bind:content on:blur={editor.submit} />
      </div>
    </div>
  </Scroller>
</Panel>

<style lang="scss">
  .list {
    padding: 0.5rem;
    color: var(--theme-caption-color);
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
    caret-color: var(--caret-color);
    min-height: 0;
    height: 100%;
    margin-bottom: 2rem;
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
