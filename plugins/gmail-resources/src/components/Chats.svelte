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
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Message, SharedMessage } from '@anticrm/gmail'
  import gmail from '../plugin'
  import { Channel, Contact, EmployeeAccount, formatName } from '@anticrm/contact'
  import contact from '@anticrm/contact'
  import { ActionIcon, IconShare, Button, ScrollBox, showPopup, Icon, Label } from '@anticrm/ui'
  import { getCurrentAccount, Ref, SortingOrder, Space } from '@anticrm/core'
  import setting from '@anticrm/setting'
  import Connect from './Connect.svelte'
  import Messages from './Messages.svelte'

  export let object: Contact
  export let channel: Channel
  export let newMessage: boolean

  let messages: Message[] = []
  let account: EmployeeAccount | undefined
  let enabled: boolean
  let selected: Set<Ref<SharedMessage>> = new Set<Ref<SharedMessage>>()
  let selectable = false
  let me = ''

  const messagesQuery = createQuery()
  const accauntQuery = createQuery()
  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id

  $: messagesQuery.query(
    gmail.class.Message,
    { modifiedBy: accountId, attachedTo: channel._id },
    (res) => {
      messages = res
    },
    { sort: { modifiedOn: SortingOrder.Descending } }
  )

  $: accauntQuery.query(contact.class.EmployeeAccount, { _id: accountId as Ref<EmployeeAccount> }, (result) => {
    account = result[0]
  })

  $: settingsQuery.query(
    setting.class.Integration,
    { type: gmail.integrationType.Gmail, space: accountId as string as Ref<Space> },
    (res) => {
      enabled = res.length > 0
      me = res[0].value
    }
  )
  const client = getClient()

  async function share (): Promise<void> {
    const selectedMessages = messages.filter((m) => selected.has(m._id as string as Ref<SharedMessage>))
    await client.addCollection(gmail.class.SharedMessages, object.space, object._id, object._class, 'gmailSharedMessages', {
      messages: convertMessages(selectedMessages)
    })
    clear()
  }

  function clear (): void {
    selectable = false
    selected.clear()
    selected = selected
  }

  function convertMessages (messages: Message[]): SharedMessage[] {
    return messages.map((m) => {
      return {
        ...m,
        _id: m._id as string as Ref<SharedMessage>,
        sender: account ? getName(m, account, true) : '',
        receiver: account ? getName(m, account, false) : ''
      }
    })
  }

  function getName (message: Message, account: EmployeeAccount, sender: boolean): string {
    return message.incoming === sender
      ? `${formatName(object.name)} (${channel.value})`
      : `${formatName(account.name)} (${me})`
  }
</script>

<div class="flex-between header">
  {#if selectable}
    <div class="flex-between w-full">
      <span>{selected.size} <Label label={gmail.string.MessagesSelected} /></span>
      <div class="flex">
        <div>
          <Button label={gmail.string.Cancel} size={'small'} on:click={clear} />
        </div>
        <div class="ml-3">
          <Button
            label={gmail.string.PublishSelected}
            size={'small'}
            primary
            disabled={!selected.size}
            on:click={share}
          />
        </div>
      </div>
    </div>
  {:else if enabled}
    <div class="flex-center icon"><Icon icon={contact.icon.Email} size="small" /></div>
    <div class="flex-grow flex-col">
      <div class="fs-title">Gmail</div>
      <div class="text-sm content-dark-color"><Label label={gmail.string.YouAnd} /> {formatName(object.name)}</div>
    </div>
    <div class="mr-3">
      <Button
        label={gmail.string.CreateMessage}
        size={'small'}
        primary
        on:click={() => {
          newMessage = true
        }}
      />
    </div>
    <ActionIcon
      icon={IconShare}
      size={'medium'}
      label={gmail.string.ShareMessages}
      direction={'bottom'}
      action={async () => {
        selectable = !selectable
      }}
    />
  {:else}
    <div class="flex-center">
      <Button
        label={gmail.string.Connect}
        primary
        size={'small'}
        on:click={(e) => {
          showPopup(Connect, {}, e.target)
        }}
      />
    </div>
  {/if}
</div>
<div class="h-full right-content">
  <ScrollBox vertical stretch>
    {#if messages}
      <Messages messages={convertMessages(messages)} {selectable} bind:selected on:select />
    {/if}
  </ScrollBox>
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

  .right-content {
    flex-grow: 1;
    padding: 1.5rem 1rem;
  }
</style>
