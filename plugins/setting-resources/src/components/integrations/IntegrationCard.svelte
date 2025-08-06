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
  import { fade } from 'svelte/transition'
  import { getCurrentAccount } from '@hcengineering/core'
  import { getResource, translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import type { IntegrationType } from '@hcengineering/setting'
  import {
    AnyComponent,
    Button,
    Component,
    Label,
    Icon,
    addNotification,
    eventToHTMLElement,
    showPopup,
    NotificationSeverity,
    themeStore
  } from '@hcengineering/ui'
  import { Analytics } from '@hcengineering/analytics'
  import { type Integration } from '@hcengineering/account-client'
  import IntegrationErrorNotification from './IntegrationErrorNotification.svelte'

  import IntegrationLabel from './IntegrationLabel.svelte'
  import setting from '../../plugin'

  export let integrationType: IntegrationType
  export let integration: Integration | undefined
  const client = getClient()

  let isDisconnecting = false

  async function close (res: any): Promise<void> {
    /* TODO: if (res?.value && integration !== undefined) {
      await client.update(integration, {
        value: res.value,
        disabled: false
      })
    } */
  }

  async function reconnect (res: any): Promise<void> {
    if (res?.value) {
      const current = await client.findOne(setting.class.Integration, {
        createdBy: { $in: getCurrentAccount().socialIds },
        type: integrationType._id
      })
      if (current === undefined) return
      Analytics.handleEvent(`Reconnect integration: ${await translate(integrationType.label, {}, 'en')}`)
      await client.update(current, {
        disabled: false,
        value: res.value
      })
    }
  }

  async function disconnect (): Promise<void> {
    try {
      isDisconnecting = true
      if (integration !== undefined && integrationType.onDisconnect !== undefined) {
        Analytics.handleEvent(`Disconnect integration: ${await translate(integrationType.label, {}, 'en')}`)
        const disconnect = await getResource(integrationType.onDisconnect)
        await disconnect(integration)
      }
    } catch (err: any) {
      console.error('Error disconnecting integration:', err)
      const errorMessage: string = err.message ?? 'Unknown error'
      const integrationError = errorMessage.includes('Failed to fetch')
        ? setting.string.ServiceIsUnavailable
        : setting.string.IntegrationError
      addNotification(
        await translate(setting.string.FailedToDisconnect, {}, $themeStore.language),
        await translate(integrationError, {}, $themeStore.language),
        IntegrationErrorNotification,
        undefined,
        NotificationSeverity.Error
      )
    } finally {
      isDisconnecting = false
    }
  }

  async function disconnectAll (): Promise<void> {
    try {
      isDisconnecting = true
      if (integration !== undefined && integrationType.onDisconnectAll !== undefined) {
        Analytics.handleEvent(`Disconnect integration: ${await translate(integrationType.label, {}, 'en')}`)
        const disconnectAll = await getResource(integrationType.onDisconnectAll)
        await disconnectAll(integration)
      }
    } catch (err: any) {
      console.error('Error disconnecting integration:', err)
      const errorMessage: string = err.message ?? 'Unknown error'
      const integrationError = errorMessage.includes('Failed to fetch')
        ? setting.string.ServiceIsUnavailable
        : setting.string.IntegrationError
      addNotification(
        await translate(setting.string.FailedToDisconnect, {}, $themeStore.language),
        await translate(integrationError, {}, $themeStore.language),
        IntegrationErrorNotification,
        undefined,
        NotificationSeverity.Error
      )
    } finally {
      isDisconnecting = false
    }
  }

  const handleConfigure = async (component?: AnyComponent): Promise<void> => {
    if (component === undefined) {
      return
    }
    Analytics.handleEvent(`Configure/create integration: ${await translate(integrationType.label, {}, 'en')}`)
    showPopup(component, { integration }, 'top', close)
  }
  const handleReconnect = (e: any) => {
    if (integrationType.reconnectComponent) {
      showPopup(integrationType.reconnectComponent, { integration }, eventToHTMLElement(e), reconnect)
    }
  }
</script>

<div class="flex-col plugin-container" transition:fade>
  <div class="flex-row-center header">
    <div class="icon mr-4"><Component is={integrationType.icon} /></div>
    <div class="flex-grow flex-col">
      <div class="fs-title overflow-label"><Label label={integrationType.label} /></div>
    </div>
    <div class="integration-label">
      <IntegrationLabel {integration} />
    </div>
  </div>
  <div class="content scroll-divider-color">
    {#if integration !== undefined && integrationType.stateComponent}
      <Component is={integrationType.stateComponent} props={{ integration }} />
    {:else if integrationType.descriptionComponent}
      <Component is={integrationType.descriptionComponent} />
    {:else}
      <span class="text-normal content-color">
        <Label label={integrationType.description} />
      </span>
    {/if}
    {#if integration?.disabled === true}
      <div class="error">
        <Label label={setting.string.IntegrationDisabledSetting} />
      </div>
    {/if}
  </div>
  <div class="divider" />
  <div class="footer">
    {#if integration !== undefined && integration.workspaceUuid == null && integrationType.configureComponent !== undefined}
      <Button
        minWidth={'5rem'}
        label={setting.string.Integrate}
        kind={'primary'}
        on:click={(ev) => handleConfigure(integrationType.configureComponent)}
      />
    {/if}
    {#if integrationType.createComponent !== undefined && integration === undefined}
      <Button
        minWidth={'5rem'}
        label={setting.string.Connect}
        kind={'primary'}
        on:click={(ev) => handleConfigure(integrationType.createComponent)}
      />
    {:else if integration !== undefined}
      {#if integrationType.configureComponent !== undefined && integration.workspaceUuid != null}
        <Button
          label={setting.string.Configure}
          minWidth={'5rem'}
          kind={'primary'}
          disabled={isDisconnecting}
          on:click={(ev) => handleConfigure(integrationType.configureComponent)}
        >
          <svelte:fragment slot="icon">
            <div class="pr-2">
              <Icon icon={setting.icon.Setting} size="small" />
            </div>
          </svelte:fragment>
        </Button>
      {/if}
      {#if integrationType.onDisconnect && integration.workspaceUuid != null}
        <Button label={setting.string.Disconnect} minWidth={'5rem'} loading={isDisconnecting} on:click={disconnect} />
      {:else if integrationType.onDisconnectAll !== undefined && integration.workspaceUuid == null}
        <Button
          label={setting.string.DisconnectAll}
          minWidth={'5rem'}
          loading={isDisconnecting}
          on:click={disconnectAll}
        />
      {/if}
    {/if}
  </div>
</div>

<style lang="scss">
  .plugin-container {
    border: 1px solid var(--theme-button-border);
    border-radius: 0.75rem;
    max-height: 17rem;
  }
  .header {
    padding: 1rem;
    min-height: fit-content;
    .integration-label {
      display: flex;
      margin-top: -0.5rem;
    }
  }
  .icon {
    flex-shrink: 0;
    min-width: 2.25rem;
    min-height: 2.25rem;
  }
  .content {
    overflow-y: auto;
    flex-grow: 1;
    margin: 0 1.5rem 0.25rem;
    color: var(--theme-caption-color);

    .error {
      color: var(--theme-error-color);
    }
  }
  .divider {
    width: 100%;
    border-top: 1px solid var(--theme-divider-color);
  }
  .footer {
    flex-shrink: 0;
    display: grid;
    grid-auto-flow: column;
    direction: rtl;
    justify-content: space-between;
    align-items: center;
    column-gap: 1rem;
    padding: 0.75rem 1rem 0.75rem;
    overflow: hidden;
    background-color: var(--theme-button-default);
  }
</style>
