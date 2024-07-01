<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { Class, Doc, generateId, getCurrentAccount, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery, DraftController, draftsStore, getClient } from '@hcengineering/presentation'
  import chunter, { ChatMessage, ExternalChannel, ExternalChatMessage } from '@hcengineering/chunter'
  import contactPlugin, { ChannelMessage, ChannelProvider, Contact } from '@hcengineering/contact'
  import activity from '@hcengineering/activity'
  import { EmptyMarkup } from '@hcengineering/text-editor'
  import { isHulyUser, personAccountByIdStore } from '@hcengineering/contact-resources'
  import setting, { Integration, IntegrationType } from '@hcengineering/setting'
  import { showPopup } from '@hcengineering/ui'
  import { getResource } from '@hcengineering/platform'

  import {
    allChannelId,
    createChatMessage,
    editChatMessage,
    getAvailableChannelProviders,
    getChannelContacts,
    hulyChannelId
  } from '../../utils'
  import ChatSubmitButton from './ChatSubmitButton.svelte'

  export let object: Doc
  export let chatMessage: WithLookup<ChatMessage> | undefined = undefined
  export let shouldSaveDraft: boolean = true
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined
  export let loading = false
  export let collection: string = 'comments'
  export let autofocus = false
  export let externalChannel: Ref<ExternalChannel> | undefined = undefined

  type MessageDraft = Pick<ChatMessage, '_id' | 'message' | 'attachments'>

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const extensions = client.getModel().findAllSync(chunter.class.ChatExtension, {})

  const createdMessageQuery = createQuery()
  const channelsQuery = createQuery()
  const integrationQuery = createQuery()

  let isThreadMessage = false
  let _class: Ref<Class<ChatMessage>> = isThreadMessage ? chunter.class.ThreadMessage : chunter.class.ChatMessage

  const draftKey = `${object._id}_${_class}`
  const draftController = new DraftController<MessageDraft>(draftKey)
  const currentDraft = shouldSaveDraft ? $draftsStore[draftKey] : undefined

  const emptyMessage: Pick<MessageDraft, 'message' | 'attachments'> = {
    message: EmptyMarkup,
    attachments: 0
  }

  let contacts: Ref<Contact>[] = []
  let allowedProviders: ChannelProvider[] = []
  let allowedChannels: ExternalChannel[] = []

  let selectedChannelId: Ref<ExternalChannel> | undefined = undefined
  let selectedChannel: ExternalChannel | undefined = undefined
  let integration: Integration | undefined = undefined

  let inputRef: AttachmentRefInput
  let messageDraft: MessageDraft = getInitialDraft()
  let _id = messageDraft._id
  let inputContent = messageDraft.message

  function getInitialDraft () {
    if (chatMessage === undefined) {
      return currentDraft ?? getDefault()
    }

    if (hierarchy.isDerived(chatMessage._class, chunter.class.ExternalChatMessage)) {
      const externalMessage = chatMessage as WithLookup<ExternalChatMessage>
      const channelMessage = externalMessage.$lookup?.channelMessage as WithLookup<ChannelMessage> | undefined
      return {
        _id: externalMessage._id,
        message: channelMessage?.content,
        attachments: channelMessage?.attachments
      }
    }

    return chatMessage
  }

  $: isThreadMessage = hierarchy.isDerived(object._class, activity.class.ActivityMessage)

  $: if (currentDraft != null) {
    createdMessageQuery.query(
      _class,
      { _id },
      (result: ChatMessage[]) => {
        if (result.length > 0 && _id !== chatMessage?._id) {
          clear()
        }
      },
      { limit: 1, projection: { _id: 1 } }
    )
  } else {
    createdMessageQuery.unsubscribe()
  }

  function clear (): void {
    messageDraft = getDefault()
    _id = messageDraft._id
    inputRef.removeDraft(false)
  }

  $: objectChange(messageDraft)

  function objectChange (draft: MessageDraft): void {
    if (shouldSaveDraft) {
      draftController.save(draft, emptyMessage)
    }
  }

  function getDefault (): MessageDraft {
    return {
      _id: generateId(),
      ...emptyMessage
    }
  }

  function onUpdate (event: CustomEvent): void {
    if (!shouldSaveDraft) {
      return
    }
    const { message, attachments } = event.detail
    messageDraft.message = message
    messageDraft.attachments = attachments
  }

  async function connectIntegration (integration: Integration | undefined, typeRef: Ref<IntegrationType>) {
    const type = client.getModel().findAllSync(setting.class.IntegrationType, { _id: typeRef })[0]

    if (type === undefined) {
      return
    }

    if (integration === undefined) {
      if (type.createComponent === undefined) {
        return
      }
      const res = await getResource(type.createComponent)
      showPopup(res, {}, 'centered')
      return
    }

    if (integration.disabled) {
      if (type.reconnectComponent === undefined) {
        return
      }
      const res = await getResource(type.reconnectComponent)
      showPopup(res, {}, 'centered')
    }
  }
  async function onMessage (event: CustomEvent): Promise<void> {
    if (integrationType !== undefined && (integration === undefined || integration.disabled)) {
      await connectIntegration(integration, integrationType)
      return
    }

    loading = true
    draftController.remove()
    inputRef.removeDraft(false)

    const doneOp = await getClient().measure(`chunter.create.${_class} ${object._class}`)

    if (chatMessage !== undefined) {
      await editChatMessage(
        chatMessage,
        { message: event.detail.message, attachments: event.detail.attachments },
        selectedChannel
      )
    } else {
      await createChatMessage(
        object,
        { _id, _class, message: event.detail.message, attachments: event.detail.attachments, collection },
        selectedChannel
      )
    }

    const d1 = Date.now()
    void doneOp().then((res) => {
      console.log(`create.${_class} measure`, res, Date.now() - d1)
    })
    // Remove draft from Local Storage
    clear()
    dispatch('submit', false)
    loading = false
  }

  export function submit (): void {
    inputRef.submit()
  }

  $: selectedChannel = allowedChannels.find((it) => it._id === selectedChannelId)

  $: void getAvailableChannelProviders(object._class).then((res) => {
    allowedProviders = res
  })

  $: if (allowedProviders.length === 0 || contacts.length === 0 || externalChannel === hulyChannelId) {
    allowedChannels = []
    channelsQuery.unsubscribe()
  } else {
    channelsQuery.query(
      contactPlugin.class.Channel,
      {
        attachedTo: { $in: contacts },
        provider: { $in: allowedProviders.map((it) => it._id) },
        ...(externalChannel !== undefined && externalChannel !== allChannelId ? { _id: externalChannel } : {})
      },
      (res) => {
        allowedChannels = res
      }
    )
  }

  $: integrationType = allowedProviders.find((it) => it._id === selectedChannel?.provider)?.integrationType as
    | Ref<IntegrationType>
    | undefined

  $: if (integrationType !== undefined) {
    integrationQuery.query(
      setting.class.Integration,
      { type: integrationType, createdBy: getCurrentAccount()._id },
      (res) => {
        integration = res[0]
      },
      { limit: 1 }
    )
  } else {
    integration = undefined
    integrationQuery.unsubscribe()
  }

  $: contacts = getChannelContacts(object, $personAccountByIdStore)
  $: updateMessageClass(selectedChannel)

  function updateMessageClass (selectedChannel?: ExternalChannel): void {
    if (selectedChannel === undefined) {
      _class = isThreadMessage ? chunter.class.ThreadMessage : chunter.class.ChatMessage
    } else {
      const provider = allowedProviders.find((it) => it._id === selectedChannel?.provider)
      const resource = extensions.find(({ type }) => type === provider?.integrationType)

      if (resource === undefined) {
        _class = isThreadMessage ? chunter.class.ThreadMessage : chunter.class.ChatMessage
        return
      }

      _class = contactPlugin.class.ChannelMessage
    }
  }

  function isHulyChatAllowed (contacts: Ref<Contact>[]): boolean {
    if (contacts.length === 0) {
      return true
    }

    return contacts.every(isHulyUser)
  }

  $: disableSubmit = allowedChannels.length === 0 && !isHulyChatAllowed(contacts)

  function canEditAttachments (channels: ExternalChannel[], chatMessage?: ChatMessage): boolean {
    if (chatMessage === undefined) {
      return true
    }

    if (!hierarchy.isDerived(chatMessage._class, chunter.class.ExternalChatMessage)) {
      return true
    }
    const externalMessage = chatMessage as ExternalChatMessage

    const channel = channels.find((it) => it._id === externalMessage.channelId)
    const provider = allowedProviders.find((it) => it._id === channel?.provider)
    const resource = extensions.find(({ type }) => type === provider?.integrationType)

    if (resource === undefined) {
      return true
    }

    return resource.options.attachmentsEditable
  }
</script>

<AttachmentRefInput
  {focusIndex}
  bind:this={inputRef}
  bind:content={inputContent}
  {_class}
  space={object.space}
  bind:objectId={_id}
  {shouldSaveDraft}
  {boundary}
  {autofocus}
  {disableSubmit}
  disableAttach={!canEditAttachments(allowedChannels, chatMessage)}
  on:message={onMessage}
  on:update={onUpdate}
  on:focus
  on:blur
  bind:loading
>
  <svelte:fragment slot="submit" let:loading let:canSubmit>
    <ChatSubmitButton
      bind:selectedChannelId
      {loading}
      {canSubmit}
      showLabel={chatMessage === undefined}
      providers={allowedProviders}
      channels={allowedChannels}
      allowHulyChat={(externalChannel === undefined || [hulyChannelId, allChannelId].includes(externalChannel)) &&
        isHulyChatAllowed(contacts)}
      on:submit={submit}
    />
  </svelte:fragment>
</AttachmentRefInput>
