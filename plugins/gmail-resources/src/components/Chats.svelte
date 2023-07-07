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
  import { employeeAccountByIdStore, employeeByIdStore } from '@hcengineering/contact-resources'
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
        messages: convertMessages(object, channel, selectedMessages, $employeeAccountByIdStore, $employeeByIdStore)
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

<div class="popupPanel-body__main-header bottom-divider p-2">
  <div class="flex-between">
    {#if selectable}
      <span><b>{selected.size}</b> <Label label={gmail.string.MessagesSelected} /></span>
      <div class="flex">
        <div>
          <Button label={gmail.string.Cancel} size={'small'} on:click={clear} />
        </div>
        <div class="ml-3">
          <Button
            label={gmail.string.PublishSelected}
            size={'small'}
            kind={'accented'}
            disabled={!selected.size}
            on:click={share}
          />
        </div>
      </div>
    {:else}
      {#if enabled}
        <Button
          label={gmail.string.CreateMessage}
          size={'small'}
          kind={'accented'}
          on:click={() => {
            newMessage = true
          }}
        />
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
</div>
<Scroller>
  <div class="popupPanel-body__main-content py-4 clear-mins flex-no-shrink">
    {#if messages && messages.length > 0}
      <Messages
        messages={convertMessages(object, channel, messages, $employeeAccountByIdStore, $employeeByIdStore)}
        {selectable}
        bind:selected
        on:select
      />
      <div class="clear-mins h-4 flex-no-shrink" />
    {:else}
      <div class="flex-col-center justify-center h-full">
        <Icon icon={IconInbox} size={'full'} />
        <div class="mt-4 fs-bold content-dark-color"><Label label={plugin.string.Incoming} /></div>
      </div>
    {/if}
  </div>
</Scroller>
