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
  import { Icon, IconCheckmark, Label, Loading, ModernButton } from '@hcengineering/ui'
  import presentation from '@hcengineering/presentation'
  import { getMetadata } from '@hcengineering/platform'
  import { concatLink } from '@hcengineering/core'

  import telegram from '../plugin'
  import TelegramColor from './icons/TelegramColor.svelte'

  export let enabled: boolean

  let isTestingConnection = false
  let isConnectionEstablished = false
  let connectionError: Error | undefined

  let info: { name: string, username: string } | undefined = undefined
  let isLoading = false

  const url = getMetadata(telegram.metadata.BotUrl) ?? ''

  $: if (enabled) {
    void loadBotInfo()
  }

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
    } catch (e) {
      connectionError = e as Error
    }
    isTestingConnection = false
  }
</script>

{#if enabled}
  {#if isLoading}
    <div class="flex-row-top mt-2 w-6">
      <Loading size="small" />
    </div>
  {:else if info}
    <div class="flex-col mt-2">
      <div class="flex-row-center flex-gap-2">
        <!--TODO: use telegram bot avatar-->
        <Icon icon={TelegramColor} size="medium" />
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
        <span class="label-error">
          <Label label={telegram.string.ConnectBotError} />
        </span>
      {/if}
      <div class="flex-row-center flex-gap-1 mt-2">
        <Label label={telegram.string.ConnectBotInfoStart} />
        <a target="_blank" href={`https://t.me/@${info.username}`}>{info.username}</a>
        <Label label={telegram.string.ConnectBotInfoEnd} />
      </div>
    </div>
  {/if}
{/if}

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
</style>
