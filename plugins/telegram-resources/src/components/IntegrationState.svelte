<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { IconError, Label, Loading } from '@hcengineering/ui'
  import type { Integration } from '@hcengineering/account-client'

  import telegram from '../plugin'
  import { type TelegramChannelConfig, getIntegrationClient, listChannels } from '../api'

  export let integration: Integration

  let connection: Integration
  let channels: TelegramChannelConfig[] = []
  let isLoading = true
  let error: string | null = null

  onMount(async () => {
    try {
      const integrationClient = await getIntegrationClient()
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
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load channels'
      isLoading = false
      console.error('Error loading channels:', err)
    }
  })

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
          <span class="text-normal content-color font-medium">{syncEnabledChannels}</span>
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
