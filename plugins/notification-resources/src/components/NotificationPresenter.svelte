<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Doc } from '@hcengineering/core'
  import { getPlatformColor, themeStore } from '@hcengineering/ui'
  import { InboxNotificationsClientImpl } from '../inboxNotificationsClient'

  export let value: Doc
  export let kind: 'table' | 'block' = 'block'

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.contextByDoc
  const inboxNotificationsByContextStore = inboxClient.inboxNotificationsByContext

  $: notifyContext = $contextByDocStore.get(value._id)
  $: inboxNotifications = notifyContext ? $inboxNotificationsByContextStore.get(notifyContext._id) ?? [] : []

  $: hasNotification = inboxNotifications.some(({ isViewed }) => !isViewed)
</script>

{#if hasNotification}
  <div class="notify-{kind}-kind" style="color: {getPlatformColor(11, $themeStore.dark)}" />
{/if}

<style lang="scss">
  .notify-block-kind {
    width: 0.5rem;
    height: 0.5rem;
    background-color: currentColor;
    border-radius: 0.5rem;
  }
  .notify-table-kind {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.5rem;
    height: 0.5rem;
    background-color: currentColor;
    border-radius: 0.25rem;
    outline: 1px solid transparent;
    outline-offset: 2px;
    transform: translate(-50%, -50%);
    transition: all 0.1s ease-in-out;
    z-index: -1;
  }
</style>
