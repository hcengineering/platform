<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { CheckBox, Toggle, DropdownLabelsIntl, SearchEdit, Label, ListView, Modal, Loading, closePopup, Icon, IconError, FilterButton, type FilterCategory, type ActiveFilter } from '@hcengineering/ui'
  import { getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import { isWorkspaceIntegration } from '@hcengineering/integration-client'

  import TelegramIcon from './icons/TelegramColor.svelte'
  import telegram from '../plugin'
  import { type TelegramChannelConfig, getIntegrationClient, listChannels, restart } from '../api'

  export let readonly: boolean = false

  const dispatch = createEventDispatcher()

  export let integration: Integration

  let connection: Integration

  // Search state
  let searchQuery: string = ''

  // Mock data for Telegram channels
  let channels: TelegramChannelConfig[] = []

  let selectedChannels = new Set<string>()
  let selectAll: boolean = false

  let selection = 0
  let list: ListView
  let isLoading = true
  let error: string | null = null

  // Filter state
  let activeFilters: ActiveFilter[] = []

  const filterCategories: FilterCategory[] = [
    {
      id: 'type',
      label: 'Type',
      options: [
        { id: 'user', label: 'User' },
        { id: 'group', label: 'Group' },
        { id: 'channel', label: 'Channel' }
      ]
    },
    {
      id: 'mode',
      label: 'Sync Mode',
      options: [
        { id: 'enabled', label: 'Sync Enabled' },
        { id: 'disabled', label: 'Sync Disabled' }
      ]
    },
    {
      id: 'access',
      label: 'Access',
      options: [
        { id: 'public', label: 'Public' },
        { id: 'private', label: 'Private' }
      ]
    }
  ]

  const accessOptions = [
    { id: 'public', label: telegram.string.Public, icon: telegram.string.Shared },
    { id: 'private', label: telegram.string.Private, icon: telegram.string.Locked }
  ]

  onMount(async () => {
    try {
      // Initialize selected channels based on existing data
      error = null
      const integrationClient = await getIntegrationClient()
      connection = await integrationClient.getConnection(integration)
      channels = (await listChannels(connection.data.phone)).map((channel) => ({
        ...channel,
        access: channel.access ?? 'private',
        syncEnabled: channel.mode === 'sync'
      }))
      isLoading = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load channels'
      isLoading = false
      console.error('Error loading channels:', err)
    }
  })

  // Get channel icon based on type
  function getChannelIcon (channel: TelegramChannelConfig) {
    switch (channel.type) {
      case 'user':
        return telegram.icon.User
      case 'group':
        return telegram.icon.Group
      case 'channel':
        return telegram.icon.Channel
      default:
        return undefined
    }
  }

  // Filter channels based on search query and active filters
  $: filteredChannels = channels.filter(channel => {
    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim()
      if (!(
        channel.name.toLowerCase().includes(query) ||
        channel.id.toLowerCase().includes(query)
      )) {
        return false
      }
    }

    // Active filters
    for (const filter of activeFilters) {
      if (filter.categoryId === 'type' && channel.type !== filter.optionId) {
        return false
      }
      if (filter.categoryId === 'mode') {
        const isSyncEnabled = channel.syncEnabled
        if ((filter.optionId === 'enabled' && !isSyncEnabled) ||
            (filter.optionId === 'disabled' && isSyncEnabled)) {
          return false
        }
      }
      if (filter.categoryId === 'access' && channel.access !== filter.optionId) {
        return false
      }
    }

    return true
  })

  // Handle filter changes
  function handleFilterChange (event: CustomEvent<ActiveFilter[]>): void {
    activeFilters = event.detail
  }

  // Update select all state when filtered channels change
  $: {
    updateSelectAllForFiltered(filteredChannels, selectedChannels)
  }

  function updateSelectAllForFiltered (filtered: typeof filteredChannels, selected: typeof selectedChannels): void {
    if (filtered === undefined || filtered.length === 0) {
      selectAll = false
      return
    }

    const filteredChannelIds = new Set(filtered.map(c => c.id))
    const selectedInFiltered = Array.from(selected).filter(id => filteredChannelIds.has(id))
    selectAll = selectedInFiltered.length === filtered.length
  }

  // Handle individual channel selection
  function toggleChannelSelection(channelId: string): void {
    if (selectedChannels.has(channelId)) {
      selectedChannels.delete(channelId)
    } else {
      selectedChannels.add(channelId)
    }
    selectedChannels = selectedChannels
    updateSelectAllForFiltered(filteredChannels, selectedChannels)
  }

  // Handle select all (only for filtered channels)
  function toggleSelectAll(): void {
    selectAll = !selectAll
    if (selectAll) {
      // Add all filtered channel IDs to selection
      filteredChannels.forEach(channel => {
        selectedChannels.add(channel.id)
      })
    } else {
      // Remove all filtered channel IDs from selection
      filteredChannels.forEach(channel => {
        selectedChannels.delete(channel.id)
      })
    }
    selectedChannels = selectedChannels
  }

  // Update sync status for individual channel
  function updateChannelSync (channelId: string, enabled: boolean): void {
    const channel = channels.find(c => c.id === channelId)
    if (channel) {
      channel.syncEnabled = enabled
      channels = channels
      dispatch('channelUpdated', { channelId, field: 'syncEnabled', value: enabled })
    }
  }

  // Update access for individual channel
  function updateChannelAccess(channelId: string, access: 'public' | 'private'): void {
    const channel = channels.find(c => c.id === channelId)
    if (channel) {
      channel.access = access
      channels = channels
      dispatch('channelUpdated', { channelId, field: 'access', value: access })
    }
  }

  // Bulk actions for selected channels
  function bulkUpdateSync(enabled: boolean): void {
    selectedChannels.forEach(channelId => {
      updateChannelSync(channelId, enabled)
    })
    dispatch('bulkUpdate', { action: 'syncEnabled', value: enabled, channels: Array.from(selectedChannels) })
  }

  function bulkUpdateAccess(access: 'public' | 'private'): void {
    selectedChannels.forEach(channelId => {
      updateChannelAccess(channelId, access)
    })
    dispatch('bulkUpdate', { action: 'access', value: access, channels: Array.from(selectedChannels) })
  }

  async function applyChanges (): Promise<void> {
    // Dispatch event to apply changes
    const integrationClient = await getIntegrationClient()
    integration = isWorkspaceIntegration(integration)
      ? integration
      : await integrationClient.integrate(integration, getCurrentWorkspaceUuid())
    const channelsConfig = channels
      .filter(channel => channel.syncEnabled)
      .map(channel => {
        return {
          telegramId: parseInt(channel.id),
          enabled: channel.syncEnabled,
          access: channel.access
        }
      })
    await integrationClient.updateConfig(
      integration,
      {
        channels: channelsConfig
      },
      async () => {
        await restart(connection.data.phone)
      }
    )

    dispatch('applyChanges', { channels: Array.from(selectedChannels) })
    close()
  }

  // Clear search
  function clearSearch (): void {
    searchQuery = ''
  }

  function close (): void {
    closePopup()
  }

  $: hasSelection = selectedChannels.size > 0
  $: filteredSelectedCount = Array.from(selectedChannels).filter(id =>
    filteredChannels.some(c => c.id === id)
  ).length
</script>

<Modal
  type="type-popup"
  okLabel={telegram.string.Apply}
  okAction={applyChanges}
  onCancel={close}
  canSave={error == null}
  scrollableContent={false}
  on:close={close}
>
  <svelte:fragment slot="beforeTitle">
    <TelegramIcon size='medium'/>
  </svelte:fragment>
  <svelte:fragment slot="title">
    <span class="text-normal">
      <Label
        label={telegram.string.ConfigureIntegration}
      />
    </span>
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <div class="search-container">
      <SearchEdit
        bind:value={searchQuery}
        width="100%"
      />
      <FilterButton
        categories={filterCategories}
        {activeFilters}
        on:change={handleFilterChange}
        size="medium"
        kind="ghost"
      />
    </div>
  </svelte:fragment>
  <div class="channels-config">
    <!-- Channels list -->
    <div class="channels-list">
      {#if isLoading}
        <div class="flex-center">
          <div class="p-5">
            <Loading/>
          </div>
        </div>
      {:else if error}
        <div class="error-container" transition:fade={{ duration: 300 }}>
          <IconError size={'medium'} />
          <span class="text-normal font-medium">
            <Label label={telegram.string.FailedToLoadState} />
          </span>
        </div>
      {:else if filteredChannels.length === 0}
        <div class="no-results" transition:fade>
          {#if searchQuery}
            <div class="no-results-content">
              <span class="no-results-title">No channels found</span>
              <span class="no-results-subtitle">
                Try adjusting your search query or
                <button class="link-button" on:click={clearSearch}>clear search</button>
              </span>
            </div>
          {:else}
            <span>No channels available</span>
          {/if}
        </div>
      {:else}
        <div transition:fade>
          <ListView bind:this={list} count={filteredChannels.length} bind:selection on:changeContent={() => dispatch('changeContent')}>
            <svelte:fragment slot="item" let:item={itemId}>
              {@const item = filteredChannels[itemId]}
              {@const icon = getChannelIcon(item)}
              <div class="channel-item" class:selected={selectedChannels.has(item.id)}>
                <div class="channel-select">
                  <CheckBox
                    size="medium"
                    checked={selectedChannels.has(item.id)}
                    on:value={() => { toggleChannelSelection(item.id) }}
                    {readonly}
                  />
                </div>
                <div class="channel-info">
                  <div class="channel-name">
                    {#if icon !== undefined}
                      <Icon icon={icon} size={'small'} />
                    {/if}
                    <span class="text-normal font-medium">{item.name}</span>
                  </div>
                </div>

                <div class="channel-sync">
                  <Toggle
                    on={item.syncEnabled}
                    on:change={(e) => { updateChannelSync(item.id, e.detail) }}
                    disabled={readonly}
                  />
                </div>
                <div class="channel-access">
                  <DropdownLabelsIntl
                    label={telegram.string.SelectAccess}
                    items={accessOptions}
                    selected={item.access}
                    disabled={readonly || !item.syncEnabled}
                    shouldUpdateUndefined={false}
                    minWidth={'6rem'}
                    on:selected={(e) => { updateChannelAccess(item.id, e.detail) }}
                  />
                </div>
              </div>
            </svelte:fragment>
          </ListView>
        </div>
      {/if}
    </div>
  </div>
</Modal>

<style lang="scss">
  .channels-config {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 40rem;
    overflow: hidden;
  }

  .search-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-results {
    font-size: 0.875rem;
    color: var(--theme-content-trans-color);
    padding-left: 0.5rem;
  }

  .no-results {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 8rem;
    color: var(--theme-content-trans-color);
  }

  .no-results-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .no-results-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-content-color);
  }

  .no-results-subtitle {
    font-size: 0.875rem;
    color: var(--theme-content-trans-color);
  }

  .link-button {
    background: none;
    border: none;
    color: var(--theme-primary-color);
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
    padding: 0;

    &:hover {
      color: var(--theme-primary-hover-color);
    }
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--theme-bg-divider-color);
  }

  .selection-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .bulk-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .selected-count {
    font-size: 0.875rem;
    color: var(--theme-content-color);
    font-weight: 500;
  }

  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 2rem 1rem;
  }

  .channels-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 50vh; /* Set max height for scrolling */
    overflow-y: auto; /* Enable vertical scrolling */

    /* Custom scrollbar styling */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: var(--theme-bg-color);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--theme-divider-color);
      border-radius: 3px;

      &:hover {
        background: var(--theme-content-trans-color);
      }
    }
  }

  .channel-item {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--theme-divider-color);
    transition: all 0.2s ease;
  }

  .channel-select {
    display: flex;
    align-items: center;
  }

  .channel-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .channel-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .channel-sync {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-right: 1rem;
  }

  .sync-label {
    font-size: 0.875rem;
    color: var(--theme-content-color);
  }

  .channel-access {
    min-width: 100px;
  }

  .label {
    font-size: 0.875rem;
    color: var(--theme-content-trans-color);
  }

  .value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--theme-content-color);
  }
</style>
