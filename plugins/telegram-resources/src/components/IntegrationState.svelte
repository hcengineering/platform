<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { onMount, onDestroy } from 'svelte'
  import type { Integration } from '@hcengineering/account-client'
  import { IntegrationClient, IntegrationUpdatedData, onIntegrationEvent } from '@hcengineering/integration-client'
  import { BaseIntegrationState, IntegrationStateRow } from '@hcengineering/setting-resources'
  import { OK, ERROR, Status } from '@hcengineering/platform'

  import telegram from '../plugin'
  import { type TelegramChannelConfig, type TelegramChannelData, getIntegrationClient, listChannels } from '../api'

  export let integration: Integration

  let connection: Integration
  let channels: TelegramChannelConfig[] = []
  let isLoading = true
  let status: Status | undefined

  let integrationClient: IntegrationClient | undefined
  const unsubscribers: (() => void)[] = []

  onMount(async () => {
    try {
      integrationClient = await getIntegrationClient()
      const connectionResult = await integrationClient.getConnection(integration)

      if (connectionResult?.data == null) {
        throw new Error('No connection data found')
      }

      connection = connectionResult
      channels = (await listChannels(connection?.data?.phone)).map((channel) => ({
        ...channel,
        syncEnabled: channel.mode === 'sync'
      }))
      isLoading = false
      status = OK
      subscribe()
    } catch (err) {
      status = ERROR
      isLoading = false
      console.error('Error loading channels:', err)
    }
  })

  onDestroy(() => {
    unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
  })

  function subscribe (): void {
    unsubscribers.push(onIntegrationEvent<IntegrationUpdatedData>('integration:updated', onUpdateIntegration))
  }

  function onUpdateIntegration (data: IntegrationUpdatedData): void {
    if (
      data.integration?.socialId === integration.socialId &&
      data.integration?.workspaceUuid === integration.workspaceUuid
    ) {
      const channelConfig: TelegramChannelData[] = data.newConfig?.channels
      if (channelConfig != null) {
        channels = channels.map((channel) => {
          const updatedChannel = channelConfig.find((c) => String(c.telegramId) === String(channel.id))
          if (updatedChannel != null) {
            return {
              ...channel,
              syncEnabled: updatedChannel.enabled
            }
          }
          return channel
        })
      } else {
        void refresh()
      }
    }
  }

  async function refresh (): Promise<void> {
    try {
      if (integrationClient === undefined) {
        integrationClient = await getIntegrationClient()
      }
      if (connection?.data == null) {
        throw new Error('No connection data found')
      }
      channels = (await listChannels(connection.data.phone)).map((channel) => ({
        ...channel,
        syncEnabled: channel.mode === 'sync'
      }))
    } catch (err: any) {
      console.error('Error refresh channels:', err.message)
    }
  }

  $: totalChannels = channels.length
  $: syncEnabledChannels = channels.filter((channel) => channel.syncEnabled).length
</script>

<BaseIntegrationState {integration} {status} {isLoading} value={connection?.data?.phone}>
  <svelte:fragment slot="content">
    {#if !isLoading}
      <IntegrationStateRow label={telegram.string.SyncedChannels} value={syncEnabledChannels} />
      <IntegrationStateRow label={telegram.string.TotalChannels} value={totalChannels} />
    {/if}
  </svelte:fragment>
</BaseIntegrationState>
