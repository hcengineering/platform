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
  import { createQuery } from '@anticrm/presentation'
  import telegram from '@anticrm/telegram'
  import type { TelegramMessage } from '@anticrm/telegram'
  import type { Contact, EmployeeAccount } from '@anticrm/contact'
  import contact from '@anticrm/contact'
  import { Grid, ScrollBox } from '@anticrm/ui'
  import Message from './Message.svelte'
  import TelegramIcon from './icons/Telegram.svelte'
  import { Ref, Space } from '@anticrm/core'
  import DateView from './Date.svelte'
  import setting from '@anticrm/setting'
  import login from '@anticrm/login'
  import { getMetadata } from '@anticrm/platform'

  export let object: Contact

  $: contactString = object.channels.find((p) => p.provider === contact.channelProvider.Telegram)
  let messages: TelegramMessage[] = []
  let accounts: EmployeeAccount[] = []
  let enabled: boolean
  const url = getMetadata(login.metadata.TelegramUrl) ?? ''

  const messagesQuery = createQuery()
  const accauntsQuery = createQuery()
  const settingsQuery = createQuery()

  $: query = contactString?.value.startsWith('+') ? { contactPhone: contactString.value } : { contactUserName: contactString?.value }
  $: messagesQuery.query(telegram.class.Message, query, (res) => {
    messages = res
  })

  $: accountsIds = messages.map((p) => p.modifiedBy as Ref<EmployeeAccount>)
  $: accauntsQuery.query(contact.class.EmployeeAccount, { _id: { $in: accountsIds }}, (result) => {
    accounts = result
  })

  const accountId = getMetadata(login.metadata.LoginEmail)
  $: settingsQuery.query(setting.class.Integration, { type: telegram.integrationType.Telegram, space: accountId as Ref<Space> }, (res) => {
    enabled = res.length > 0
  })

  async function onMessage(event: CustomEvent, isRetry = false) {
    const to = contactString?.value ?? ''
    const res = await fetch(url + '/send-msg', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + getMetadata(login.metadata.LoginToken),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        msg: event.detail
      })
    })

    if (res.status === 400 && !isRetry) {
      if (!to.startsWith('+')) {
        return
      }

      const err = await res.json()

      if (err.code !== 'CONTACT_IMPORT_REQUIRED') {
        return
      }

      const [lastName, firstName] = object.name.split(',')

      const addRes = await fetch(url + '/add-contact', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + getMetadata(login.metadata.LoginToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: firstName ?? '',
          lastName: lastName ?? '',
          phone: to
        })
      })

      if (Math.trunc(addRes.status / 100) !== 2) {
        const { message } = await addRes.json().catch(() => ({ message: 'Unknown error' }))

        throw Error(message)
      }

      await onMessage(event, true)
    }
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

  function getName (messages: TelegramMessage[], accounts: EmployeeAccount[], i: number): string | undefined {
    if (!needName(messages, i)) return undefined
    const message = messages[i]
    return message.incoming ? object.name : accounts.find((p) => p._id === message.modifiedBy)?.name
  }
</script>

<div class="flex-row-center header">
  <div class="icon"><TelegramIcon size={'small'} /></div>
  <div class="title">Telegram</div>
</div>
<div class="flex-col h-full right-content">
  <ScrollBox vertical stretch>
    {#if messages}
      <Grid column={1} rowGap={.3}>
        {#each messages as message, i (message._id)}
          {#if isNewDate(messages, i)}
            <DateView {message} />
          {/if}
          <Message {message} name={getName(messages, accounts, i)} />
        {/each}
      </Grid>
    {/if}
  </ScrollBox>
</div>
{#if enabled}
  <div class="ref-input">
    <ReferenceInput on:message={onMessage}/>
  </div>
{/if}

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0 2.5rem;
    height: 4.5rem;
    border-bottom: 1px solid var(--theme-card-divider);

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

