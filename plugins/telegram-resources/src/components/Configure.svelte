<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import {
    CheckBox,
    Toggle,
    DropdownLabelsPopupIntl,
    SearchInput,
    Label,
    ListView,
    Modal,
    Loading,
    closePopup,
    Icon,
    IconMoreV,
    IconError,
    FilterButton,
    Button,
    showPopup,
    type FilterCategory,
    type ActiveFilter
  } from '@hcengineering/ui'
  import { getCurrentWorkspaceUuid, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { isWorkspaceIntegration } from '@hcengineering/integration-client'
  import type { Integration } from '@hcengineering/account-client'
  import contact from '@hcengineering/contact'
  import card from '@hcengineering/card'

  import TelegramIcon from './icons/TelegramColor.svelte'
  import telegram from '../plugin'
  import { type TelegramChannelConfig, getIntegrationClient, listChannels, restart } from '../api'
  import core, { getCurrentAccount, Space } from '@hcengineering/core'

  export let readonly: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  export let integration: Integration

  let connection: Integration | null

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
      label: telegram.string.Type,
      options: [
        { id: 'user', label: telegram.string.User },
        { id: 'group', label: telegram.string.Group },
        { id: 'channel', label: telegram.string.Channel }
      ]
    },
    {
      id: 'mode',
      label: telegram.string.SyncMode,
      options: [
        { id: 'enabled', label: telegram.string.SyncEnabled },
        { id: 'disabled', label: telegram.string.SyncDisabled }
      ]
    }
  ]

  onMount(async () => {
    try {
      // Initialize selected channels based on existing data
      error = null
      const integrationClient = await getIntegrationClient()
      connection = await integrationClient.getConnection(integration)

      // Get existing channel configurations from integration data
      const existingChannelsConfig = integration.data?.config?.channels ?? []
      const existingChannelsMap = new Map<string, Record<string, any>>(
        existingChannelsConfig.map((config: any) => [config.telegramId.toString(), config])
      )

      const personalSpace = await client.findOne(contact.class.PersonSpace, { members: getCurrentAccount().uuid })

      channels = (await listChannels(connection?.data?.phone)).map((channel) => {
        const existingConfig = existingChannelsMap.get(channel.id)
        return {
          ...channel,
          syncEnabled: channel.mode === 'sync',
          readonlyAccess: existingConfig?.readonlyAccess ?? false,
          space: existingConfig?.space !== undefined ? existingConfig.space : personalSpace?._id
        }
      })
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
  $: filteredChannels = channels.filter((channel) => {
    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim()
      if (!(channel.name.toLowerCase().includes(query) || channel.id.toLowerCase().includes(query))) {
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
        if ((filter.optionId === 'enabled' && !isSyncEnabled) || (filter.optionId === 'disabled' && isSyncEnabled)) {
          return false
        }
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

    const filteredChannelIds = new Set(filtered.map((c) => c.id))
    const selectedInFiltered = Array.from(selected).filter((id) => filteredChannelIds.has(id))
    selectAll = selectedInFiltered.length === filtered.length
  }

  // Handle individual channel selection
  function toggleChannelSelection (channelId: string): void {
    if (selectedChannels.has(channelId)) {
      selectedChannels.delete(channelId)
    } else {
      selectedChannels.add(channelId)
    }
    selectedChannels = selectedChannels
    updateSelectAllForFiltered(filteredChannels, selectedChannels)
  }

  // Update sync status for individual channel
  function updateChannelSync (channelId: string, enabled: boolean): void {
    const channel = channels.find((c) => c.id === channelId)
    if (channel) {
      channel.syncEnabled = enabled
      channels = channels
      dispatch('channelUpdated', { channelId, field: 'syncEnabled', value: enabled })
    }
  }

  function updateChannelSpace (channelId: string, space: Space): void {
    const channel = channels.find((c) => c.id === channelId)
    if (channel !== undefined && channel?.syncEnabled) {
      channel.space = space._id
      channels = channels
      dispatch('channelUpdated', { channelId, field: 'space', value: space._id })
    }
  }

  // Action button functions
  function selectAllFiltered (): void {
    filteredChannels.forEach((channel) => {
      selectedChannels.add(channel.id)
    })
    selectedChannels = selectedChannels
    updateSelectAllForFiltered(filteredChannels, selectedChannels)
  }

  function unselectAllFiltered (): void {
    filteredChannels.forEach((channel) => {
      selectedChannels.delete(channel.id)
    })
    selectedChannels = selectedChannels
    updateSelectAllForFiltered(filteredChannels, selectedChannels)
  }

  function enableSelectedChannels (): void {
    selectedChannels.forEach((channelId) => {
      updateChannelSync(channelId, true)
    })
  }

  function disableSelectedChannels (): void {
    selectedChannels.forEach((channelId) => {
      updateChannelSync(channelId, false)
    })
  }

  function showActionsPopup (event: MouseEvent): void {
    const actionItems = [
      {
        id: 'select-all',
        label: telegram.string.SelectAllAction,
        action: selectAllFiltered,
        disabled: filteredChannels.length === 0 || filteredChannels.every((c) => selectedChannels.has(c.id))
      },
      {
        id: 'unselect-all',
        label: telegram.string.UnselectAllAction,
        action: unselectAllFiltered,
        disabled: filteredChannels.length === 0 || !filteredChannels.some((c) => selectedChannels.has(c.id))
      },
      {
        id: 'enable-selected',
        label: telegram.string.EnableSynchronization,
        action: enableSelectedChannels,
        disabled: selectedChannels.size === 0 || readonly
      },
      {
        id: 'disable-selected',
        label: telegram.string.DisableSynchronization,
        action: disableSelectedChannels,
        disabled: selectedChannels.size === 0 || readonly
      }
    ]
    const enabledActions = actionItems.filter((item) => !item.disabled)

    showPopup(
      DropdownLabelsPopupIntl,
      {
        items: enabledActions,
        onSelected: (item: any) => {
          item.action()
        }
      },
      event.target as HTMLElement,
      (result) => {
        if (result != null) {
          const actionItem = actionItems.find((i) => i.id === result)
          if (actionItem !== undefined) {
            actionItem.action()
          } else {
            console.warn('Action not found:', result)
          }
        }
      }
    )
  }

  function handleRightClick (event: MouseEvent): void {
    event.preventDefault()
    showActionsPopup(event)
  }

  async function applyChanges (): Promise<void> {
    // Dispatch event to apply changes
    const integrationClient = await getIntegrationClient()
    integration = isWorkspaceIntegration(integration)
      ? integration
      : await integrationClient.integrate(integration, getCurrentWorkspaceUuid())
    const channelsConfig = channels
      .filter((channel) => channel.syncEnabled || channel.readonlyAccess)
      .map((channel) => {
        return {
          telegramId: parseInt(channel.id),
          enabled: channel.syncEnabled,
          space: channel.space,
          readonlyAccess: true
        }
      })
    await integrationClient.updateConfig(
      integration,
      {
        channels: channelsConfig
      },
      async () => {
        await restart(connection?.data?.phone)
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

  $: syncedChannelsCount = channels.filter((channel) => channel.syncEnabled).length
</script>

<Modal
  type="type-popup"
  okLabel={telegram.string.Apply}
  okAction={applyChanges}
  onCancel={close}
  canSave={error == null && !isLoading}
  scrollableContent={false}
  on:close={close}
>
  <svelte:fragment slot="beforeTitle">
    <TelegramIcon size="medium" />
  </svelte:fragment>
  <svelte:fragment slot="title">
    <span class="text-normal">
      <Label label={telegram.string.ConfigureIntegration} />
    </span>
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <div class="actions-container">
      <Button
        icon={IconMoreV}
        kind={'regular'}
        disabled={filteredChannels.length === 0 || isLoading}
        on:click={showActionsPopup}
      />
      <div class="hulyHeader-divider" />
      <div class="search-container">
        <FilterButton
          categories={filterCategories}
          {activeFilters}
          on:change={handleFilterChange}
          size="medium"
          disabled={isLoading}
          kind={'regular'}
        />
        <SearchInput bind:value={searchQuery} collapsed />
      </div>
      <div class="hulyHeader-divider" />
    </div>
  </svelte:fragment>
  <div class="channels-config">
    <!-- Channels list -->
    <div class="channels-list">
      {#if isLoading}
        <div class="flex-center">
          <div class="p-5">
            <Loading />
          </div>
        </div>
      {:else if error}
        <div class="error-container" transition:fade={{ duration: 300 }}>
          <IconError size={'medium'} />
          <span class="text-normal font-medium">
            <Label label={telegram.string.ServiceIsUnavailable} />
          </span>
        </div>
      {:else if filteredChannels.length === 0}
        <div class="no-results" transition:fade>
          {#if searchQuery}
            <div class="no-results-content">
              <span class="fs-title">
                <Label label={telegram.string.NoChannelsFound} />
              </span>
              <div class="flex-col flex-center">
                <span class="text-md content-color">
                  <Label label={telegram.string.TryAdjustingSearch} />
                </span>
                <Button kind="link" label={telegram.string.ClearSearch} on:click={clearSearch} />
              </div>
            </div>
          {:else}
            <span>
              <Label label={telegram.string.NoChannelsAvailable} />
            </span>
          {/if}
        </div>
      {:else}
        <div transition:fade>
          <ListView
            bind:this={list}
            count={filteredChannels.length}
            bind:selection
            on:changeContent={() => dispatch('changeContent')}
          >
            <svelte:fragment slot="item" let:item={itemId}>
              {@const item = filteredChannels[itemId]}
              {@const icon = getChannelIcon(item)}
              <div class="channel-item" class:selected={selectedChannels.has(item.id)}>
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="channel-select" on:contextmenu={handleRightClick}>
                  <CheckBox
                    size="medium"
                    checked={selectedChannels.has(item.id)}
                    on:value={() => {
                      toggleChannelSelection(item.id)
                    }}
                    {readonly}
                  />
                </div>
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="channel-info content-color" on:contextmenu={handleRightClick}>
                  <div class="channel-name">
                    {#if icon !== undefined}
                      <Icon {icon} size={'small'} />
                    {/if}
                    <span class="text-normal font-medium">{item.name}</span>
                  </div>
                </div>

                <div class="channel-sync">
                  <Toggle
                    on={item.syncEnabled}
                    on:change={(e) => {
                      updateChannelSync(item.id, e.detail)
                    }}
                    disabled={readonly}
                  />
                </div>
                <div class="channel-space">
                  <SpaceSelector
                    _class={core.class.Space}
                    query={{
                      archived: false,
                      members: getCurrentAccount().uuid,
                      _class: { $in: [card.class.CardSpace, contact.class.PersonSpace] }
                    }}
                    label={core.string.Space}
                    kind={'regular'}
                    size={'medium'}
                    justify={'left'}
                    autoSelect={false}
                    readonly={readonly || !item.syncEnabled || item.readonlyAccess}
                    space={item.space}
                    width="9rem"
                    on:object={(e) => {
                      updateChannelSpace(item.id, e.detail)
                    }}
                  />
                </div>
              </div>
            </svelte:fragment>
          </ListView>
        </div>
      {/if}
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div class="footer-container">
      <span class="text-normal font-medium content-color">
        <Label label={telegram.string.SyncedChannels} />
        {syncedChannelsCount}
      </span>
    </div>
  </svelte:fragment>
</Modal>

<style lang="scss">
  .channels-config {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 40rem;
    overflow: hidden;
  }

  .actions-container {
    display: flex;
    align-items: center;
  }

  .search-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
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

  .channel-space {
    min-width: 9rem;
  }

  .footer-container {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: flex-start;
    padding: 0 0.5rem;
  }
</style>
