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
  import { IconDelete, IconSettings, Label, ModernButton, showPopup, eventToHTMLElement } from '@hcengineering/ui'
  import { getCommunicationClient } from '@hcengineering/presentation'

  import chat from '../../plugin'
  import InboxViewSettings from './InboxViewSettings.svelte'

  const communicationClient = getCommunicationClient()

  export let mode: 'chat' | 'inbox' = 'chat'

  let clearing = false
  async function clearInbox (): Promise<void> {
    if (clearing) return
    try {
      clearing = true
      const contexts = await communicationClient.findNotificationContexts({ order: SortingOrder.Ascending })
      await Promise.all(contexts.map((context) => communicationClient.removeNotificationContext(context.id)))
      clearing = false
    } catch (e) {
      clearing = false
      console.error(e)
    }
  }

  function click (e: MouseEvent): void {
    showPopup(InboxViewSettings, {}, eventToHTMLElement(e))
  }

  function goToChat (): void {
    mode = 'chat'
  }
</script>

<div class="hulyNavPanel-header withButton small inbox-header">
  <span class="overflow-label"><Label label={chat.string.Inbox} /></span>
  <div class="flex-row-center flex-gap-2">
    <ModernButton
      tooltip={{ label: chat.string.ClearAll }}
      icon={IconDelete}
      size="small"
      iconSize="small"
      on:click={clearInbox}
      loading={clearing}
    />
    <ModernButton icon={IconSettings} on:click={click} size="small" iconSize="small" />
    <div class="spacer" />
    <ModernButton
      label={chat.string.Chat}
      icon={chat.icon.ChatBubble}
      size="small"
      iconSize="small"
      on:click={goToChat}
    />
  </div>
</div>

<style lang="scss">
  .inbox-header {
    background-color: var(--theme-popup-color);
    border-bottom: 1px solid var(--theme-navpanel-border);
  }
</style>
