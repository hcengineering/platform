<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Channel, Contact } from '@hcengineering/contact'
  import { personAccountByIdStore, employeeByIdStore } from '@hcengineering/contact-resources'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { Message, SharedMessage } from '@hcengineering/gmail'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import plugin, { Button, Icon, IconShare, Label, Scroller } from '@hcengineering/ui'
  import gmail from '../plugin'
  import { convertMessages } from '../utils'
  import Messages from './Messages.svelte'
  import IconInbox from './icons/Inbox.svelte'

  export let object: Contact
  export let channel: Channel
  export let newMessage: boolean
  export let enabled: boolean

  let plainMessages: Message[] = []
  let newMessages: Message[] = []
  $: messages = newMessages.concat(plainMessages)

  let selected: Set<Ref<SharedMessage>> = new Set<Ref<SharedMessage>>()
  let selectable = false

  const messagesQuery = createQuery()
  const newMessageQuery = createQuery()

  const notificationClient = NotificationClientImpl.getClient()

  newMessageQuery.query(
    gmail.class.NewMessage,
    {
      to: channel.value,
      status: 'error'
    },
    (res) => {
      newMessages = res as unknown as Message[]
    },
    { sort: { createdOn: SortingOrder.Descending } }
  )

  function updateMessagesQuery (channelId: Ref<Channel>): void {
    messagesQuery.query(
      gmail.class.Message,
      { attachedTo: channelId },
      (res) => {
        plainMessages = res
        notificationClient.read(channelId)
      },
      { sort: { sendOn: SortingOrder.Descending } }
    )
  }

  $: updateMessagesQuery(channel._id)

  const client = getClient()

  async function share (): Promise<void> {
    const selectedMessages = messages.filter((m) => selected.has(m._id as string as Ref<SharedMessage>))
    await client.addCollection(
      gmail.class.SharedMessages,
      object.space,
      object._id,
      object._class,
      'gmailSharedMessages',
      {
        messages: convertMessages(object, channel, selectedMessages, $personAccountByIdStore, $employeeByIdStore)
      }
    )
    await notificationClient.read(channel._id)
    clear()
  }

  function clear (): void {
    selectable = false
    selected.clear()
    selected = selected
  }
</script>

<div class="flex-between bottom-divider min-h-12 px-2">
  {#if selectable}
    <span class="pl-2"><b>{selected.size}</b> <Label label={gmail.string.MessagesSelected} /></span>
    <div class="flex-row-center gap-3">
      <Button label={gmail.string.Cancel} on:click={clear} />
      <Button label={gmail.string.PublishSelected} kind={'accented'} disabled={!selected.size} on:click={share} />
    </div>
  {:else}
    {#if enabled}
      <Button
        label={gmail.string.CreateMessage}
        kind={'accented'}
        on:click={() => {
          newMessage = true
        }}
      />
    {:else}
      <div />
    {/if}
    <Button
      icon={IconShare}
      kind={'ghost'}
      showTooltip={{ label: gmail.string.ShareMessages }}
      on:click={async () => {
        selectable = !selectable
      }}
    />
  {/if}
</div>

{#if messages && messages.length > 0}
  <div class="antiVSpacer x2" />
  <Scroller padding={'.5rem 1rem'}>
    <Messages
      messages={convertMessages(object, channel, messages, $personAccountByIdStore, $employeeByIdStore)}
      {selectable}
      bind:selected
      on:select
    />
    <div class="antiVSpacer x2" />
  </Scroller>
  <div class="antiVSpacer x2" />
{:else}
  <div class="flex-col-center justify-center h-full">
    <Icon icon={IconInbox} size={'full'} />
    <div class="mt-4 fs-bold content-dark-color"><Label label={plugin.string.Incoming} /></div>
  </div>
{/if}
