<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { getMetadata, serialize } from '@anticrm/platform'
  import { Button, EditBox, IconClose, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import login from '@anticrm/login'
  import PinPad from '../PinPad.svelte'

  const dispatch = createEventDispatcher()

  let requested = false
  let secondFactor = false
  let phone: string = ''
  let code: string = ''
  let password: string = ''
  const url = getMetadata(login.metadata.TelegramUrl)

  async function requestCode(): Promise<void> {
    const res = await sendRequest('/auth', { phone: phone })
    if (res.next === 'code') {
      requested = true
    }
  }

  async function sendPassword(): Promise<void> {
    const res = await sendRequest('/auth/pass', { pass: password })
    if (res.next === 'end') {
      dispatch('close', { value: phone })
    }
  }

  async function sendCode(): Promise<void> {
    const res = await sendRequest('/auth/code', { code: code })
    if (res.next === 'pass') {
      secondFactor = true
    } else if (res.next === 'end') {
      dispatch('close', { value: phone })
    }
  }

  async function sendRequest(path: string, data: any): Promise<any> {
    const response = await fetch(url + path, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + getMetadata(login.metadata.LoginToken),
        'Content-Type': 'application/json'
      },
      body: serialize(data)
    })
    const res = await response.json()
    if (res.err != null) {
      throw new Error(res.err)
    }
    return res
  }

  function back() {
    password = ''
    code = ''
    phone = ''
    requested = false
    secondFactor = false
  }
</script>

<div class="card">
  <div class="card-bg" />
  <div class="flex-between header">
    <div class="overflow-label fs-title"><Label label={'Connect Telegram account'} /></div>
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
      <p><Label label={'Enter your second factor password'} /></p>
      <EditBox label={'Password'} password placeholder={'password'} bind:value={password} />
      <div class="footer">
        <Button label={'Connect'} primary disabled={!password.length} on:click={sendPassword} />
        <a class="link" href={'#'} on:click={back}><Label label={'Back'} /></a>
      </div>
    {:else if requested}
      <p><Label label={'Enter the 5-digit code you received on your Telegram account.'} /></p>
      <PinPad length={5} bind:value={code} />
      <div class="footer">
        <Button label={'Connect'} primary disabled={!code.match(/^\d{5}$/)} on:click={sendCode} />
        <a class="link" href={'#'} on:click={back}><Label label={'Back'} /></a>
      </div>
    {:else}
      <p><Label label={'Enter your Telegram phone number to connect your account.'} /></p>
      <EditBox label={'Phone number'} placeholder={'+1 555 333 7777'} bind:value={phone} />
      <div class="footer">
        <Button label={'Next'} primary disabled={!phone.match(/^\+\d{9,15}$/)} on:click={requestCode} />
      </div>
    {/if}
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
    border-radius: 1.25rem;

    .header {
      flex-shrink: 0;
      margin: 1.75rem 1.75rem 1.25rem;

      .tool {
        cursor: pointer;
        &:hover {
          color: var(--theme-caption-color);
        }
        &:active {
          color: var(--theme-content-accent-color);
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
        padding: 1rem 1.75rem 1.75rem;

        .link {
          color: var(--theme-content-dark-color);
          &:hover {
            color: var(--theme-caption-color);
          }
          &:active {
            color: var(--theme-content-accent-color);
          }
        }
      }
    }

    .card-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 1.25rem;
      backdrop-filter: blur(15px);
      box-shadow: var(--theme-card-shadow);
      z-index: -1;
    }
  }
</style>
