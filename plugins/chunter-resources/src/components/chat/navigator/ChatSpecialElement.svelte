<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { SpecialNavModel } from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { DocNotifyContext, InboxNotification } from '@hcengineering/notification'
  import { Ref } from '@hcengineering/core'
  import { SavedAttachments } from '@hcengineering/attachment'
  import { SavedMessage } from '@hcengineering/activity'
  import { savedMessagesStore } from '@hcengineering/activity-resources'
  import { savedAttachmentsStore } from '@hcengineering/attachment-resources'

  import NavItem from './NavItem.svelte'

  export let special: SpecialNavModel
  export let currentSpecial: SpecialNavModel | undefined = undefined
  export let type: 'type-link' | 'type-tag' | 'type-anchor-link' | 'type-object' = 'type-link'

  const dispatch = createEventDispatcher()

  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const notificationsByContextStore = notificationsClient.inboxNotificationsByContext

  let count: number | null = null
  let elementsCount = 0

  $: void getNotificationsCount(special, $notificationsByContextStore).then((res) => {
    count = res === 0 ? null : res
  })
  $: elementsCount = getElementsCount(special, $savedMessagesStore, $savedAttachmentsStore)

  async function getNotificationsCount (
    special: SpecialNavModel,
    notificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>
  ): Promise<number> {
    if (!special.notificationsCountProvider) {
      return 0
    }

    const providerFn = await getResource(special.notificationsCountProvider)

    return providerFn(notificationsByContext)
  }

  function getElementsCount (
    special: SpecialNavModel,
    savedMessages: SavedMessage[],
    savedAttachments: SavedAttachments[]
  ): number {
    if (special.id === 'saved') {
      return savedMessages.length + savedAttachments.length
    }

    return 0
  }
</script>

<NavItem
  _id={special.id}
  icon={special.icon}
  intlTitle={special.label}
  withIconBackground={false}
  {count}
  {elementsCount}
  isSelected={special.id === currentSpecial?.id}
  {type}
  on:click={() => dispatch('select', null)}
/>
