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
  import attachment from '@anticrm/attachment'
  import { AttachmentRefInput } from '@anticrm/attachment-resources'
  import contact, { Channel, Contact, EmployeeAccount, formatName } from '@anticrm/contact'
  import { generateId, getCurrentAccount, Ref, SortingOrder, Space } from '@anticrm/core'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { createQuery, getClient } from '@anticrm/presentation'
  import setting from '@anticrm/setting'
  import type { NewTelegramMessage, SharedTelegramMessage, TelegramMessage } from '@anticrm/telegram'
  import { ActionIcon, Button, IconShare, ScrollBox, showPopup } from '@anticrm/ui'
  import telegram from '../plugin'
  import Connect from './Connect.svelte'
  import TelegramIcon from './icons/Telegram.svelte'
  import Messages from './Messages.svelte'

  export let object: Contact
  let channel: Channel | undefined = undefined
  let objectId: Ref<NewTelegramMessage> = generateId()

  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()

  client
    .findOne(contact.class.Channel, {
      attachedTo: object._id,
      provider: contact.channelProvider.Telegram
    })
    .then((res) => {
      channel = res
    })

  let messages: TelegramMessage[] = []
  let accounts: EmployeeAccount[] = []
  let enabled: boolean
  let selected: Set<Ref<SharedTelegramMessage>> = new Set<Ref<SharedTelegramMessage>>()
  let selectable = false

  const messagesQuery = createQuery()
  const accauntsQuery = createQuery()
  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id

  function updateMessagesQuery (channelId: Ref<Channel>): void {
    messagesQuery.query(
      telegram.class.Message,
      { attachedTo: channelId },
      (res) => {
        messages = res.reverse()
        if (channel !== undefined) {
          notificationClient.updateLastView(channel._id, channel._class, undefined, true)
        }
        const accountsIds = new Set(messages.map((p) => p.modifiedBy as Ref<EmployeeAccount>))
        updateAccountsQuery(accountsIds)
      },
      {
        sort: { modifiedOn: SortingOrder.Descending },
        limit: 500,
        lookup: {
          _id: { attachments: attachment.class.Attachment }
        }
      }
    )
  }

  $: channel && updateMessagesQuery(channel._id)

  function updateAccountsQuery (accountsIds: Set<Ref<EmployeeAccount>>): void {
    accauntsQuery.query(contact.class.EmployeeAccount, { _id: { $in: Array.from(accountsIds) } }, (result) => {
      accounts = result
    })
  }

  settingsQuery.query(
    setting.class.Integration,
    { type: telegram.integrationType.Telegram, space: accountId as string as Ref<Space> },
    (res) => {
      enabled = res.length > 0
    }
  )

  async function onMessage (event: CustomEvent) {
    if (channel === undefined) return
    const { message, attachments } = event.detail
    await client.createDoc(
      telegram.class.NewMessage,
      telegram.space.Telegram,
      {
        content: message,
        status: 'new',
        attachments,
        attachedTo: channel._id,
        attachedToClass: channel._class,
        collection: 'newMessages'
      },
      objectId
    )

    objectId = generateId()
  }

  function getName (message: TelegramMessage, accounts: EmployeeAccount[]): string {
    return message.incoming ? object.name : accounts.find((p) => p._id === message.modifiedBy)?.name ?? ''
  }

  async function share (): Promise<void> {
    const selectedMessages = messages.filter((m) => selected.has(m._id as unknown as Ref<SharedTelegramMessage>))
    await client.addCollection(
      telegram.class.SharedMessages,
      object.space,
      object._id,
      object._class,
      'sharedTelegramMessages',
      {
        messages: convertMessages(selectedMessages, accounts)
      }
    )
    if (channel !== undefined) {
      await notificationClient.updateLastView(channel._id, channel._class, channel.modifiedOn, true)
    }
    clear()
  }

  function clear (): void {
    selectable = false
    selected.clear()
    selected = selected
  }

  function convertMessages (messages: TelegramMessage[], accounts: EmployeeAccount[]): SharedTelegramMessage[] {
    return messages.map((m) => {
      return {
        ...m,
        _id: m._id as unknown as Ref<SharedTelegramMessage>,
        sender: getName(m, accounts)
      }
    })
  }

  async function onConnectClose (res: any): Promise<void> {
    if (res?.value) {
      await client.createDoc(setting.class.Integration, accountId as string as Ref<Space>, {
        type: telegram.integrationType.Telegram,
        value: res.value,
        disabled: false
      })
    }
  }
</script>

<div class="ac-header short mirror-tool divide">
  <div class="ac-header__wrap-title">
    <div class="flex-center icon"><TelegramIcon size={'small'} /></div>
    <div class="ac-header__wrap-description">
      <span class="ac-header__title">Telegram</span>
      <span class="ac-header__description">You and {formatName(object.name)}</span>
    </div>
  </div>
  <ActionIcon
    icon={IconShare}
    size={'medium'}
    label={telegram.string.Share}
    direction={'bottom'}
    action={async () => {
      selectable = !selectable
    }}
  />
</div>
<div class="h-full right-content">
  <ScrollBox vertical stretch autoscrollable>
    {#if messages && accounts}
      <Messages messages={convertMessages(messages, accounts)} {selectable} bind:selected />
    {/if}
  </ScrollBox>
</div>

<div class="ref-input" class:selectable>
  {#if selectable}
    <div class="flex-between">
      <span>{selected.size} messages selected</span>
      <div class="flex">
        <div>
          <Button label={telegram.string.Cancel} size={'small'} on:click={clear} />
        </div>
        <div class="ml-3">
          <Button
            label={telegram.string.PublishSelected}
            size={'small'}
            primary
            disabled={!selected.size}
            on:click={share}
          />
        </div>
      </div>
    </div>
  {:else if enabled}
    <AttachmentRefInput
      space={telegram.space.Telegram}
      _class={telegram.class.NewMessage}
      {objectId}
      on:message={onMessage}
    />
  {:else}
    <div class="flex-center">
      <Button
        label={telegram.string.Connect}
        primary
        on:click={(e) => {
          showPopup(Connect, {}, e.target, onConnectClose)
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .icon {
    margin-right: 1rem;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--theme-caption-color);
    background-color: var(--primary-button-enabled);
    border-radius: 50%;
  }

  .ref-input {
    padding: 0 2.5rem 1.5rem;

    &.selectable {
      padding: 0.75rem 1.25rem 0.75rem 2.5rem;
      color: var(--theme-caption-color);
      border-top: 1px solid var(--theme-card-divider);
    }
  }

  .right-content {
    flex-grow: 1;
    padding: 1.5rem 1rem;
  }
</style>
