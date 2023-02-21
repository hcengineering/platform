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
  import attachment from '@hcengineering/attachment'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { createEventDispatcher } from 'svelte'
  import contact, { Channel, Contact, EmployeeAccount, formatName } from '@hcengineering/contact'
  import { generateId, getCurrentAccount, Ref, SortingOrder, Space, Class } from '@hcengineering/core'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { Integration } from '@hcengineering/setting'
  import type { NewTelegramMessage, SharedTelegramMessage, TelegramMessage } from '@hcengineering/telegram'
  import { Button, eventToHTMLElement, IconShare, Scroller, showPopup, Panel, Icon, Label } from '@hcengineering/ui'
  import telegram from '../plugin'
  import Connect from './Connect.svelte'
  import TelegramIcon from './icons/Telegram.svelte'
  import Messages from './Messages.svelte'
  import Reconnect from './Reconnect.svelte'
  import templates, { TemplateDataProvider } from '@hcengineering/templates'
  import { getResource } from '@hcengineering/platform'
  import { onDestroy } from 'svelte'

  export let _id: Ref<Contact>
  export let _class: Ref<Class<Contact>>

  let object: Contact
  let channel: Channel | undefined = undefined
  let objectId: Ref<NewTelegramMessage> = generateId()

  const dispatch = createEventDispatcher()

  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()
  const channelQuery = createQuery()

  $: channelQuery.query(
    contact.class.Channel,
    {
      attachedTo: _id,
      provider: contact.channelProvider.Telegram
    },
    (res) => {
      channel = res[0]
    }
  )

  let templateProvider: TemplateDataProvider | undefined

  getResource(templates.function.GetTemplateDataProvider).then((p) => {
    templateProvider = p()
  })

  onDestroy(() => {
    templateProvider?.destroy()
  })

  $: templateProvider && object && templateProvider.set(contact.templateFieldCategory.Contact, object)
  $: templateProvider && integration && templateProvider.set(setting.templateFieldCategory.Integration, integration)

  const query = createQuery()
  $: _id &&
    _class &&
    query.query(_class, { _id }, (result) => {
      object = result[0]
    })

  let messages: TelegramMessage[] = []
  let accounts: EmployeeAccount[] = []
  let integration: Integration | undefined
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
        sort: { sendOn: SortingOrder.Descending },
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
      integration = res[0]
    }
  )

  async function onMessage (event: CustomEvent) {
    if (channel === undefined) return
    const { message, attachments } = event.detail
    await client.addCollection(
      telegram.class.NewMessage,
      telegram.space.Telegram,
      channel._id,
      channel._class,
      'newMessages',
      {
        content: message,
        status: 'new',
        attachments
      },
      objectId
    )

    objectId = generateId()
    loading = false
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

  async function onReconnect (res: any): Promise<void> {
    if (res?.value && integration !== undefined) {
      await client.update(integration, {
        disabled: false
      })
    }
  }
  let loading = false
</script>

{#if object !== undefined}
  <Panel
    isHeader={true}
    isAside={false}
    isFullSize
    on:fullsize
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="title">
      <div class="antiTitle icon-wrapper">
        <div class="wrapped-icon"><Icon icon={TelegramIcon} size={'medium'} /></div>
        <div class="title-wrapper">
          <span class="wrapped-title">Telegram</span>
          <span class="wrapped-subtitle">
            <Label label={telegram.string.YouAnd} />
            <b>{formatName(object.name)}</b>
          </span>
        </div>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="utils">
      {#if integration === undefined}
        <Button
          label={telegram.string.Connect}
          kind={'primary'}
          on:click={(e) => {
            showPopup(Connect, {}, eventToHTMLElement(e), onConnectClose)
          }}
        />
      {:else if integration.disabled}
        <Button
          label={setting.string.Reconnect}
          kind={'primary'}
          on:click={(e) => {
            showPopup(Reconnect, {}, eventToHTMLElement(e), onReconnect)
          }}
        />
      {/if}
      <Button
        icon={IconShare}
        kind={'transparent'}
        size={'medium'}
        showTooltip={{ label: telegram.string.Share }}
        on:click={async () => {
          selectable = !selectable
        }}
      />
    </svelte:fragment>

    <Scroller bottomStart autoscroll>
      {#if messages && accounts}
        <Messages messages={convertMessages(messages, accounts)} {selectable} bind:selected />
      {/if}
    </Scroller>

    <div class="popupPanel-body__main-header ref-input" class:selectable>
      {#if selectable}
        <div class="flex-between">
          <span>{selected.size} <Label label={telegram.string.MessagesSelected} /></span>
          <div class="flex">
            <div>
              <Button label={telegram.string.Cancel} size={'medium'} on:click={clear} />
            </div>
            <div class="ml-3">
              <Button
                label={telegram.string.PublishSelected}
                size={'medium'}
                kind={'primary'}
                disabled={!selected.size}
                on:click={share}
              />
            </div>
          </div>
        </div>
      {:else if integration !== undefined && !integration.disabled}
        <AttachmentRefInput
          space={telegram.space.Telegram}
          _class={telegram.class.NewMessage}
          {objectId}
          on:message={onMessage}
          bind:loading
        />
      {/if}
    </div>
  </Panel>
{/if}

<style lang="scss">
  .ref-input {
    padding: 0.5rem 0 1.5rem;

    &.selectable {
      padding: 1rem;
      color: var(--theme-caption-color);
      border-top: 1px solid var(--divider-color);
    }
  }
</style>
