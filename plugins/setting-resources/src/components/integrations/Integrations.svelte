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
  import { fade } from 'svelte/transition'
  import { createQuery, getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import { type IntegrationType, IntegrationError } from '@hcengineering/setting'
  import setting from '@hcengineering/setting'
  import { type Integration } from '@hcengineering/account-client'
  import {
    Header,
    Breadcrumb,
    NotificationSeverity,
    addNotification,
    themeStore,
    TabItem,
    Switcher,
    Loading
  } from '@hcengineering/ui'
  import { translate } from '@hcengineering/platform'
  import { onIntegrationEvent } from '@hcengineering/integration-client'

  import IntegrationCard from './IntegrationCard.svelte'
  import IntegrationErrorNotification from './IntegrationErrorNotification.svelte'
  import { getAccountClient } from '../../utils'

  const typeQuery = createQuery()

  const accountClient = getAccountClient()

  let connections: Integration[] = []
  let integrations: Integration[] = []
  let integrationTypes: IntegrationType[] = []
  let isLoading = true
  const unsubscribers: (() => void)[] = []

  let loadIntegrationsPromise: Promise<void> | null = null
  let refreshTimer: NodeJS.Timeout | null = null
  let lastEventTime = Date.now()

  const viewslist: TabItem[] = [
    { id: 'all', labelIntl: setting.string.AllIntegrations },
    { id: 'connected', labelIntl: setting.string.ConnectedIntegrations },
    { id: 'available', labelIntl: setting.string.AvailableIntegrations }
  ]
  let mode: 'all' | 'connected' | 'available' = 'all'

  typeQuery.query(setting.class.IntegrationType, {}, (res) => {
    integrationTypes = res
  })

  function getIntegrations (type: IntegrationType, integrations: Integration[]): Integration[] {
    return integrations.filter((p) => p.kind === type.kind)
  }

  onMount(async () => {
    try {
      const workspace = getCurrentWorkspaceUuid()
      connections = await accountClient.listIntegrations({ workspaceUuid: null })
      integrations = await accountClient.listIntegrations({ workspaceUuid: workspace }) // Do not pass social ID, since method should set all account social IDs by default
      // Check URL parameters for error message
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('integrationError')

      if (error != null) {
        const decodedError = decodeURIComponent(error)
        console.error('Integration error:', decodedError)
        await showErrorNotification(decodedError)
        // Clean up integrationError parameter from the URL
        urlParams.delete('integrationError')
        const newParams = urlParams.toString()
        const newUrl =
          window.location.pathname +
          (newParams != null && newParams !== '' ? `?${newParams}` : '') +
          window.location.hash
        window.history.replaceState({}, document.title, newUrl)
      }
      subscribe()
      startRefreshTimer()
    } catch (err) {
      console.error('Error loading integrations:', err)
      await showLoadErrorNotification()
      connections = []
      integrations = []
    } finally {
      isLoading = false
    }
  })

  onDestroy(() => {
    unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
    if (refreshTimer !== null) {
      clearInterval(refreshTimer)
    }
  })

  function subscribe (): void {
    unsubscribers.push(
      onIntegrationEvent('integration:updated', onRefreshIntegrations),
      onIntegrationEvent('integration:created', onRefreshIntegrations),
      onIntegrationEvent('integration:deleted', onRefreshIntegrations)
    )
  }

  function onRefreshIntegrations (data: any): void {
    lastEventTime = Date.now()
    void refreshIntegrations()
  }

  function startRefreshTimer (): void {
    if (refreshTimer !== null) {
      clearInterval(refreshTimer)
    }

    // Set up a timer to refresh every 10 seconds if no events received
    refreshTimer = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTime
      if (timeSinceLastEvent >= 10000) {
        void refreshIntegrations()
        lastEventTime = Date.now()
      }
    }, 10000)
  }

  async function refreshIntegrations (): Promise<void> {
    // If there's already a promise, return it to avoid concurrent calls
    if (loadIntegrationsPromise !== null) {
      await loadIntegrationsPromise
      return
    }

    loadIntegrationsPromise = (async () => {
      try {
        const workspace = getCurrentWorkspaceUuid()
        connections = await accountClient.listIntegrations({ workspaceUuid: null })
        integrations = await accountClient.listIntegrations({ workspaceUuid: workspace })
        lastEventTime = Date.now() // Update last event time after successful refresh
      } catch (err) {
        console.error('Error refreshing integrations:', err)
      }
    })()

    await loadIntegrationsPromise
    loadIntegrationsPromise = null
  }

  async function showErrorNotification (error: string): Promise<void> {
    const errorMessage =
      error === IntegrationError.EMAIL_IS_ALREADY_USED
        ? await translate(setting.string.EmailIsUsed, {}, $themeStore.language)
        : await translate(setting.string.IntegrationError, {}, $themeStore.language)
    addNotification(
      await translate(setting.string.IntegrationFailed, {}, $themeStore.language),
      errorMessage,
      IntegrationErrorNotification,
      undefined,
      NotificationSeverity.Error
    )
  }

  async function showLoadErrorNotification (): Promise<void> {
    addNotification(
      await translate(setting.string.FailedToLoadIntegrations, {}, $themeStore.language),
      await translate(setting.string.IntegrationError, {}, $themeStore.language),
      IntegrationErrorNotification,
      undefined,
      NotificationSeverity.Error
    )
  }
  interface IntegrationInfo {
    integrationType?: IntegrationType
    integration?: Integration
  }

  function getFilteredIntegrationTypes (
    mode: string,
    integrationTypes: IntegrationType[],
    integrations: Integration[]
  ): IntegrationInfo[] {
    if (mode === 'available') {
      return integrationTypes.map((integrationType) => ({ integrationType }))
    }

    if (mode === 'connected') {
      // Show integration types that have at least one connected integration
      return integrations.map((integration) => {
        const type = integrationTypes.find((type) => type.kind === integration.kind)
        return {
          integrationType: type,
          integration
        }
      })
    }
    // all integration and types
    const filteredIntegrations = integrationTypes.flatMap((integrationType) => {
      let allIntegrations = getIntegrations(integrationType, integrations)
      const availableConnections = connections.filter((connection) => {
        return (
          connection.kind === integrationType.kind &&
          allIntegrations
            .filter((integration) => integration.kind === connection.kind)
            .every((integration) => integration.socialId !== connection.socialId)
        )
      })
      if (availableConnections.length > 0) {
        allIntegrations = [...allIntegrations, ...availableConnections]
      }
      const integrationInfo = allIntegrations.map((integration) => ({
        integrationType,
        integration
      }))
      if (integrationInfo.length === 0 || integrationType.allowMultiple) {
        return [...integrationInfo, { integrationType }]
      }
      return integrationInfo
    })
    return filteredIntegrations
  }

  // Reactive statement to get filtered integration types
  $: filteredIntegrationTypes = getFilteredIntegrationTypes(mode, integrationTypes, integrations)

  function getIntegrationKey (integrationInfo: IntegrationInfo): string {
    const { integration, integrationType } = integrationInfo
    if (integration === undefined && integrationType !== undefined) {
      return integrationType._id
    } else if (integration !== undefined) {
      return `${integration.kind}-${integration.socialId}-${integration.workspaceUuid}`
    }
    return 'unknown'
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Integrations} label={setting.string.Integrations} size={'large'} isCurrent />
    <svelte:fragment slot="extra">
      <Switcher
        name={'integrations-mode-view'}
        items={viewslist}
        kind={'subtle'}
        selected={mode}
        on:select={(result) => {
          if (result.detail !== undefined) mode = result.detail.id
        }}
      />
    </svelte:fragment>
  </Header>
  {#if isLoading}
    <div class="loading-container">
      <Loading />
    </div>
  {:else}
    <div class="cards_grid" transition:fade={{ duration: 300 }}>
      {#each filteredIntegrationTypes as integrationInfo (getIntegrationKey(integrationInfo))}
        {#if integrationInfo.integrationType !== undefined}
          <IntegrationCard
            integration={integrationInfo.integration}
            integrationType={integrationInfo.integrationType}
          />
        {/if}
      {/each}
      {#if filteredIntegrationTypes.length === 1}
        <div class="flex" />
        <!-- Spacer to fill the grid -->
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .cards_grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
    grid-auto-rows: minmax(14.5rem, auto);
    grid-gap: 1.5rem;
    padding: 1.5rem;
    overflow: auto;
  }
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
</style>
