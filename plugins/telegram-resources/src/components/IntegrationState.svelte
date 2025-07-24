<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import { IconError, Label, Loading } from '@hcengineering/ui'
  import type { Integration } from '@hcengineering/account-client'
  import { IntegrationClient, IntegrationEventData, onIntegrationEvent } from '@hcengineering/integration-client'

  import telegram from '../plugin'
  import { type TelegramChannelConfig, getIntegrationClient, listChannels } from '../api'

  export let integration: Integration

  let connection: Integration
  let channels: TelegramChannelConfig[] = []
  let isLoading = true
  let error: string | null = null
  let isRefreshing = false

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
      channels = (await listChannels(connection.data.phone)).map((channel) => ({
        ...channel,
        access: 'private', // Default access since access property doesn't exist on TelegramChannel
        syncEnabled: channel.mode === 'sync'
      }))
      isLoading = false
      subscribe()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load channels'
      isLoading = false
      console.error('Error loading channels:', err)
    }
  })

  onDestroy(() => {
    unsubscribers.forEach(unsubscribe => { unsubscribe() })
  })

  function subscribe (): void {
    unsubscribers.push(
      onIntegrationEvent<IntegrationEventData>('integration:updated', onUpdateIntegration)
    )
  }

  function onUpdateIntegration (data: IntegrationEventData): void {
    if (data.integration?.socialId === integration.socialId && data.integration?.workspaceUuid === integration.workspaceUuid) {
      void refresh()
    }
  }

  async function refresh (): Promise<void> {
    try {
      isRefreshing = true
      if (integrationClient === undefined) {
        integrationClient = await getIntegrationClient()
      }
      if (connection?.data == null) {
        throw new Error('No connection data found')
      }
      channels = (await listChannels(connection.data.phone)).map((channel) => ({
        ...channel,
        access: 'private', // Default access since access property doesn't exist on TelegramChannel
        syncEnabled: channel.mode === 'sync'
      }))
    } catch (err: any) {
      console.error('Error refresh channels:', err.message)
    } finally {
      isRefreshing = false
    }
  }

  $: totalChannels = channels.length
  $: syncEnabledChannels = channels.filter(channel => channel.syncEnabled).length
</script>

<div class="integration-state">
  <div class="state-content">
    {#if isLoading}
      <div class="loading-container">
        <Loading/>
      </div>
    {:else if error}
      <div class="error-container" transition:fade={{ duration: 300 }}>
        <IconError size={'medium'} />
        <Label label={telegram.string.FailedToLoadState} />
      </div>
    {:else if integration.workspaceUuid == null}
      <div class="flex-center" transition:fade={{ duration: 300 }}>
        <span class="text-normal content-color">
          <Label label={telegram.string.NotConnectedIntegration} params={{ phone: connection.data?.phone }} />
        </span>
      </div>
    {:else}
      <div class="stats-list" transition:fade={{ duration: 300 }}>
        <div class="stat-row">
          <span class="text-normal content-color"><Label label={telegram.string.Phone} /></span>
          <span class="text-normal content-color font-medium">{connection?.data?.phone ?? 'N/A'}</span>
        </div>
        <div class="stat-row">
          <span class="text-normal content-color"><Label label={telegram.string.SyncedChannels} /></span>
          <div class="flex justify-between flex-gap-2">
            {#if isRefreshing}
              <Loading size="small" />
            {/if}
            <span class="text-normal content-color font-medium">{syncEnabledChannels}</span>
          </div>
        </div>
        <div class="stat-row">
          <span class="text-normal content-color"><Label label={telegram.string.TotalChannels} /></span>
          <span class="text-normal content-color font-medium">{totalChannels}</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .integration-state {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .state-content {
    display: flex;
    flex-direction: column;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
  }

  .error-container {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .stats-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    padding: 0.15rem 0;
  }
</style>
