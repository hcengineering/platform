<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { CodeForm, Icon, IconCheckmark, Label, Loading, Modal, ModernButton } from '@hcengineering/ui'
  import presentation from '@hcengineering/presentation'
  import { getEmbeddedLabel, getMetadata, IntlString } from '@hcengineering/platform'
  import { concatLink, getCurrentAccount } from '@hcengineering/core'
  import { createEventDispatcher, onMount } from 'svelte'

  import telegram from '../plugin'
  import TelegramColor from './icons/TelegramColor.svelte'

  let isTestingConnection = false
  let isConnectionEstablished = false
  let connectionError: Error | undefined

  let info: { name: string, username: string, photoUrl: string } | undefined = undefined
  let isLoading = false

  const url = getMetadata(telegram.metadata.BotUrl) ?? ''
  const dispatch = createEventDispatcher()

  onMount(() => {
    void loadBotInfo()
  })

  async function loadBotInfo (): Promise<void> {
    if (info !== undefined || isLoading) return
    isLoading = true
    try {
      const link = concatLink(url, '/info')
      const res = await fetch(link, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + getMetadata(presentation.metadata.Token),
          'Content-Type': 'application/json'
        }
      })
      info = await res.json()
    } catch (e) {}
    isLoading = false
  }

  async function handleTestConnection (): Promise<void> {
    isTestingConnection = true
    isConnectionEstablished = false
    connectionError = undefined

    try {
      const link = concatLink(url, '/test')
      const res = await fetch(link, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + getMetadata(presentation.metadata.Token),
          'Content-Type': 'application/json'
        }
      })
      isConnectionEstablished = res.ok
      if (!res.ok) {
        connectionError = new Error('Connection failed')
      }
    } catch (e) {
      connectionError = e as Error
    }
    isTestingConnection = false
  }

  const codeFields = [
    { id: 'code-1', name: 'code-1', optional: false },
    { id: 'code-2', name: 'code-2', optional: false },
    { id: 'code-3', name: 'code-3', optional: false },
    { id: 'code-4', name: 'code-4', optional: false },
    { id: 'code-5', name: 'code-5', optional: false },
    { id: 'code-6', name: 'code-6', optional: false }
  ]

  let isCodeValid = false
  let codeError: IntlString | undefined

  async function handleCode (event: CustomEvent<string>): Promise<void> {
    isCodeValid = false
    codeError = undefined

    try {
      const link = concatLink(url, '/auth')
      const res = await fetch(link, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + getMetadata(presentation.metadata.Token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: event.detail, account: getCurrentAccount().primarySocialId })
      })
      isCodeValid = res.ok
      if (!res.ok) {
        codeError = res.status === 409 ? telegram.string.AccountAlreadyConnected : telegram.string.InvalidCode
      }
    } catch (e) {
      codeError = telegram.string.SomethingWentWrong
    }
  }
</script>

<Modal
  label={telegram.string.ConnectTelegramBot}
  type="type-popup"
  okLabel={presentation.string.Ok}
  okAction={() => {
    dispatch('close')
  }}
  showCancelButton={false}
  canSave
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    {#if isLoading}
      <div class="flex-row-top mt-2 h-32">
        <Loading size="medium" />
      </div>
    {:else if info}
      <div class="flex-col mt-2">
        <div class="title overflow-label mb-4">
          <div class="flex-row-center flex-gap-2">
            {#if info.photoUrl !== ''}
              <img class="photo" src={info.photoUrl} alt="" />
            {:else}
              <Icon icon={TelegramColor} size="x-large" />
            {/if}
            {info.name} (@{info.username})
            <ModernButton
              label={telegram.string.TestConnection}
              size="small"
              loading={isTestingConnection}
              on:click={handleTestConnection}
            />
            {#if isConnectionEstablished}
              <span class="flex-row-center flex-gap-1 label-connected">
                <Label label={telegram.string.Connected} />
                <Icon icon={IconCheckmark} size="medium" />
              </span>
            {/if}
          </div>
          {#if connectionError}
            <span class="label-error mt-2">
              <Label label={telegram.string.ConnectBotError} />
            </span>
          {/if}
        </div>
        <div class="flex-row-center flex-gap-1 mt-2">
          <Label label={telegram.string.ConnectBotInfoStart} />
          <a target="_blank" href={`https://t.me/${info.username}`}>{info.username}</a>
          <Label label={telegram.string.ConnectBotInfoEnd} />
        </div>

        <CodeForm fields={codeFields} size="small" on:submit={handleCode} />
        {#if codeError}
          <span class="label-error mt-2">
            <Label label={codeError} />
          </span>
        {:else if isCodeValid}
          <span class="flex-row-center flex-gap-1 mt-2 label-connected">
            <Label label={telegram.string.Connected} />
            <Icon icon={IconCheckmark} size="medium" />
          </span>
        {/if}
      </div>
    {:else}
      <span class="label-error mt-2">
        <Label label={getEmbeddedLabel('Unable connect to service. Please try again.')} />
      </span>
    {/if}
  </div>
</Modal>

<style lang="scss">
  .label-connected {
    color: var(--global-online-color);
  }

  .label-error {
    color: var(--global-error-TextColor);
  }

  a {
    color: var(--theme-link-color);

    &:hover,
    &:active,
    &:visited {
      color: var(--theme-link-color);
    }
  }

  .photo {
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
  }
</style>
