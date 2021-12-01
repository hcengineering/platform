<!--
// Copyright © 2021 Anticrm Platform Contributors.
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

  import { ReferenceInput } from '@anticrm/text-editor'
  import { createQuery, getClient } from '@anticrm/presentation'
  import telegram from '@anticrm/telegram'
  import type { TelegramMessage } from '@anticrm/telegram'
  import type { Contact, EmployeeAccount } from '@anticrm/contact'
  import contact from '@anticrm/contact'
  import { Button, Grid, ScrollBox, showPopup } from '@anticrm/ui'
  import Message from './Message.svelte'
  import TelegramIcon from './icons/Telegram.svelte'
  import { getCurrentAccount, Ref, Space } from '@anticrm/core'
  import DateView from './Date.svelte'
  import setting from '@anticrm/setting'
  import login from '@anticrm/login'
  import { getMetadata } from '@anticrm/platform'
  import { formatName } from '@anticrm/contact'
  import chunter from '@anticrm/chunter'
  import Connect from './Connect.svelte'

  export let object: Contact

  $: contactString = object.channels.find((p) => p.provider === contact.channelProvider.Telegram)
  let messages: TelegramMessage[] = []
  let account: EmployeeAccount | undefined
  let enabled: boolean
  let selected: Ref<TelegramMessage>[] = []
  const url = getMetadata(login.metadata.TelegramUrl) ?? ''

  const messagesQuery = createQuery()
  const accauntQuery = createQuery()
  const settingsQuery = createQuery()
  const accountId = getCurrentAccount()._id

  $: query = contactString?.value.startsWith('+') ? { contactPhone: contactString.value } : { contactUserName: contactString?.value }
  $: messagesQuery.query(telegram.class.Message, { modifiedBy: accountId, ...query }, (res) => {
    messages = res
  })

  $: accauntQuery.query(contact.class.EmployeeAccount, { _id: accountId as Ref<EmployeeAccount>}, (result) => {
    account = result[0]
  })

  $: settingsQuery.query(setting.class.Integration, { type: telegram.integrationType.Telegram, space: accountId as string as Ref<Space> }, (res) => {
    enabled = res.length > 0
  })
  const client = getClient()

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

  async function onMessage(event: CustomEvent) {
    const to = contactString?.value ?? ''
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

  function isNewDate (messages: TelegramMessage[], i: number): boolean {
    if (i === 0) return true
    const current = new Date(messages[i].modifiedOn).toLocaleDateString()
    const prev = new Date(messages[i-1].modifiedOn).toLocaleDateString()
    return current !== prev
  }

  function needName (messages: TelegramMessage[], i: number): boolean {
    if (i === 0) return true
    const current = messages[i]
    const prev = messages[i-1]
    return current.incoming !== prev.incoming || current.modifiedBy !== prev.modifiedBy
  }

  function getName (messages: TelegramMessage[], account: EmployeeAccount | undefined, i: number): string | undefined {
    if (!needName(messages, i)) return undefined
    const message = messages[i]
    return message.incoming ? object.name : account?.name
  }

  function select (id: Ref<TelegramMessage>): void {
    const index = selected.indexOf(id)
    if (index === -1) {
      selected.push(id)
    } else {
      selected.splice(index, 1)
    }
    selected = selected
  }

  function getSelectedContent (): string {
    const selectedMessages = messages.filter((m) => selected.includes(m._id))
    let result = ''
    for (let index = 0; index < selectedMessages.length; index++) {
      const element = selectedMessages[index]
      const name = getName(selectedMessages, account, index)
      let message: string = ''
      if (name !== undefined) {
        message += formatName(name)
        message += ': '
      }
      message += element.content
      result += message
    }
    return result
  }

  async function share (): Promise<void> {
    const content = getSelectedContent()
    await client.addCollection(chunter.class.Comment, object.space, object._id, object._class, 'comments', {
      message: content
    })
    clear()
  }

  function clear (): void {
    selected = []
  }
</script>

<div class="flex-row-center header">
  {#if selected.length}
    <div class="flex-between actions">
      <Button label={`Share ${selected.length}`} primary on:click={share} />
      <Button label='Cancel' on:click={clear} />
    </div>
  {:else}
    <div class="icon"><TelegramIcon size={'small'} /></div>
    <div class="title">Telegram</div>
  {/if}
</div>
<div class="flex-col h-full right-content">
  <ScrollBox vertical stretch>
    {#if messages}
      <Grid column={1} rowGap={.3}>
        {#each messages as message, i (message._id)}
          {#if isNewDate(messages, i)}
            <DateView {message} />
          {/if}
          <Message {message} selected={selected.includes(message._id)} name={getName(messages, account, i)} on:click={() => {select(message._id)}}/>
        {/each}
      </Grid>
    {/if}
  </ScrollBox>
</div>
<div class="ref-input">
  {#if enabled}
    <ReferenceInput on:message={onMessage}/>
  {:else}
    <div class="flex-center">
      <Button label='Connect' primary on:click={(e) => {
        showPopup(Connect, {}, e.target)
      }} />
    </div>
  {/if}
</div>

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0 2.5rem;
    height: 4.5rem;
    border-bottom: 1px solid var(--theme-card-divider);

    .actions {
      width: 100%;
      margin-right: 4rem;
    }

    .icon {
      opacity: 0.6;
    }
    .title {
      flex-grow: 1;
      margin-left: 0.5rem;
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
      user-select: none;
    }
  }

  .ref-input {
    padding: 1.5rem 2.5rem;
  }

  .right-content {
    flex-grow: 1;
    padding: 2.5rem 2.5rem 0;
  }
</style>

