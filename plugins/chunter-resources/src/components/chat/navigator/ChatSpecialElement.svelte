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
  import { SpecialNavModel } from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { DocNotifyContext, InboxNotification } from '@hcengineering/notification'
  import { Ref } from '@hcengineering/core'
  import { SavedAttachments } from '@hcengineering/attachment'
  import { SavedMessage } from '@hcengineering/activity'
  import { savedMessagesStore } from '@hcengineering/activity-resources'

  import NavItem from './NavItem.svelte'
  import { savedAttachmentsStore } from '../utils'

  export let special: SpecialNavModel
  export let currentSpecial: SpecialNavModel | undefined = undefined

  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const notificationsByContextStore = notificationsClient.inboxNotificationsByContext

  let notificationsCount = 0
  let elementsCount = 0

  $: void getNotificationsCount(special, $notificationsByContextStore).then((res) => {
    notificationsCount = res
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

<div class="mr-2 ml-2">
  <NavItem
    id={special.id}
    icon={special.icon}
    iconPadding="0 0 0 0.375rem"
    iconSize="small"
    padding="var(--spacing-1) var(--spacing-0_5)"
    intlTitle={special.label}
    withIconBackground={false}
    {notificationsCount}
    {elementsCount}
    isSelected={special.id === currentSpecial?.id}
  />
</div>
