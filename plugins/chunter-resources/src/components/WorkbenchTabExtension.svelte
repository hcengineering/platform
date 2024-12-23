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
  import { WorkbenchTab } from '@hcengineering/workbench'
  import {
    getNotificationsCount,
    InboxNotificationsClientImpl,
    isActivityNotification,
    isMentionNotification,
    NotifyMarker
  } from '@hcengineering/notification-resources'
  import { getClient } from '@hcengineering/presentation'
  import { InboxNotification } from '@hcengineering/notification'
  import { onDestroy } from 'svelte'
  import { concatLink, Doc, Ref } from '@hcengineering/core'
  import view, { decodeObjectURI } from '@hcengineering/view'
  import { chunterId } from '@hcengineering/chunter'
  import { parseLinkId } from '@hcengineering/view-resources'
  import { parseLocation } from '@hcengineering/ui'

  import chunter from '../plugin'

  export let tab: WorkbenchTab

  const notificationClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = notificationClient.contextByDoc

  let objectId: Ref<Doc> | undefined = undefined
  let notifications: InboxNotification[] = []
  let count = 0

  $: context = objectId !== undefined ? $contextByDocStore.get(objectId) : undefined

  $: void updateObjectId(tab)

  async function updateObjectId (tab: WorkbenchTab): Promise<void> {
    const base = `${window.location.protocol}//${window.location.host}`
    const url = new URL(concatLink(base, tab.location))
    const loc = parseLocation(url)

    if (loc.path[2] !== chunterId) {
      objectId = undefined
      return
    }

    const client = getClient()
    const providers = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
    const [id, _class] = decodeObjectURI(loc.path[3])
    objectId = await parseLinkId(providers, id, _class)
  }

  const unsubscribe = notificationClient.inboxNotificationsByContext.subscribe((res) => {
    if (context === undefined) {
      count = 0
      return
    }

    notifications = (res.get(context._id) ?? []).filter((n) => {
      if (isActivityNotification(n)) return true

      return (
        isMentionNotification(n) && getClient().getHierarchy().isDerived(n.mentionedInClass, chunter.class.ChatMessage)
      )
    })
  })

  $: void getNotificationsCount(context, notifications).then((res) => {
    count = res
  })

  onDestroy(() => {
    unsubscribe()
  })
</script>

{#if count > 0}
  <NotifyMarker kind="simple" size="xx-small" />
{/if}
