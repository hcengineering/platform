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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Message, SharedMessage } from '@hcengineering/gmail'
  import gmail from '../plugin'
  import { Channel, Contact, EmployeeAccount, formatName } from '@hcengineering/contact'
  import contact from '@hcengineering/contact'
  import plugin, { IconShare, Button, Icon, Label, Scroller } from '@hcengineering/ui'
  import { getCurrentAccount, Ref, SortingOrder, Space } from '@hcengineering/core'
  import setting from '@hcengineering/setting'
  import Messages from './Messages.svelte'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import IconInbox from './icons/Inbox.svelte'

  export let object: Contact
  export let channel: Channel
  export let newMessage: boolean
  export let enabled: boolean

  const EMAIL_REGEX =
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/

  let messages: Message[] = []
  let accounts: EmployeeAccount[] = []
  let selected: Set<Ref<SharedMessage>> = new Set<Ref<SharedMessage>>()
  let selectable = false

  const messagesQuery = createQuery()
  const accauntsQuery = createQuery()
  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id
  const notificationClient = NotificationClientImpl.getClient()

  function updateMessagesQuery (channelId: Ref<Channel>): void {
    messagesQuery.query(
      gmail.class.Message,
      { attachedTo: channelId },
      (res) => {
        messages = res
        notificationClient.updateLastView(channelId, channel._class, undefined, true)
        const accountsIds = new Set(messages.map((p) => p.modifiedBy as Ref<EmployeeAccount>))
        updateAccountsQuery(accountsIds)
      },
      { sort: { sendOn: SortingOrder.Descending } }
    )
  }

  $: updateMessagesQuery(channel._id)

  function updateAccountsQuery (accountsIds: Set<Ref<EmployeeAccount>>): void {
    accauntsQuery.query(contact.class.EmployeeAccount, { _id: { $in: Array.from(accountsIds) } }, (result) => {
      accounts = result
    })
  }

  settingsQuery.query(
    setting.class.Integration,
    { type: gmail.integrationType.Gmail, space: accountId as string as Ref<Space> },
    (res) => {
      enabled = res.length > 0
    }
  )
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
        messages: convertMessages(selectedMessages, accounts)
      }
    )
    await notificationClient.updateLastView(channel._id, channel._class, undefined, true)
    clear()
  }

  function clear (): void {
    selectable = false
    selected.clear()
    selected = selected
  }

  function convertMessages (messages: Message[], accounts: EmployeeAccount[]): SharedMessage[] {
    return messages.map((m) => {
      return {
        ...m,
        _id: m._id as string as Ref<SharedMessage>,
        sender: getName(m, accounts, true),
        receiver: getName(m, accounts, false)
      }
    })
  }

  function getName (message: Message, accounts: EmployeeAccount[], sender: boolean): string {
    if (message.incoming === sender) {
      return `${formatName(object.name)} (${channel.value})`
    } else {
      const account = accounts.find((p) => p._id === message.modifiedBy)
      const value = message.incoming ? message.to : message.from
      const email = value.match(EMAIL_REGEX)
      return account ? `${formatName(account.name)} (${email?.[0] ?? value})` : email?.[0] ?? value
    }
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
            kind={'primary'}
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
          kind={'primary'}
          on:click={() => {
            newMessage = true
          }}
        />
      {/if}
      <Button
        icon={IconShare}
        kind={'transparent'}
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
      <Messages messages={convertMessages(messages, accounts)} {selectable} bind:selected on:select />
      <div class="clear-mins h-4 flex-no-shrink" />
    {:else}
      <div class="flex-col-center justify-center h-full">
        <Icon icon={IconInbox} size={'full'} />
        <div class="mt-4 fs-bold dark-color"><Label label={plugin.string.Incoming} /></div>
      </div>
    {/if}
  </div>
</Scroller>
