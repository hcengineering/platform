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
  import contact,{ Channel,Contact,EmployeeAccount,formatName } from '@anticrm/contact'
  import { getCurrentAccount,Ref,SortingOrder,Space } from '@anticrm/core'
  import login from '@anticrm/login'
  import { getMetadata } from '@anticrm/platform'
  import { createQuery,getClient } from '@anticrm/presentation'
  import setting from '@anticrm/setting'
  import type { SharedTelegramMessage, TelegramMessage } from '@anticrm/telegram'
  import { ReferenceInput } from '@anticrm/text-editor'
  import { ActionIcon,Button,IconShare,ScrollBox,showPopup } from '@anticrm/ui'
  import telegram from '../plugin'
  import Connect from './Connect.svelte'
  import TelegramIcon from './icons/Telegram.svelte'
  import Messages from './Messages.svelte'

  export let object: Contact
  let channel: Channel | undefined = undefined
  const client = getClient()

  client.findOne(contact.class.Channel, {
    attachedTo: object._id,
    provider: contact.channelProvider.Telegram
  }).then((res) => channel = res)

  let messages: TelegramMessage[] = []
  let accounts: EmployeeAccount[] = []
  let enabled: boolean
  let selected: Set<Ref<SharedTelegramMessage>> = new Set<Ref<SharedTelegramMessage>>()
  let selectable = false
  const url = getMetadata(login.metadata.TelegramUrl) ?? ''

  const messagesQuery = createQuery()
  const accauntsQuery = createQuery()
  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id

  $: channel && messagesQuery.query(telegram.class.Message, { modifiedBy: accountId, attachedTo: channel._id }, (res) => {
    messages = res
  }, { sort: { modifiedOn: SortingOrder.Ascending }})

  $: accountsIds = messages.map((p) => p.modifiedBy as Ref<EmployeeAccount>)
  $: accauntsQuery.query(contact.class.EmployeeAccount, { _id: { $in: accountsIds }}, (result) => {
    accounts = result
  })

  $: settingsQuery.query(
    setting.class.Integration,
    { type: telegram.integrationType.Telegram, space: accountId as string as Ref<Space> },
    (res) => {
      enabled = res.length > 0
    }
  )

  async function sendMsg (to: string, msg: string) {
    return await fetch(url + '/send-msg', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + getMetadata(login.metadata.LoginToken),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        msg
      })
    })
  }

  async function addContact (phone: string) {
    const [lastName, firstName] = object.name.split(',')

    return await fetch(url + '/add-contact', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + getMetadata(login.metadata.LoginToken),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        phone
      })
    })
  }

  async function onMessage (event: CustomEvent) {
    const to = channel?.value ?? ''
    const sendRes = await sendMsg(to, event.detail)

    if (sendRes.status !== 400 || !to.startsWith('+')) {
      return
    }

    const err = await sendRes.json()
    if (err.code !== 'CONTACT_IMPORT_REQUIRED') {
      return
    }

    const addRes = await addContact(to)

    if (Math.trunc(addRes.status / 100) !== 2) {
      const { message } = await addRes.json().catch(() => ({ message: 'Unknown error' }))

      throw Error(message)
    }

    await sendMsg(to, event.detail)
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
        value: res.value
      })
    }
  }
</script>

<div class="flex-between header">
  <div class="flex-center icon"><TelegramIcon size={'small'} /></div>
  <div class="flex-grow flex-col">
    <div class="fs-title">Telegram</div>
    <div class="text-sm content-dark-color">You and {formatName(object.name)}</div>
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
  <ScrollBox vertical stretch>
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
          <Button label={telegram.string.PublishSelected} size={'small'} primary disabled={!selected.size} on:click={share} />
        </div>
      </div>
    </div>
  {:else if enabled}
    <ReferenceInput on:message={onMessage} />
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
  .header {
    flex-shrink: 0;
    padding: 0 6rem 0 2.5rem;
    height: 4rem;
    color: var(--theme-content-accent-color);
    border-bottom: 1px solid var(--theme-zone-bg);

    .icon {
      margin-right: 1rem;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--theme-caption-color);
      background-color: var(--primary-button-enabled);
      border-radius: 50%;
    }
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
