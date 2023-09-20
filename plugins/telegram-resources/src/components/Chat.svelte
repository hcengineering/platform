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
  import contact, { Channel, Contact, Person, PersonAccount, getName as getContactName } from '@hcengineering/contact'
  import { Avatar, personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { IdMap, Ref, SortingOrder, generateId, getCurrentAccount } from '@hcengineering/core'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { getEmbeddedLabel, getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { Integration } from '@hcengineering/setting'
  import type { NewTelegramMessage, SharedTelegramMessage, TelegramMessage } from '@hcengineering/telegram'
  import templates, { TemplateDataProvider } from '@hcengineering/templates'
  import {
    Button,
    Icon,
    IconShare,
    Label,
    Dialog,
    Scroller,
    eventToHTMLElement,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import telegram from '../plugin'
  import Connect from './Connect.svelte'
  import Messages from './Messages.svelte'
  import Reconnect from './Reconnect.svelte'
  import TelegramIcon from './icons/Telegram.svelte'

  export let channel: Channel
  export let embedded = false

  let object: Contact
  let objectId: Ref<NewTelegramMessage> = generateId()

  const dispatch = createEventDispatcher()

  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()

  let templateProvider: TemplateDataProvider | undefined

  getResource(templates.function.GetTemplateDataProvider).then((p) => {
    templateProvider = p()
  })

  onDestroy(() => {
    templateProvider?.destroy()
  })

  $: templateProvider && object && templateProvider.set(contact.class.Contact, object)
  $: templateProvider && integration && templateProvider.set(setting.class.Integration, integration)

  const query = createQuery()
  $: query.query(channel.attachedToClass, { _id: channel.attachedTo }, (result) => {
    object = result[0] as Contact
  })

  let messages: TelegramMessage[] = []
  let integration: Integration | undefined
  let selected: Set<Ref<SharedTelegramMessage>> = new Set<Ref<SharedTelegramMessage>>()
  let selectable = false

  const messagesQuery = createQuery()
  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id

  function updateMessagesQuery (channelId: Ref<Channel>): void {
    messagesQuery.query(
      telegram.class.Message,
      { attachedTo: channelId },
      (res) => {
        messages = res.reverse()
        if (channel !== undefined) {
          notificationClient.forceRead(channel._id, channel._class)
        }
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

  settingsQuery.query(
    setting.class.Integration,
    { type: telegram.integrationType.Telegram, createdBy: accountId },
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

  function getName (message: TelegramMessage, accounts: IdMap<PersonAccount>): string {
    return message.incoming ? object.name : accounts.get(message.modifiedBy as Ref<PersonAccount>)?.name ?? ''
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
        messages: convertMessages(selectedMessages, $personAccountByIdStore)
      }
    )
    if (channel !== undefined) {
      await notificationClient.forceRead(channel._id, channel._class)
    }
    clear()
  }

  function clear (): void {
    selectable = false
    selected.clear()
    selected = selected
  }

  function convertMessages (messages: TelegramMessage[], accounts: IdMap<PersonAccount>): SharedTelegramMessage[] {
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
      await client.createDoc(setting.class.Integration, setting.space.Setting, {
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

  function getParticipants (
    messages: TelegramMessage[],
    accounts: IdMap<PersonAccount>,
    object: Contact | undefined,
    employees: IdMap<Person>
  ): Contact[] {
    if (object === undefined || accounts.size === 0) return []
    const res: IdMap<Contact> = new Map()
    res.set(object._id, object)
    const accs = new Set(messages.map((p) => p.modifiedBy))
    for (const acc of accs) {
      const account = accounts.get(acc as Ref<PersonAccount>)
      if (account !== undefined) {
        const emp = employees.get(account.person)
        if (emp !== undefined) {
          res.set(emp._id, emp)
        }
      }
    }
    return Array.from(res.values())
  }

  $: participants = getParticipants(messages, $personAccountByIdStore, object, $personByIdStore)
</script>

{#if object !== undefined}
  <Dialog
    isFullSize
    on:fullsize
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="title">
      <div class="antiTitle icon-wrapper ml-2">
        <div class="wrapped-icon"><Icon icon={TelegramIcon} size={'small'} /></div>
        <div class="title-wrapper mr-2">
          <div class="wrapped-title flex-row-center">Telegram</div>
        </div>
        {#each participants as participant}
          <div
            class="ml-2"
            use:tooltip={{ label: getEmbeddedLabel(getContactName(client.getHierarchy(), participant)) }}
          >
            <Avatar size={'small'} avatar={participant.avatar} name={participant.name} />
          </div>
        {/each}
      </div>
    </svelte:fragment>
    <svelte:fragment slot="utils">
      {#if integration === undefined}
        <Button
          label={telegram.string.Connect}
          kind={'accented'}
          on:click={(e) => {
            showPopup(Connect, {}, eventToHTMLElement(e), onConnectClose)
          }}
        />
      {:else if integration.disabled}
        <Button
          label={setting.string.Reconnect}
          kind={'accented'}
          on:click={(e) => {
            showPopup(Reconnect, {}, eventToHTMLElement(e), onReconnect)
          }}
        />
      {/if}
      <Button
        icon={IconShare}
        kind={'ghost'}
        size={'medium'}
        showTooltip={{ label: telegram.string.Share }}
        on:click={async () => {
          selectable = !selectable
        }}
      />
    </svelte:fragment>

    <Scroller bottomStart autoscroll>
      {#if messages}
        <Messages messages={convertMessages(messages, $personAccountByIdStore)} {selectable} bind:selected />
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
                kind={'accented'}
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
  </Dialog>
{/if}

<style lang="scss">
  .ref-input {
    padding-top: 0.5rem;

    &.selectable {
      margin-top: 0.5rem;
      padding-top: 1rem;
      color: var(--theme-caption-color);
      border-top: 1px solid var(--theme-divider-color);
    }
  }
</style>
