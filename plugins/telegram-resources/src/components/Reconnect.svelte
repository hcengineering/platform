<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { concatLink, getCurrentAccount } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import { Button, EditBox, IconClose, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import telegram from '../plugin'
  import PinPad from './PinPad.svelte'

  const dispatch = createEventDispatcher()

  let requested = false
  let secondFactor = false
  let connecting = false
  let phone: string = ''
  let code: string = ''
  let password: string = ''
  let error: string | undefined = undefined
  const url = getMetadata(telegram.metadata.TelegramURL) ?? ''

  async function requestCode (): Promise<void> {
    const res = await sendRequest('/signin', { phone })
    if (res.next === 'code') {
      requested = true
    }

    if (res.next === 'end') {
      dispatch('close', { value: phone })
    }
  }

  async function sendPassword (): Promise<void> {
    const res = await sendRequest('/signin/pass', { phone, pass: password })
    if (res.next === 'end') {
      dispatch('close', { value: phone })
    }
  }

  async function sendCode (): Promise<void> {
    const res = await sendRequest('/signin/code', { phone, code })
    if (res.next === 'pass') {
      secondFactor = true
    } else if (res.next === 'end') {
      dispatch('close', { value: phone })
    }
  }

  async function sendRequest (path: string, data: any): Promise<any> {
    connecting = true
    const response = await fetch(concatLink(url, path), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + getMetadata(presentation.metadata.Token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    const res = await response.json()
    connecting = false

    if (Math.trunc(response.status / 100) !== 2) {
      if (res.code === 'PHONE_CODE_INVALID') {
        error = 'Invalid code'
      }

      throw new Error(res.message)
    }

    return res
  }

  function back () {
    password = ''
    code = ''
    phone = ''
    requested = false
    secondFactor = false
  }

  $: label = connecting
    ? telegram.string.Connecting
    : requested || secondFactor
      ? telegram.string.Connect
      : telegram.string.Next

  $: disabled = checkDisabled(connecting, secondFactor, password, requested, error, code, phone)

  function checkDisabled (
    connecting: boolean,
    secondFactor: boolean,
    password: string,
    requested: boolean,
    error: string | undefined,
    code: string,
    phone: string
  ): boolean {
    if (connecting) return true
    if (secondFactor) return password.length === 0
    if (requested) {
      if (error !== undefined) return true
      return !code.match(/^\d{5}$/)
    }
    return !phone.match(/^\+\d{9,15}$/)
  }

  function click () {
    if (secondFactor) return sendPassword()
    if (requested) return sendCode()
    return requestCode()
  }

  const client = getClient()

  async function getCurrent () {
    const cuurent = await client.findOne(setting.class.Integration, {
      type: telegram.integrationType.Telegram,
      createdBy: getCurrentAccount()._id
    })
    if (cuurent !== undefined) {
      phone = cuurent.value
    }
  }
</script>

<div class="card">
  <div class="flex-between header">
    <div class="overflow-label fs-title"><Label label={telegram.string.ConnectFull} /></div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="tool"
      on:click={() => {
        dispatch('close')
      }}
    >
      <IconClose size={'small'} />
    </div>
  </div>
  <div class="content">
    {#if secondFactor}
      <p><Label label={telegram.string.PasswordDescr} /></p>
      <EditBox
        label={telegram.string.Password}
        format="password"
        placeholder={telegram.string.Password}
        bind:value={password}
      />
    {:else if requested}
      <p><Label label={telegram.string.CodeDescr} /></p>
      <PinPad length={5} bind:value={code} bind:error />
    {:else}
      <p><Label label={telegram.string.PhoneDescr} /></p>
      {#await getCurrent() then value}
        <EditBox label={telegram.string.Phone} placeholder={telegram.string.PhonePlaceholder} bind:value={phone} />
      {/await}
    {/if}
    <div class="footer">
      <Button {label} kind={'accented'} {disabled} on:click={click} />
      {#if requested || secondFactor}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="link over-underline" on:click={back}><Label label={telegram.string.Back} /></div>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 20rem;
    min-width: 20rem;
    max-width: 20rem;
    background-color: var(--popup-bg-color);
    border-radius: 0.75rem;
    box-shadow: var(--popup-shadow);

    .header {
      flex-shrink: 0;
      margin: 1.75rem 1.75rem 1.25rem;

      .tool {
        cursor: pointer;
        &:hover {
          color: var(--caption-color);
        }
        &:active {
          color: var(--accent-color);
        }
      }
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      height: fit-content;
      margin: 0 1.75rem 0.5rem;
      p {
        margin: 0 0 1rem;
      }

      .footer {
        display: flex;
        flex-direction: row-reverse;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0rem;

        .link {
          color: var(--accent-color);
          &:hover {
            color: var(--caption-color);
          }
          &:active {
            color: var(--accent-color);
          }
        }
      }
    }
  }
</style>
