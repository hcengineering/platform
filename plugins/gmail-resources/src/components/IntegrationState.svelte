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

  import { IconError, Label, Loading } from '@hcengineering/ui'
  import type { Integration } from '@hcengineering/account-client'
  import { IntegrationEventData, onIntegrationEvent } from '@hcengineering/integration-client'
  import { type GmailSyncState } from '@hcengineering/gmail'

  import gmail from '../plugin'
  import { getState } from '../api'
  import { IntlString } from '@hcengineering/platform'

  export let integration: Integration

  let isLoading = true
  let isRefreshing = false
  let error: string | null = null
  let errorLabel: IntlString | undefined
  let state: GmailSyncState | null | undefined

  const unsubscribers: (() => void)[] = []

  onMount(async () => {
    try {
      state = await getState(integration.socialId)
      isLoading = false
      subscribe()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load gmail state'
      if (error.includes('Failed to fetch')) {
        errorLabel = gmail.string.FailedToConnect
      }
      isLoading = false
      console.error('Error loading gmail state:', err)
    }
  })

  onDestroy(() => {
    unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
  })

  function subscribe (): void {
    unsubscribers.push(onIntegrationEvent<IntegrationEventData>('integration:updated', onUpdateIntegration))
  }

  function onUpdateIntegration (data: IntegrationEventData): void {
    if (
      data.integration?.socialId === integration.socialId &&
      data.integration?.workspaceUuid === integration.workspaceUuid
    ) {
      void refresh()
    }
  }

  async function refresh (): Promise<void> {
    try {
      isRefreshing = true
      state = await getState(integration.socialId)
    } catch (err: any) {
      console.error('Error refresh gmail state:', err.message)
    } finally {
      isRefreshing = false
    }
  }
</script>

<div class="integration-state">
  <div class="state-content">
    {#if isLoading}
      <div class="loading-container">
        <Loading />
      </div>
    {:else if integration.workspaceUuid == null}
      <div class="flex-center" transition:fade={{ duration: 300 }}>
        <span class="text-normal content-color">
          <Label label={gmail.string.NotConnectedIntegration} params={{ email: state?.email ?? '' }} />
        </span>
      </div>
    {:else if errorLabel !== undefined}
      <div class="error-container" transition:fade={{ duration: 300 }}>
        <IconError size={'medium'} />
        <Label label={errorLabel} />
      </div>
    {:else if error != null}
      <div class="error-container" transition:fade={{ duration: 300 }}>
        <IconError size={'medium'} />
        <Label label={gmail.string.FailedToLoadState} />
      </div>
    {:else if state != null}
      <div class="stats-list" transition:fade={{ duration: 300 }}>
        <div class="stat-row">
          <span class="text-normal content-color"><Label label={gmail.string.Email} /></span>
          <span class="text-normal content-color font-medium">{state.email ?? 'N/A'}</span>
        </div>
        <div class="stat-row">
          <span class="text-normal content-color"><Label label={gmail.string.TotalMessages} /></span>
          <div class="flex justify-between flex-gap-2">
            {#if isRefreshing}
              <Loading size="small" />
            {/if}
            <span class="text-normal content-color font-medium">{state.totalMessages}</span>
          </div>
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
