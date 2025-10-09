<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->
<script lang="ts">
  import { SortingOrder } from '@hcengineering/core'
  import {
    IconDelete,
    IconSettings,
    Label,
    ModernButton,
    showPopup,
    eventToHTMLElement,
    IconMoreV,
    ButtonMenu,
    Loading
  } from '@hcengineering/ui'
  import { getCommunicationClient } from '@hcengineering/presentation'
  import { Analytics } from '@hcengineering/analytics'
  import view from '@hcengineering/view'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'

  import inbox from '../plugin'
  import InboxViewSettings from './InboxViewSettings.svelte'

  const communicationClient = getCommunicationClient()
  const oldNotificationClient = InboxNotificationsClientImpl.getClient()

  let clearing = false
  let reading = false

  async function clearInbox (): Promise<void> {
    if (clearing || reading) return
    try {
      clearing = true
      const contexts = await communicationClient.findNotificationContexts({ order: SortingOrder.Ascending })
      await Promise.all([
        ...contexts.map((context) => communicationClient.removeNotificationContext(context.id)),
        oldNotificationClient.removeAllNotifications()
      ])
      clearing = false
    } catch (e: any) {
      clearing = false
      Analytics.handleError(e)
    }
  }

  async function readInbox (): Promise<void> {
    if (reading || clearing) return
    try {
      reading = true
      const contexts = await communicationClient.findNotificationContexts({ order: SortingOrder.Ascending })
      await Promise.all([
        ...contexts.map((context) => communicationClient.updateNotifications(context.id, {}, true)),
        oldNotificationClient.readAllNotifications()
      ])
      reading = false
    } catch (e: any) {
      reading = false
      Analytics.handleError(e)
    }
  }

  function click (e: MouseEvent): void {
    showPopup(InboxViewSettings, {}, eventToHTMLElement(e))
  }

  async function onSelect (id?: 'clear' | 'read'): Promise<void> {
    if (id == null) return

    if (id === 'clear') {
      void clearInbox()
    }

    if (id === 'read') {
      void readInbox()
    }
  }
</script>

<div class="hulyNavPanel-header withButton small inbox-header">
  <span class="overflow-label"><Label label={inbox.string.Inbox} /></span>
  <div class="flex-row-center flex-gap-2">
    {#if clearing}
      <Loading size="small">
        <span class="loading-label uppercase">
          <Label label={inbox.string.Clearing} />
        </span>
      </Loading>
    {:else if reading}
      <Loading size="small">
        <span class="loading-label uppercase">
          <Label label={inbox.string.Reading} />
        </span>
      </Loading>
    {/if}
    <ModernButton icon={IconSettings} on:click={click} size="small" iconSize="small" />
    <ButtonMenu
      size="small"
      noSelection
      icon={IconMoreV}
      items={[
        {
          id: 'read',
          icon: view.icon.CheckCircle,
          label: inbox.string.ReadAll
        },
        {
          id: 'clear',
          icon: IconDelete,
          label: inbox.string.ClearAll
        }
      ]}
      on:selected={(ev) => onSelect(ev.detail)}
    />
  </div>
</div>

<style lang="scss">
  .inbox-header {
    background-color: var(--theme-popup-color);
    border-bottom: 1px solid var(--theme-navpanel-border);
  }

  .loading-label {
    color: var(--global-secondary-TextColor);
    font-weight: 500;
    font-size: 0.625rem;
    margin-left: 0.25rem;
  }
</style>
